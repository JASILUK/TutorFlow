from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.interfaces import LoaderOption

from app.core.exceptions import (
    BadRequestException,
    HomeworkAccessDeniedError,
    HomeworkNotFoundError,
    SessionNotFoundError,
)
from app.models.homework import HomeworkTask
from app.models.session import SessionStatus
from app.models.user import User, UserRole
from app.repositories.homework_repository import HomeworkRepository
from app.schemas.homework import (
    HomeworkCreateRequest,
    HomeworkItemCreate,
    HomeworkUpdateRequest,
)

if TYPE_CHECKING:
    from app.services.session_service import SessionService
    from app.services.student_service import StudentService

logger = logging.getLogger(__name__)


class HomeworkService:
    """
    Production-ready domain service governing homework tasks.
    Enforces multi-tenant tutor/student ownership through Session relationships,
    manages transactional mutations, and coordinates AI task persistence.
    """

    def __init__(
        self,
        *,
        homework_repository: HomeworkRepository,
        session_service: "SessionService",
        student_service: "StudentService",
        db_session: AsyncSession,
    ) -> None:
        self.repo = homework_repository
        self.session_service = session_service
        self.student_service = student_service
        self.db = db_session

    # =========================================================================
    # 1. RETRIEVAL & OWNERSHIP
    # =========================================================================

    async def get_homework_for_tutor(
        self,
        *,
        homework_id: uuid.UUID,
        tutor_id: uuid.UUID,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> HomeworkTask:
        """
        Retrieve a single task verifying tutor ownership at the SQL level.
        Prevents resource enumeration by returning 404 if inaccessible.
        """
        task = await self.repo.get_by_id_for_tutor(
            homework_id=homework_id,
            tutor_id=tutor_id,
            options=options,
        )
        if not task:
            raise HomeworkNotFoundError(homework_id)
        return task

    async def get_homework_for_student(
        self,
        *,
        homework_id: uuid.UUID,
        student_profile_id: uuid.UUID,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> HomeworkTask:
        """
        Retrieve a single task verifying student profile ownership at the SQL level.
        """
        task = await self.repo.get_by_id_for_student(
            homework_id=homework_id,
            student_profile_id=student_profile_id,
            options=options,
        )
        if not task:
            raise HomeworkNotFoundError(homework_id)
        return task

    async def get_homework(
        self,
        *,
        homework_id: uuid.UUID,
        user: User,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> HomeworkTask:
        """Role-aware lookup helper for unified API endpoints."""
        if user.role == UserRole.TUTOR:
            return await self.get_homework_for_tutor(
                homework_id=homework_id,
                tutor_id=user.id,
                options=options,
            )

        student_profile = await self.student_service.get_profile_by_user_id(user.id)
        if not student_profile:
            raise HomeworkAccessDeniedError("No student profile linked to your user account.")

        return await self.get_homework_for_student(
            homework_id=homework_id,
            student_profile_id=student_profile.id,
            options=options,
        )

    # =========================================================================
    # 2. CREATION (SINGLE & BATCH / AI)
    # =========================================================================

    async def create_homework(
        self,
        *,
        tutor_id: uuid.UUID,
        payload: HomeworkCreateRequest,
    ) -> HomeworkTask:
        """
        Tutor creates a single homework task attached to a session they own.
        """
        await self.session_service.get_session_for_tutor(
            session_id=payload.session_id,
            tutor_id=tutor_id,
        )

        task = await self.repo.create(
            session_id=payload.session_id,
            title=payload.title,
            description=payload.description,
        )
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def create_homework_many(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: Optional[uuid.UUID] = None,
        tasks: Sequence[HomeworkItemCreate | dict[str, Any]],
        student_profile_id: Optional[uuid.UUID] = None,
        enforce_debrief_state: bool = False,
    ) -> List[HomeworkTask]:
        """
        Batch-create homework tasks for a session (used by AI debrief or manual batch entry).
        Validates tutor ownership and optional session state.
        Flushes once and commits the transaction atomically.
        """
        if not tasks:
            return []

        # If tutor_id is provided, verify session ownership
        if tutor_id:
            session = await self.session_service.get_session_for_tutor(
                session_id=session_id,
                tutor_id=tutor_id,
            )
            if enforce_debrief_state and session.status not in (
                SessionStatus.COMPLETED,
                SessionStatus.AI_REVIEWED,
            ):
                raise BadRequestException(
                    f"Cannot attach debrief homework to a session in '{session.status.value}' state."
                )

        formatted_tasks: List[dict[str, str]] = []
        for item in tasks:
            if isinstance(item, dict):
                title = item.get("title", "").strip()
                description = item.get("description", "").strip()
            else:
                title = item.title.strip()
                description = item.description.strip()

            if not title or not description:
                raise BadRequestException("Every homework task must have a non-empty title and description.")

            formatted_tasks.append({"title": title, "description": description})

        created_tasks = await self.repo.create_many(
            session_id=session_id,
            tasks=formatted_tasks,
        )
        await self.db.commit()
        for t in created_tasks:
            await self.db.refresh(t)
        return created_tasks

    # Alias matching SessionService orchestration call
    create_bulk_tasks = create_homework_many

    # =========================================================================
    # 3. LISTING & FILTERING
    # =========================================================================

    async def list_homework_by_session(
        self,
        *,
        session_id: uuid.UUID,
        user: User,
        is_completed: Optional[bool] = None,
        limit: Optional[int] = None,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[HomeworkTask]:
        """
        List homework for a specific session.
        Enforces that the caller owns the session (tutor or student).
        """
        await self.session_service.get_session(session_id=session_id, user=user)

        return await self.repo.list_by_session(
            session_id=session_id,
            is_completed=is_completed,
            limit=limit,
            options=options,
        )

    async def list_homework_by_student(
        self,
        *,
        student_profile_id: uuid.UUID,
        is_completed: Optional[bool] = None,
        limit: int = 50,
        offset: Optional[int] = None,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[HomeworkTask]:
        """Fetch paginated/bounded homework tasks for a student."""
        limit = min(max(1, limit), 100)
        return await self.repo.list_by_student(
            student_profile_id=student_profile_id,
            is_completed=is_completed,
            limit=limit,
            offset=offset,
            options=options,
        )

    async def list_homework_by_tutor(
        self,
        *,
        tutor_id: uuid.UUID,
        student_profile_id: Optional[uuid.UUID] = None,
        is_completed: Optional[bool] = None,
        limit: int = 50,
        offset: Optional[int] = None,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[HomeworkTask]:
        """Fetch homework tasks for sessions conducted by a tutor."""
        limit = min(max(1, limit), 100)

        if student_profile_id:
            belongs = await self.student_service.verify_student_belongs_to_tutor(
                student_profile_id=student_profile_id,
                tutor_id=tutor_id,
            )
            if not belongs:
                raise HomeworkAccessDeniedError("Student profile does not belong to your roster.")

        return await self.repo.list_by_tutor(
            tutor_id=tutor_id,
            student_profile_id=student_profile_id,
            is_completed=is_completed,
            limit=limit,
            offset=offset,
            options=options,
        )

    async def list_pending_homework_for_student(
        self,
        *,
        student_profile_id: uuid.UUID,
        limit: int = 20,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[HomeworkTask]:
        """Fetch incomplete tasks for the student dashboard."""
        return await self.repo.list_pending_by_student(
            student_profile_id=student_profile_id,
            limit=limit,
            options=options,
        )

    async def list_completed_homework_for_student(
        self,
        *,
        student_profile_id: uuid.UUID,
        limit: int = 20,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[HomeworkTask]:
        """Fetch completed tasks for student review."""
        return await self.repo.list_completed_by_student(
            student_profile_id=student_profile_id,
            limit=limit,
            options=options,
        )

    async def list_recent_homework_for_student(
        self,
        *,
        student_profile_id: uuid.UUID,
        limit: int = 3,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[HomeworkTask]:
        """
        Bounded query used by StudentOverviewService to load a lightweight snapshot.
        """
        return await self.repo.list_recent_by_student(
            student_profile_id=student_profile_id,
            limit=min(limit, 10),
            options=options,
        )

    async def count_student_homework(
        self,
        *,
        student_profile_id: uuid.UUID,
        is_completed: Optional[bool] = None,
    ) -> int:
        """Count total or filtered tasks via index-backed SQL query."""
        return await self.repo.count_by_student(
            student_profile_id=student_profile_id,
            is_completed=is_completed,
        )

    # =========================================================================
    # 4. MUTATIONS (UPDATE, COMPLETE, DELETE)
    # =========================================================================

    async def update_homework(
        self,
        *,
        homework_id: uuid.UUID,
        tutor_id: uuid.UUID,
        payload: HomeworkUpdateRequest,
    ) -> HomeworkTask:
        """
        Tutor edits homework content. Only title and description can be updated.
        """
        task = await self.get_homework_for_tutor(
            homework_id=homework_id,
            tutor_id=tutor_id,
        )

        update_values: dict[str, Any] = {}
        if payload.title is not None:
            update_values["title"] = payload.title.strip()
        if payload.description is not None:
            update_values["description"] = payload.description.strip()

        if not update_values:
            return task

        updated_task = await self.repo.update(homework_id=task.id, values=update_values)
        await self.db.commit()
        await self.db.refresh(updated_task)
        return updated_task  # type: ignore[return-value]

    async def complete_homework(
        self,
        *,
        homework_id: uuid.UUID,
        student_profile_id: uuid.UUID,
        is_completed: bool,
    ) -> HomeworkTask:
        """
        Student toggles or marks their homework task as completed.
        Idempotent: completing an already completed task succeeds cleanly.
        """
        task = await self.get_homework_for_student(
            homework_id=homework_id,
            student_profile_id=student_profile_id,
        )

        if task.is_completed == is_completed:
            return task

        updated_task = await self.repo.set_completed(
            homework_id=task.id,
            completed=is_completed,
        )
        await self.db.commit()
        await self.db.refresh(updated_task)
        return updated_task  # type: ignore[return-value]

    async def delete_homework(
        self,
        *,
        homework_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> None:
        """
        Tutor deletes a homework task. Students cannot delete homework.
        """
        task = await self.get_homework_for_tutor(
            homework_id=homework_id,
            tutor_id=tutor_id,
        )

        await self.repo.delete(task.id)
        await self.db.commit()