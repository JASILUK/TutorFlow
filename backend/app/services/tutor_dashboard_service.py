"""Orchestration service composing read models for the Tutor Dashboard."""

from __future__ import annotations

import uuid
from datetime import datetime, time, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.homework import HomeworkTask
from app.models.session import Session
from app.repositories.homework_repository import HomeworkRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.student_repository import StudentProfileRepository
from app.schemas.dashboard import (
    DashboardSessionItem,
    HomeworkTaskSummaryItem,
    StudentsNeedingAttentionItem,
    TutorDashboardResponse,
    TutorDashboardSummary,
    TutorHomeworkSummary,
)
from app.services.session_service import SESSION_DISPLAY_OPTIONS


class TutorDashboardService:
    """Read-model service that aggregates tutor metrics and active workflows."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.session_repo = SessionRepository(db)
        self.profile_repo = StudentProfileRepository(db)
        self.homework_repo = HomeworkRepository(db)

    async def get_dashboard(self, tutor_id: uuid.UUID) -> TutorDashboardResponse:
        """Compose all widgets for the tutor dashboard in bounded, indexed queries."""
        now_utc = datetime.now(timezone.utc)
        start_of_day = datetime.combine(now_utc.date(), time.min, tzinfo=timezone.utc)
        end_of_day = datetime.combine(now_utc.date(), time.max, tzinfo=timezone.utc)

        # 1. Headline Metrics
        total_students = await self.profile_repo.count_students_by_tutor(tutor_id)
        sessions_today_count = await self.session_repo.count_sessions_for_tutor_in_range(
            tutor_id,
            start=start_of_day,
            end=end_of_day,
        )
        upcoming_count = await self.session_repo.count_upcoming_by_tutor(tutor_id, now=now_utc)

        summary = TutorDashboardSummary(
            total_students=total_students,
            sessions_today=sessions_today_count,
            upcoming_sessions=upcoming_count,
        )

        # 2. Today's Sessions (sorted ASC, eager-loaded relationships)
        today_entities = await self.session_repo.list_today_by_tutor(
            tutor_id=tutor_id,
            start_of_day=start_of_day,
            end_of_day=end_of_day,
            options=SESSION_DISPLAY_OPTIONS,
        )
        today_sessions = [self._map_session_item(s) for s in today_entities]

        # 3. Upcoming Sessions (next 5, sorted ASC)
        upcoming_entities = await self.session_repo.list_upcoming_by_tutor(
            tutor_id=tutor_id,
            now=now_utc,
            limit=5,
            options=SESSION_DISPLAY_OPTIONS,
        )
        upcoming_sessions = [self._map_session_item(s) for s in upcoming_entities]

        # 4. Students Needing Attention (e.g. sessions completed awaiting AI debrief)
        pending_debrief_sessions = await self.session_repo.list_recently_completed_without_review(
            tutor_id=tutor_id,
            limit=5,
            options=SESSION_DISPLAY_OPTIONS,
        )
        attention_items = [
            StudentsNeedingAttentionItem(
                student_profile_id=s.student_profile_id,
                student_name=s.student_name,
                reason="pending_debrief",
                session_id=s.id,
                topic=s.topic,
            )
            for s in pending_debrief_sessions
        ]

        # 5. Recent Sessions (last 5 completed/reviewed, sorted DESC)
        recent_entities = await self.session_repo.list_recent_by_tutor(
            tutor_id=tutor_id,
            limit=5,
            options=SESSION_DISPLAY_OPTIONS,
        )
        recent_sessions = [self._map_session_item(s) for s in recent_entities]

        # 6. Homework Summary (bounded query with session relationship)
        homework_tasks = await self.homework_repo.list_by_tutor(
            tutor_id=tutor_id,
            is_completed=False,
            limit=5,
            options=[joinedload(HomeworkTask.session).selectinload(Session.student_profile)],
        )

        recent_pending_hw: List[HomeworkTaskSummaryItem] = []
        for hw in homework_tasks:
            student_profile_id = hw.session.student_profile_id if hw.session else uuid.uuid4()
            student_name = hw.session.student_name if hw.session else "Student"
            recent_pending_hw.append(
                HomeworkTaskSummaryItem(
                    id=hw.id,
                    session_id=hw.session_id,
                    student_profile_id=student_profile_id,
                    student_name=student_name,
                    title=hw.title,
                    created_at=hw.created_at,
                )
            )

        homework_summary = TutorHomeworkSummary(
            total_pending=len(recent_pending_hw),
            recent_pending=recent_pending_hw,
        )

        return TutorDashboardResponse(
            summary=summary,
            today_sessions=today_sessions,
            upcoming_sessions=upcoming_sessions,
            students_needing_attention=attention_items,
            recent_sessions=recent_sessions,
            homework_summary=homework_summary,
        )

    @staticmethod
    def _map_session_item(session: Session) -> DashboardSessionItem:
        return DashboardSessionItem(
            id=session.id,
            student_profile_id=session.student_profile_id,
            student_name=session.student_name,
            topic=session.topic,
            scheduled_start=session.scheduled_start,
            scheduled_end=session.scheduled_end,
            status=session.status,
            meeting_url=session.meeting_url,
        )