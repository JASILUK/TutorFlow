"""Read-model orchestration service for the Student Dashboard."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.repositories.homework_repository import HomeworkRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.student_repository import StudentProfileRepository
from app.schemas.dashboard import (
    StudentDashboardHomework,
    StudentDashboardHomeworkItem,
    StudentDashboardProgress,
    StudentDashboardResponse,
    StudentNextSessionItem,
    StudentRecentSessionItem,
)
from app.services.session_service import SESSION_DISPLAY_OPTIONS


class StudentDashboardService:
    """Composes the read model for an authenticated student's home dashboard."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.session_repo = SessionRepository(db)
        self.profile_repo = StudentProfileRepository(db)
        self.homework_repo = HomeworkRepository(db)

    async def get_dashboard(self, user_id: uuid.UUID) -> StudentDashboardResponse:
        """Fetch dashboard data without triggering any background tasks or AI operations."""
        profile = await self.profile_repo.get_by_user_id(user_id=user_id)
        if not profile:
            raise NotFoundException(resource_name="StudentProfile", identifier=user_id)

        now_utc = datetime.now(timezone.utc)

        # 1. Next Upcoming Session (limit 1, eager-loads tutor and student)
        upcoming = await self.session_repo.list_upcoming_by_student(
            student_profile_id=profile.id,
            now=now_utc,
            limit=1,
            options=SESSION_DISPLAY_OPTIONS,
        )
        next_session: StudentNextSessionItem | None = None
        if upcoming:
            s = upcoming[0]
            next_session = StudentNextSessionItem(
                id=s.id,
                topic=s.topic,
                scheduled_start=s.scheduled_start,
                scheduled_end=s.scheduled_end,
                tutor_name=s.tutor_name,
                status=s.status,
                meeting_url=s.meeting_url,
            )

        # 2. Pending Homework (bounded to top 5)
        pending_items = await self.homework_repo.list_pending_by_student(
            student_profile_id=profile.id,
            limit=5,
        )
        pending_count = await self.homework_repo.count_by_student(
            student_profile_id=profile.id,
            is_completed=False,
        )
        homework = StudentDashboardHomework(
            pending_count=pending_count,
            recent=[
                StudentDashboardHomeworkItem(
                    id=hw.id,
                    session_id=hw.session_id,
                    title=hw.title,
                    description=hw.description,
                    is_completed=hw.is_completed,
                    created_at=hw.created_at,
                )
                for hw in pending_items
            ],
        )

        # 3. Recent Sessions (last 3 completed/reviewed, strips private tutor notes)
        recent_sessions_db = await self.session_repo.list_recent_by_student(
            student_profile_id=profile.id,
            limit=3,
            options=SESSION_DISPLAY_OPTIONS,
        )
        recent_sessions = [
            StudentRecentSessionItem(
                id=s.id,
                topic=s.topic,
                scheduled_start=s.scheduled_start,
                scheduled_end=s.scheduled_end,
                tutor_name=s.tutor_name,
                status=s.status,
                meeting_url=s.meeting_url,
            )
            for s in recent_sessions_db
        ]

        # 4. Progress Snapshot (stored metrics only, never invokes AI)
        completed_count = await self.session_repo.count_completed_by_student(profile.id)
        latest_focus = (
            recent_sessions_db[0].ai_suggested_focus
            if recent_sessions_db and recent_sessions_db[0].ai_suggested_focus
            else None
        )

        progress = StudentDashboardProgress(
            total_sessions_completed=completed_count,
            latest_ai_focus=latest_focus,
        )

        return StudentDashboardResponse(
            next_session=next_session,
            homework=homework,
            progress=progress,
            recent_sessions=recent_sessions,
        )