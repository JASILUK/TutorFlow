import uuid
from datetime import datetime
from typing import Any, Sequence

from sqlalchemy import delete, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.interfaces import LoaderOption
from sqlalchemy.orm import selectinload


from app.models.session import Session, SessionStatus
from app.models.student_profile import StudentProfile
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session]):
    """Repository handling all database queries for the Session entity."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(model=Session, session=session)

    async def get_by_id(
        self,
        session_id: uuid.UUID,
        *,
        options: Sequence[LoaderOption] | None = None,
    ) -> Session | None:
        """Retrieve a session by primary key with optional loader strategies."""
        stmt = select(Session).where(Session.id == session_id)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_tutor(
        self,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        *,
        options: Sequence[LoaderOption] | None = None,
    ) -> Session | None:
        """Retrieve a session constrained to a specific tutor for SQL-level filtering."""
        stmt = select(Session).where(
            Session.id == session_id,
            Session.tutor_id == tutor_id,
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_student(
        self,
        session_id: uuid.UUID,
        student_profile_id: uuid.UUID,
        *,
        options: Sequence[LoaderOption] | None = None,
    ) -> Session | None:
        """Retrieve a session constrained to a specific student profile."""
        stmt = select(Session).where(
            Session.id == session_id,
            Session.student_profile_id == student_profile_id,
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_with_student(self, session_id: uuid.UUID) -> Session | None:
        """Retrieve a session by ID with the student profile eagerly loaded."""
        stmt = (
            select(Session)
            .options(selectinload(Session.student_profile))
            .where(Session.id == session_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        tutor_id: uuid.UUID,
        student_profile_id: uuid.UUID,
        topic: str,
        scheduled_start: datetime,
        scheduled_end: datetime,
        meeting_url: str | None = None,
    ) -> Session:
        """
        Create a new session record in SCHEDULED state.
        
        Note: Business validation (e.g., student ownership, start < end)
        must be executed by SessionService prior to this call.
        """
        session_record = Session(
            tutor_id=tutor_id,
            student_profile_id=student_profile_id,
            topic=topic,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            meeting_url=meeting_url,
            status=SessionStatus.SCHEDULED,
        )
        self.session.add(session_record)
        await self.session.flush()
        return session_record

    
    async def list_by_tutor(
        self,
        tutor_id: uuid.UUID,
        *,
        status: SessionStatus | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        limit: int | None = None,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """Fetch sessions for a tutor ordered by scheduled start descending with optional date filtering."""
        stmt = select(Session).where(Session.tutor_id == tutor_id)
        if status is not None:
            stmt = stmt.where(Session.status == status)
        if start is not None:
            stmt = stmt.where(Session.scheduled_end > start)
        if end is not None:
            stmt = stmt.where(Session.scheduled_start < end)

        stmt = stmt.order_by(Session.scheduled_start.desc())
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
        status: SessionStatus | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        limit: int | None = None,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """Fetch sessions for a student profile ordered by scheduled start descending with optional date filtering."""
        stmt = select(Session).where(Session.student_profile_id == student_profile_id)
        if status is not None:
            stmt = stmt.where(Session.status == status)
        if start is not None:
            stmt = stmt.where(Session.scheduled_end > start)
        if end is not None:
            stmt = stmt.where(Session.scheduled_start < end)

        stmt = stmt.order_by(Session.scheduled_start.desc())
        if limit is not None:
            stmt = stmt.limit(limit)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_upcoming_by_tutor(
        self,
        tutor_id: uuid.UUID,
        *,
        now: datetime,
        limit: int = 10,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """
        Fetch upcoming active sessions for a tutor.
        Active states include SCHEDULED and IN_PROGRESS.
        """
        stmt = (
            select(Session)
            .where(
                Session.tutor_id == tutor_id,
                Session.scheduled_start >= now,
                Session.status.in_([SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]),
            )
            .order_by(Session.scheduled_start.asc())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_upcoming_by_student(
        self,
        student_profile_id: uuid.UUID,
        *,
        now: datetime,
        limit: int = 10,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """Fetch upcoming active sessions for a student profile."""
        stmt = (
            select(Session)
            .where(
                Session.student_profile_id == student_profile_id,
                Session.scheduled_start >= now,
                Session.status.in_([SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]),
            )
            .order_by(Session.scheduled_start.asc())
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
    ) -> list[Session]:
        """
        Fetch completed or reviewed sessions for Student Overview.
        Excludes SCHEDULED and IN_PROGRESS states directly in SQL.
        """
        stmt = (
            select(Session)
            .where(
                Session.student_profile_id == student_profile_id,
                Session.status.in_([SessionStatus.COMPLETED, SessionStatus.AI_REVIEWED]),
            )
            .order_by(Session.scheduled_start.desc())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def find_overlapping_sessions(
        self,
        *,
        tutor_id: uuid.UUID,
        scheduled_start: datetime,
        scheduled_end: datetime,
        exclude_session_id: uuid.UUID | None = None,
    ) -> list[Session]:
        """
        Identify active sessions (SCHEDULED or IN_PROGRESS) overlapping with the requested window.
        
        Overlap condition:
            existing.scheduled_start < requested_end
            AND
            existing.scheduled_end > requested_start
        """
        stmt = select(Session).where(
            Session.tutor_id == tutor_id,
            Session.status.in_([SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]),
            Session.scheduled_start < scheduled_end,
            Session.scheduled_end > scheduled_start,
        )
        if exclude_session_id is not None:
            stmt = stmt.where(Session.id != exclude_session_id)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self,
        session_id: uuid.UUID,
        values: dict[str, Any],
    ) -> Session | None:
        """
        Update specific columns for a session without bypassing lifecycle rules.
        Field eligibility must be verified by SessionService prior to invocation.
        """
        if not values:
            return await self.get_by_id(session_id)

        stmt = (
            update(Session)
            .where(Session.id == session_id)
            .values(**values)
            .execution_options(synchronize_session="fetch")
        )
        result = await self.session.execute(stmt)
        if result.rowcount == 0:
            return None

        await self.session.flush()
        return await self.get_by_id(session_id)

    async def delete(
        self,
        session_id: uuid.UUID,
    ) -> bool:
        """
        Delete a session record by primary key.
        The service layer is responsible for verifying that status == SCHEDULED.
        """
        stmt = delete(Session).where(Session.id == session_id)
        result = await self.session.execute(stmt)
        if result.rowcount > 0:
            await self.session.flush()
            return True
        return False



    async def count_completed_by_student(self, student_profile_id: uuid.UUID) -> int:
        """Count completed or reviewed sessions for a student via an indexed query."""
        stmt = (
            select(func.count(Session.id))
            .where(
                Session.student_profile_id == student_profile_id,
                Session.status.in_([SessionStatus.COMPLETED, SessionStatus.AI_REVIEWED]),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    async def list_today_by_tutor(
        self,
        tutor_id: uuid.UUID,
        *,
        start_of_day: datetime,
        end_of_day: datetime,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """Fetch all sessions occurring today for a tutor ordered ascending."""
        stmt = (
            select(Session)
            .where(
                Session.tutor_id == tutor_id,
                Session.scheduled_start >= start_of_day,
                Session.scheduled_start < end_of_day,
            )
            .order_by(Session.scheduled_start.asc())
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_recent_by_tutor(
        self,
        tutor_id: uuid.UUID,
        *,
        limit: int = 5,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """Fetch recently completed or reviewed sessions for a tutor ordered descending."""
        stmt = (
            select(Session)
            .where(
                Session.tutor_id == tutor_id,
                Session.status.in_([SessionStatus.COMPLETED, SessionStatus.AI_REVIEWED]),
            )
            .order_by(Session.scheduled_start.desc())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_sessions_for_tutor_in_range(
        self,
        tutor_id: uuid.UUID,
        *,
        start: datetime,
        end: datetime,
    ) -> int:
        """Count sessions scheduled in a specific window for dashboard summary cards."""
        stmt = (
            select(func.count(Session.id))
            .where(
                Session.tutor_id == tutor_id,
                Session.scheduled_start >= start,
                Session.scheduled_start < end,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    async def count_upcoming_by_tutor(
        self,
        tutor_id: uuid.UUID,
        *,
        now: datetime,
    ) -> int:
        """Count active sessions starting from now onwards."""
        stmt = (
            select(func.count(Session.id))
            .where(
                Session.tutor_id == tutor_id,
                Session.scheduled_start >= now,
                Session.status.in_([SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    async def list_recently_completed_without_review(
        self,
        tutor_id: uuid.UUID,
        *,
        limit: int = 5,
        options: Sequence[LoaderOption] | None = None,
    ) -> list[Session]:
        """Find recently completed sessions that have not yet had an AI debrief generated."""
        stmt = (
            select(Session)
            .where(
                Session.tutor_id == tutor_id,
                Session.status == SessionStatus.COMPLETED,
            )
            .order_by(Session.completed_at.desc().nullslast())
            .limit(limit)
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())


    async def get_by_id_with_calendar_relations(self, session_id: uuid.UUID) -> Session | None:
        """Retrieve a session by ID with student profile, student user, and tutor eagerly loaded."""
        stmt = (
            select(Session)
            .options(
                selectinload(Session.student_profile).selectinload(StudentProfile.student_user),
                selectinload(Session.tutor),
            )
            .where(Session.id == session_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()