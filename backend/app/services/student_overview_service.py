import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.session import Session, SessionStatus
from app.models.user import User, UserRole
from app.repositories.homework_repository import HomeworkRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.student_repository import StudentProfileRepository
from app.schemas.session import SessionResponse
from app.schemas.student import (
    OverviewHomeworkTaskSummary,
    OverviewMetrics,
    OverviewStudentSummary,
    StudentOverviewResponse,
)
from app.services.homework_service import HomeworkService
from app.services.session_service import SESSION_DISPLAY_OPTIONS, SessionService
from app.services.student_service import StudentService


class StudentOverviewService:
    """
    Orchestration service that composes the student overview dashboard.
    Coordinates StudentProfileRepository, SessionRepository, and HomeworkService
    without introducing N+1 queries.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db = session
        self.profile_repo = StudentProfileRepository(session)
        self.session_repo = SessionRepository(session)

        # Domain services
        self.student_service = StudentService(session=session)
        self.session_service = SessionService(
            session_repository=self.session_repo,
            db_session=session,
            student_service=self.student_service,
        )
        self.homework_service = HomeworkService(
            homework_repository=HomeworkRepository(session=session),
            session_service=self.session_service,
            student_service=self.student_service,
            db_session=session,
        )

    async def get_student_overview(
        self,
        *,
        student_profile_id: uuid.UUID,
        current_user: User,
    ) -> StudentOverviewResponse:
        """
        Assemble the complete overview:
        - Validates multi-tenant permissions (tutor owns student, or student owns profile).
        - Fetches next upcoming active session (with display relationships loaded).
        - Fetches up to 3 recent completed/reviewed sessions (with display relationships loaded).
        - Fetches pending homework tasks through HomeworkService.
        - Calculates overview metrics.
        """
        # 1. Fetch Profile with User details
        profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=student_profile_id,
            include_student_user=True,
        )
        if not profile:
            raise NotFoundException(resource_name="StudentProfile", identifier=student_profile_id)

        # 2. Authorization Check
        if current_user.role == UserRole.TUTOR:
            if profile.tutor_id != current_user.id:
                raise ForbiddenException("You do not have access to this student's overview.")
        elif current_user.role == UserRole.STUDENT:
            if profile.user_id != current_user.id:
                raise ForbiddenException("You can only view your own overview dashboard.")

        now_utc = datetime.now(timezone.utc)

        # 3. Next Upcoming Session (limit 1, eagerly loads tutor and student user for SessionResponse)
        upcoming_sessions = await self.session_repo.list_upcoming_by_student(
            student_profile_id=profile.id,
            now=now_utc,
            limit=1,
            options=SESSION_DISPLAY_OPTIONS,
        )
        next_session = upcoming_sessions[0] if upcoming_sessions else None

        # 4. Recent Completed/Reviewed Sessions (limit 3, eagerly loads display relationships)
        recent_sessions = await self.session_repo.list_recent_by_student(
            student_profile_id=profile.id,
            limit=3,
            options=SESSION_DISPLAY_OPTIONS,
        )

        # 5. Pending Homework Tasks & Counts via HomeworkService
        pending_homework_items = await self.homework_service.list_pending_homework_for_student(
            student_profile_id=profile.id,
            limit=5,
        )
        pending_count = await self.homework_service.count_student_homework(
            student_profile_id=profile.id,
            is_completed=False,
        )

        # 6. Metrics Aggregation via SessionRepository
        total_completed = await self.session_repo.count_completed_by_student(profile.id)

        # Latest AI suggested focus (if available on the most recent completed session)
        latest_ai_focus: Optional[str] = None
        if recent_sessions and recent_sessions[0].ai_suggested_focus:
            latest_ai_focus = recent_sessions[0].ai_suggested_focus

        # 7. Assemble Consolidated Response
        student_user = profile.student_user
        student_summary = OverviewStudentSummary(
            profile_id=profile.id,
            user_id=profile.user_id,
            full_name=student_user.full_name if student_user else "Student",
            email=student_user.email if student_user else "",
            subject=profile.subject,
            current_level=profile.current_level,
            learning_goals=profile.learning_goals,
            weak_areas=profile.weak_areas,
        )

        metrics = OverviewMetrics(
            total_sessions_completed=total_completed,
            pending_homework_count=pending_count,
            latest_ai_focus=latest_ai_focus,
        )

        return StudentOverviewResponse(
            student=student_summary,
            metrics=metrics,
            next_session=SessionResponse.model_validate(next_session) if next_session else None,
            recent_sessions=[SessionResponse.model_validate(s) for s in recent_sessions],
            pending_homework=[
                OverviewHomeworkTaskSummary(
                    id=hw.id,
                    session_id=hw.session_id,
                    title=hw.title,
                    description=hw.description,
                    is_completed=hw.is_completed,
                    due_date=None,
                )
                for hw in pending_homework_items
            ],
        )