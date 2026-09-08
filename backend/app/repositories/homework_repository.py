import uuid
from typing import Any, Sequence

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.interfaces import LoaderOption

from app.models.homework import HomeworkTask
from app.models.session import Session
from app.repositories.base import BaseRepository


class HomeworkRepository(BaseRepository[HomeworkTask]):
    """
    SQLAlchemy 2.0 Async Repository for managing HomeworkTask entities.
    Enforces student and tutor multi-tenant ownership at the SQL level via Session joins.
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(model=HomeworkTask, session=session)

    # =========================================================================
    # 1. RETRIEVAL & OWNERSHIP
    # =========================================================================

    async def get_by_id(
        self,
        homework_id: uuid.UUID,
        *,
        options: Sequence[LoaderOption] | None = None,
    ) -> HomeworkTask | None:
        """Retrieve a single homework task by primary key with optional eager loading."""
        stmt = select(HomeworkTask).where(HomeworkTask.id == homework_id)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_tutor(
        self,
        homework_id: uuid.UUID,
        tutor_id: uuid.UUID,
        *,
        options: Sequence[LoaderOption] | None = None,
    ) -> HomeworkTask | None:
        """
        Retrieve a homework task ensuring tutor ownership via Session in SQL.
        Prevents unauthorized cross-tutor reads and eliminates Python-level checks.
        """
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(
                HomeworkTask.id == homework_id,
                Session.tutor_id == tutor_id,
            )
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_student(
        self,
        homework_id: uuid.UUID,
        student_profile_id: uuid.UUID,
        *,
        options: Sequence[LoaderOption] | None = None,
    ) -> HomeworkTask | None:
        """
        Retrieve a homework task ensuring student ownership via Session in SQL.
        Protects against untrusted homework task IDs.
        """
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(
                HomeworkTask.id == homework_id,
                Session.student_profile_id == student_profile_id,
            )
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # =========================================================================
    # 2. CREATION & BULK INGESTION
    # =========================================================================

    async def create(
        self,
        *,
        session_id: uuid.UUID,
        title: str,
        description: str,
    ) -> HomeworkTask:
        """
        Create a single homework task initialized with is_completed=False.
        Flushes to acquire DB defaults without committing the transaction.
        """
        task = HomeworkTask(
            session_id=session_id,
            title=title.strip(),
            description=description.strip(),
            is_completed=False,
        )
        self.session.add(task)
        await self.session.flush()
        return task

    async def create_many(
        self,
        *,
        session_id: uuid.UUID,
        tasks: Sequence[dict[str, str]],
    ) -> list[HomeworkTask]:
        """
        Batch-insert multiple homework tasks for a session (e.g. from an AI debrief).
        Executes a single flush to avoid multiple round-trips.
        """
        if not tasks:
            return []

        instances: list[HomeworkTask] = [
            HomeworkTask(
                session_id=session_id,
                title=task["title"].strip(),
                description=task["description"].strip(),
                is_completed=False,
            )
            for task in tasks
        ]

        self.session.add_all(instances)
        await self.session.flush()
        return instances

    # =========================================================================
    # 3. BOUNDED LIST QUERIES
    # =========================================================================

    async def list_by_session(
        self,
        session_id: uuid.UUID,
        *,
        is_completed: bool | None = None,
        limit: int | None = None,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[HomeworkTask]:
        """
        List all homework tasks for a specific session ordered by created_at ASC
        to preserve presentation order.
        """
        stmt = (
            select(HomeworkTask)
            .where(HomeworkTask.session_id == session_id)
            .order_by(HomeworkTask.created_at.asc())
        )
        if is_completed is not None:
            stmt = stmt.where(HomeworkTask.is_completed == is_completed)
        if limit is not None:
            stmt = stmt.limit(limit)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_student(
        self,
        student_profile_id: uuid.UUID,
        *,
        is_completed: bool | None = None,
        limit: int = 50,
        offset: int | None = None,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[HomeworkTask]:
        """
        List homework tasks for a student via Session JOIN.
        Ordered by created_at DESC for global homework timelines.
        """
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(Session.student_profile_id == student_profile_id)
            .order_by(HomeworkTask.created_at.desc())
            .limit(limit)
        )
        if is_completed is not None:
            stmt = stmt.where(HomeworkTask.is_completed == is_completed)
        if offset is not None:
            stmt = stmt.offset(offset)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_tutor(
        self,
        tutor_id: uuid.UUID,
        *,
        student_profile_id: uuid.UUID | None = None,
        is_completed: bool | None = None,
        limit: int = 50,
        offset: int | None = None,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[HomeworkTask]:
        """
        List homework tasks across all sessions conducted by a tutor.
        Optionally filter by a specific student profile.
        """
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(Session.tutor_id == tutor_id)
            .order_by(HomeworkTask.created_at.desc())
            .limit(limit)
        )
        if student_profile_id is not None:
            stmt = stmt.where(Session.student_profile_id == student_profile_id)
        if is_completed is not None:
            stmt = stmt.where(HomeworkTask.is_completed == is_completed)
        if offset is not None:
            stmt = stmt.offset(offset)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_pending_by_student(
        self,
        student_profile_id: uuid.UUID,
        *,
        limit: int = 20,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[HomeworkTask]:
        """Fetch incomplete tasks for the student dashboard."""
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(
                Session.student_profile_id == student_profile_id,
                HomeworkTask.is_completed == False,  # noqa: E712
            )
            .order_by(HomeworkTask.created_at.desc())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_completed_by_student(
        self,
        student_profile_id: uuid.UUID,
        *,
        limit: int = 20,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[HomeworkTask]:
        """Fetch completed tasks for the student history."""
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(
                Session.student_profile_id == student_profile_id,
                HomeworkTask.is_completed == True,  # noqa: E712
            )
            .order_by(HomeworkTask.created_at.desc())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_recent_by_student(
        self,
        student_profile_id: uuid.UUID,
        *,
        limit: int = 3,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[HomeworkTask]:
        """
        Fetch a small bounded snapshot of recent homework tasks for Student Overview.
        Prevents unbounded historical scans.
        """
        stmt = (
            select(HomeworkTask)
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(Session.student_profile_id == student_profile_id)
            .order_by(HomeworkTask.created_at.desc())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # =========================================================================
    # 4. AGGREGATIONS
    # =========================================================================

    async def count_by_student(
        self,
        student_profile_id: uuid.UUID,
        *,
        is_completed: bool | None = None,
    ) -> int:
        """
        Execute an index-backed SQL count for a student profile.
        Used for metrics aggregation without hydrating ORM objects.
        """
        stmt = (
            select(func.count(HomeworkTask.id))
            .join(Session, HomeworkTask.session_id == Session.id)
            .where(Session.student_profile_id == student_profile_id)
        )
        if is_completed is not None:
            stmt = stmt.where(HomeworkTask.is_completed == is_completed)

        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    # =========================================================================
    # 5. MUTATIONS & STATE UPDATES
    # =========================================================================

    async def update(
        self,
        homework_id: uuid.UUID,
        values: dict[str, Any],
    ) -> HomeworkTask | None:
        """
        Update specific columns of a task.
        Business eligibility is determined by the service layer.
        """
        if not values:
            return await self.get_by_id(homework_id)

        stmt = (
            update(HomeworkTask)
            .where(HomeworkTask.id == homework_id)
            .values(**values)
            .execution_options(synchronize_session="fetch")
        )
        result = await self.session.execute(stmt)
        if result.rowcount == 0:
            return None

        await self.session.flush()
        return await self.get_by_id(homework_id)

    async def set_completed(
        self,
        homework_id: uuid.UUID,
        *,
        completed: bool,
    ) -> HomeworkTask | None:
        """
        Toggle or set the completion status of a homework task.
        Flushes and returns the updated model.
        """
        stmt = (
            update(HomeworkTask)
            .where(HomeworkTask.id == homework_id)
            .values(is_completed=completed)
            .execution_options(synchronize_session="fetch")
        )
        result = await self.session.execute(stmt)
        if result.rowcount == 0:
            return None

        await self.session.flush()
        return await self.get_by_id(homework_id)

    async def delete(
        self,
        homework_id: uuid.UUID,
    ) -> bool:
        """
        Delete a single homework task by primary key.
        Returns True if a record was deleted, False otherwise.
        """
        stmt = delete(HomeworkTask).where(HomeworkTask.id == homework_id)
        result = await self.session.execute(stmt)
        if result.rowcount > 0:
            await self.session.flush()
            return True
        return False