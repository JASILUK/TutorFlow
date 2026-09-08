from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Sequence

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.interfaces import LoaderOption

from app.core.exceptions import (
    InvalidSessionTimeError,
    InvalidSessionTransitionError,
    NotFoundException,
    SessionAccessDeniedError,
    SessionConflictError,
    SessionNotEditableError,
    SessionNotFoundError,
)
from app.models.session import Session, SessionStatus
from app.models.student_profile import StudentProfile
from app.models.user import User, UserRole
from app.repositories.session_repository import SessionRepository
from app.services.student_service import StudentService

if TYPE_CHECKING:
    from app.services.homework_service import HomeworkService

logger = logging.getLogger(__name__)

# Standard relationship loader options to populate tutor_name and student_name
SESSION_DISPLAY_OPTIONS: Sequence[LoaderOption] = (
    selectinload(Session.tutor),
    selectinload(Session.student_profile).selectinload(StudentProfile.student_user),
)


class SessionService:
    """
    Production-ready domain service governing the complete lifecycle of tutoring sessions.
    Owns business validation, authorization, lifecycle state transitions, and transaction boundaries.
    """

    def __init__(
        self,
        *,
        session_repository: SessionRepository,
        db_session: AsyncSession,
        student_service: StudentService,
        ai_service: Optional[Any] = None,
        homework_service: Optional[HomeworkService] = None,
    ) -> None:
        self.repo = session_repository
        self.db = db_session
        self.student_service = student_service
        self.ai_service = ai_service
        self.homework_service = homework_service

    # =========================================================================
    # 1. RETRIEVAL & PERMISSIONS
    # =========================================================================

    async def get_session(
        self,
        *,
        session_id: uuid.UUID,
        user: User,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Session:
        """
        Retrieve a single session ensuring strict ownership filtering.
        Tutors can only access sessions they conduct.
        Students can only access sessions tied to their profile.
        """
        effective_options = options if options is not None else SESSION_DISPLAY_OPTIONS
        session = await self.repo.get_by_id(session_id, options=effective_options)
        if not session:
            raise SessionNotFoundError(session_id)

        if user.role == UserRole.TUTOR:
            if session.tutor_id != user.id:
                raise SessionAccessDeniedError()
            return session

        # Student access verification
        student_profile = await self.student_service.get_profile_by_user_id(user.id)
        if not student_profile or session.student_profile_id != student_profile.id:
            raise SessionAccessDeniedError()

        return session

    async def get_session_for_tutor(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Session:
        """Fetch session ensuring tutor ownership."""
        effective_options = options if options is not None else SESSION_DISPLAY_OPTIONS
        session = await self.repo.get_by_id_for_tutor(
            session_id=session_id,
            tutor_id=tutor_id,
            options=effective_options,
        )
        if not session:
            raise SessionNotFoundError(session_id)
        return session

    async def get_session_for_student(
        self,
        *,
        session_id: uuid.UUID,
        student_profile_id: uuid.UUID,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Session:
        """Fetch session ensuring student profile ownership."""
        effective_options = options if options is not None else SESSION_DISPLAY_OPTIONS
        session = await self.repo.get_by_id_for_student(
            session_id=session_id,
            student_profile_id=student_profile_id,
            options=effective_options,
        )
        if not session:
            raise SessionNotFoundError(session_id)
        return session

    async def get_session_for_notification(
        self,
        session_id: uuid.UUID,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Optional[Session]:
        """
        System-level lookup specifically for background Celery workers and notifications.
        Loads tutor and student relation graphs in one single query without user session state.
        """
        effective_options = options if options is not None else SESSION_DISPLAY_OPTIONS
        return await self.repo.get_by_id(session_id=session_id, options=effective_options)

    async def list_sessions(
        self,
        *,
        user: User,
        student_profile_id: Optional[uuid.UUID] = None,
        status: Optional[SessionStatus] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 50,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> List[Session]:
        """
        List sessions filtered by ownership with bounded SQL limits and optional date-range overlap.
        Eagerly loads related tutor and student models to guarantee 0 N+1 queries.
        """
        limit = min(max(1, limit), 100)
        effective_options = options if options is not None else SESSION_DISPLAY_OPTIONS

        start_utc = self._ensure_utc(start) if start is not None else None
        end_utc = self._ensure_utc(end) if end is not None else None

        if start_utc is not None and end_utc is not None and start_utc >= end_utc:
            raise InvalidSessionTimeError("Filter start must be earlier than filter end.")

        if user.role == UserRole.TUTOR:
            if student_profile_id:
                belongs = await self.student_service.verify_student_belongs_to_tutor(
                    student_profile_id=student_profile_id,
                    tutor_id=user.id,
                )
                if not belongs:
                    raise SessionAccessDeniedError("Student does not belong to your roster.")
                return await self.repo.list_by_student(
                    student_profile_id=student_profile_id,
                    status=status,
                    start=start_utc,
                    end=end_utc,
                    limit=limit,
                    options=effective_options,
                )
            return await self.repo.list_by_tutor(
                tutor_id=user.id,
                status=status,
                start=start_utc,
                end=end_utc,
                limit=limit,
                options=effective_options,
            )

        # Student user role
        student_profile = await self.student_service.get_profile_by_user_id(user.id)
        if not student_profile:
            return []

        # Students cannot pass another student's profile ID
        return await self.repo.list_by_student(
            student_profile_id=student_profile.id,
            status=status,
            start=start_utc,
            end=end_utc,
            limit=limit,
            options=effective_options,
        )

    # =========================================================================
    # 2. SESSION CREATION & SCHEDULING
    # =========================================================================
    async def create_session(
            self,
            *,
            tutor_id: uuid.UUID,
            student_profile_id: uuid.UUID,
            topic: str,
            scheduled_start: datetime,
            scheduled_end: datetime,
            meeting_url: Optional[str] = None,
        ) -> Session:
            """
            Schedule a new session:
            1. Validate timezone-aware datetime sequence.
            2. Verify student ownership.
            3. Double-booking check (application layer).
            4. Insert session & commit transaction.
            5. Catch Postgres GiST exclusion violations (concurrency safety net).
            6. Queue Google Calendar/Meet sync task asynchronously (which chains the email task upon success).
            """
            start_utc = self._ensure_utc(scheduled_start)
            end_utc = self._ensure_utc(scheduled_end)

            if start_utc >= end_utc:
                raise InvalidSessionTimeError("Session scheduled_start must be earlier than scheduled_end.")

            belongs = await self.student_service.verify_student_belongs_to_tutor(
                student_profile_id=student_profile_id,
                tutor_id=tutor_id,
            )
            if not belongs:
                raise NotFoundException(resource_name="StudentProfile", identifier=student_profile_id)

            conflicts = await self.repo.find_overlapping_sessions(
                tutor_id=tutor_id,
                scheduled_start=start_utc,
                scheduled_end=end_utc,
            )
            if conflicts:
                raise SessionConflictError(
                    f"Tutor already has an active session scheduled between "
                    f"{conflicts[0].scheduled_start.isoformat()} and {conflicts[0].scheduled_end.isoformat()}."
                )

            try:
                session = await self.repo.create(
                    tutor_id=tutor_id,
                    student_profile_id=student_profile_id,
                    topic=topic.strip(),
                    scheduled_start=start_utc,
                    scheduled_end=end_utc,
                    meeting_url=meeting_url.strip() if meeting_url else None,
                )
                await self.db.commit()

                # Enqueue Google Calendar / Meet sync background task after commit succeeds.
                # This task will auto-generate Google Meet if meeting_url is empty, 
                # create/mirror calendar events, and then chain the email notification task.
                from app.workers.tasks.calendar_tasks import sync_session_google_calendar
                sync_session_google_calendar.delay(str(session.id))

                # Hydrate display relationships
                hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
                return hydrated or session
            except IntegrityError as exc:
                await self.db.rollback()
                err_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
                if "uq_tutor_no_overlapping_active_sessions" in err_msg:
                    raise SessionConflictError("A concurrent booking reserved this time slot. Please choose another window.")
                raise
    # =========================================================================
    # 3. SCHEDULED SESSION MUTATIONS & DELETION
    # =========================================================================

    async def update_session(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        topic: Optional[str] = None,
        scheduled_start: Optional[datetime] = None,
        scheduled_end: Optional[datetime] = None,
        meeting_url: Optional[str] = None,
        ai_plan: Optional[Dict[str, Any]] = None,
    ) -> Session:
        """
        Update session topic, times, or meeting link.
        Permitted ONLY when status == SCHEDULED.
        Recalculates effective start/end times and performs overlap verification.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)

        if session.status != SessionStatus.SCHEDULED:
            raise SessionNotEditableError(f"Cannot edit session in '{session.status.value}' state.")

        final_start = self._ensure_utc(scheduled_start) if scheduled_start else session.scheduled_start
        final_end = self._ensure_utc(scheduled_end) if scheduled_end else session.scheduled_end

        if final_start >= final_end:
            raise InvalidSessionTimeError("Session scheduled_start must be earlier than scheduled_end.")

        if scheduled_start is not None or scheduled_end is not None:
            conflicts = await self.repo.find_overlapping_sessions(
                tutor_id=tutor_id,
                scheduled_start=final_start,
                scheduled_end=final_end,
                exclude_session_id=session.id,
            )
            if conflicts:
                raise SessionConflictError("Updated time range conflicts with another active session.")

        update_fields: Dict[str, Any] = {
            "scheduled_start": final_start,
            "scheduled_end": final_end,
        }
        if topic is not None:
            update_fields["topic"] = topic.strip()
        if meeting_url is not None:
            update_fields["meeting_url"] = meeting_url.strip() if meeting_url else None
        if ai_plan is not None:
            update_fields["ai_plan"] = ai_plan       

        try:
            await self.repo.update(session.id, values=update_fields)
            await self.db.commit()

            hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
            return hydrated or session
        except IntegrityError as exc:
            await self.db.rollback()
            err_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
            if "uq_tutor_no_overlapping_active_sessions" in err_msg:
                raise SessionConflictError("Updated time conflicts with a concurrent booking.")
            raise

    async def delete_session(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> None:
        """
        Permanently remove a session. Allowed ONLY when status == SCHEDULED.
        Completed, in-progress, or reviewed sessions cannot be deleted.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)

        if session.status != SessionStatus.SCHEDULED:
            raise SessionNotEditableError(f"Cannot delete a session that is '{session.status.value}'.")

        await self.repo.delete(session.id)
        await self.db.commit()

    # =========================================================================
    # 4. LIFECYCLE TRANSITIONS & LIVE NOTES
    # =========================================================================

    async def start_session(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        now: datetime,
    ) -> Session:
        """
        Transition: SCHEDULED -> IN_PROGRESS.
        Sets started_at to current UTC execution time without overwriting existing timestamps.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)
        self._ensure_status(session, expected=SessionStatus.SCHEDULED, target=SessionStatus.IN_PROGRESS)

        now_utc = self._ensure_utc(now)
        await self.repo.update(
            session.id,
            values={
                "status": SessionStatus.IN_PROGRESS,
                "started_at": session.started_at or now_utc,
            },
        )
        await self.db.commit()

        hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
        return hydrated or session

    async def update_notes(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        notes: str,
    ) -> Session:
        """
        Update live tutor notes.
        Permitted strictly during IN_PROGRESS state.
        Idempotent for repeated autosave payloads.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)

        if session.status != SessionStatus.IN_PROGRESS:
            raise SessionNotEditableError(f"Notes can only be edited while IN_PROGRESS (current: {session.status.value}).")

        if session.notes == notes:
            return session

        await self.repo.update(session.id, values={"notes": notes})
        await self.db.commit()

        hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
        return hydrated or session

    async def complete_session(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        now: datetime,
    ) -> Session:
        """
        Transition: IN_PROGRESS -> COMPLETED.
        Sets completed_at timestamp. Does NOT mark AI_REVIEWED automatically.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)
        self._ensure_status(session, expected=SessionStatus.IN_PROGRESS, target=SessionStatus.COMPLETED)

        now_utc = self._ensure_utc(now)
        await self.repo.update(
            session.id,
            values={
                "status": SessionStatus.COMPLETED,
                "completed_at": session.completed_at or now_utc,
            },
        )
        await self.db.commit()

        hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
        return hydrated or session

    # =========================================================================
    # 5. AI GENERATION ORCHESTRATION
    # =========================================================================

    async def generate_plan(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> Session:
        """
        Generate pre-session lesson plan via AIService.
        Session must be SCHEDULED or IN_PROGRESS. Status remains unchanged.
        If generation fails, existing plan is preserved.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)

        if session.status not in (SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS):
            raise SessionNotEditableError("AI plans can only be generated for scheduled or active sessions.")

        if not self.ai_service:
            logger.warning("AIService not configured. Skipping plan generation.")
            return session

        student_context = await self.student_service.get_ai_student_context(session.student_profile_id)

        try:
            plan = await self.ai_service.generate_session_plan(
                topic=session.topic,
                student_context=student_context,
            )
            if plan:
                await self.repo.update(session.id, values={"ai_plan": plan})
                await self.db.commit()

                hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
                return hydrated or session
        except Exception as exc:
            logger.error(f"Failed to generate AI plan for session {session_id}: {exc}", exc_info=True)

        return session

    async def generate_debrief(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> Session:
        """
        Post-session AI debrief orchestration:
        1. Verifies COMPLETED state.
        2. Calls AIService for summary, suggested focus, and homework recommendations.
        3. Updates session debrief fields and transitions to AI_REVIEWED.
        4. Persists homework tasks atomically via HomeworkService.
        """
        session = await self.get_session_for_tutor(session_id=session_id, tutor_id=tutor_id)

        if session.status == SessionStatus.AI_REVIEWED:
            return session

        self._ensure_status(session, expected=SessionStatus.COMPLETED, target=SessionStatus.AI_REVIEWED)

        if not self.ai_service:
            logger.warning("AIService not configured. Cannot process AI debrief.")
            return session

        student_context = await self.student_service.get_ai_student_context(session.student_profile_id)
        debrief_result = await self.ai_service.generate_session_debrief(
            topic=session.topic,
            notes=session.notes,
            student_context=student_context,
        )

        try:
            await self.repo.update(
                session.id,
                values={
                    "ai_session_summary": debrief_result.summary,
                    "ai_suggested_focus": debrief_result.suggested_focus,
                    "status": SessionStatus.AI_REVIEWED,
                },
            )

            # Persist homework tasks if returned by AI debrief
            if self.homework_service and getattr(debrief_result, "homework_tasks", None):
                await self.homework_service.create_homework_many(
                    session_id=session.id,
                    tutor_id=session.tutor_id,
                    tasks=debrief_result.homework_tasks,
                    student_profile_id=session.student_profile_id,
                )

            await self.db.commit()

            hydrated = await self.repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
            return hydrated or session
        except Exception as exc:
            await self.db.rollback()
            logger.error(f"Failed to persist AI debrief and homework for session {session_id}: {exc}", exc_info=True)
            raise

    # =========================================================================
    # 6. INTERNAL VALIDATION & DISPATCH HELPERS
    # =========================================================================

    @staticmethod
    def _ensure_status(session: Session, expected: SessionStatus, target: SessionStatus) -> None:
        if session.status != expected:
            raise InvalidSessionTransitionError(
                current_status=session.status.value,
                target_status=target.value,
            )

    @staticmethod
    def _ensure_utc(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def _dispatch_session_scheduled_email(session_id: uuid.UUID) -> None:
        """Queue Celery background notification without impacting session persistence."""
        try:
            from app.workers.tasks.email_tasks import send_session_scheduled_email

            send_session_scheduled_email.delay(str(session_id))
        except Exception as exc:
            logger.warning(
                "Celery task dispatcher unavailable. Could not enqueue scheduled email for session %s: %s",
                session_id,
                exc,
            )

   