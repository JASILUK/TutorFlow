"""Domain orchestration service for TutorFlow AI operations."""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import AIClient
from app.ai.context import (
    build_session_debrief_context,
    build_session_plan_context,
    build_student_progress_context,
)
from app.ai.prompts.progress import PROGRESS_SYSTEM_PROMPT, build_progress_user_prompt
from app.ai.prompts.session_debrief import (
    SESSION_DEBRIEF_SYSTEM_PROMPT,
    build_session_debrief_user_prompt,
)
from app.ai.prompts.session_plan import (
    SESSION_PLAN_SYSTEM_PROMPT,
    build_session_plan_user_prompt,
)
from app.ai.providers import get_ai_client
from app.ai.schemas import ProgressOutput, SessionDebriefOutput, SessionPlanOutput
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    SessionNotEditableError,
)
from app.models.session import Session, SessionStatus
from app.models.student_progress import StudentProgress
from app.repositories.session_repository import SessionRepository
from app.repositories.student_repository import StudentProfileRepository
from app.repositories.student_progress_repository import StudentProgressRepository
from app.services.homework_service import HomeworkService
from app.services.session_service import SESSION_DISPLAY_OPTIONS
from app.services.student_service import StudentService

logger = logging.getLogger(__name__)


class AIService:
    """Coordinates AI context building, provider execution, and entity persistence.

    Ensures zero database connection locking during external LLM network I/O.
    """

    def __init__(
        self,
        db: AsyncSession,
        ai_client: Optional[AIClient] = None,
    ) -> None:
        self.db = db
        self.ai_client: AIClient = ai_client or get_ai_client()
        self.session_repo = SessionRepository(db)
        self.profile_repo = StudentProfileRepository(db)
        self.progress_repo = StudentProgressRepository(db)
        self.student_service = StudentService(session=db)

    # =========================================================================
    # 1. PRE-SESSION LESSON PLAN
    # =========================================================================

    async def generate_session_plan(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> Session:
        """Generate a structured lesson plan and persist it to Session.ai_plan.

        - Verifies tutor ownership and session state (SCHEDULED or IN_PROGRESS).
        - Executes LLM call outside open transactions.
        - Updates Session.ai_plan without modifying session status.
        """
        session = await self.session_repo.get_by_id_for_tutor(
            session_id=session_id,
            tutor_id=tutor_id,
            options=SESSION_DISPLAY_OPTIONS,
        )
        if not session:
            raise NotFoundException(resource_name="Session", identifier=session_id)

        if session.status not in (SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS):
            raise SessionNotEditableError(
                f"AI lesson plans can only be generated for scheduled or in-progress sessions "
                f"(current status: '{session.status.value}')."
            )

        profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=session.student_profile_id,
            include_student_user=True,
        )
        if not profile:
            raise NotFoundException(
                resource_name="StudentProfile",
                identifier=session.student_profile_id,
            )

        recent_sessions = await self.session_repo.list_recent_by_student(
            student_profile_id=profile.id,
            limit=4,
        )

        # Build sanitized pedagogical context
        context = build_session_plan_context(
            session=session,
            profile=profile,
            recent_sessions=recent_sessions,
        )

        system_prompt = SESSION_PLAN_SYSTEM_PROMPT
        user_prompt = build_session_plan_user_prompt(context)

        # External AI network call (no open DB transaction held)
        plan_output: SessionPlanOutput = await self.ai_client.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=SessionPlanOutput,
            temperature=0.2,
        )

        # Atomic persistence of structured JSONB plan
        await self.session_repo.update(
            session_id=session.id,
            values={"ai_plan": plan_output.model_dump()},
        )
        await self.db.commit()

        hydrated = await self.session_repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
        return hydrated or session

    # =========================================================================
    # 2. POST-SESSION DEBRIEF & HOMEWORK GENERATION
    # =========================================================================

    async def generate_session_debrief(
        self,
        *,
        session_id: uuid.UUID,
        tutor_id: uuid.UUID,
        homework_service: HomeworkService,
    ) -> Session:
        """Synthesize notes, generate homework, and transition session to AI_REVIEWED.

        - Verifies COMPLETED state and non-empty notes.
        - Calls AI for summary, next focus, and homework recommendations.
        - Persists debrief and creates homework tasks atomically.
        - Transitions state to AI_REVIEWED only after successful persistence.
        """
        session = await self.session_repo.get_by_id_for_tutor(
            session_id=session_id,
            tutor_id=tutor_id,
            options=SESSION_DISPLAY_OPTIONS,
        )
        if not session:
            raise NotFoundException(resource_name="Session", identifier=session_id)

        # Idempotency guard: already debriefed sessions return immediately
        if session.status == SessionStatus.AI_REVIEWED:
            return session

        if session.status != SessionStatus.COMPLETED:
            raise SessionNotEditableError(
                f"Debrief requires COMPLETED state (current: '{session.status.value}')."
            )

        if not session.notes or not session.notes.strip():
            raise BadRequestException(
                "Cannot generate AI debrief without tutor notes. Please add session notes first."
            )

        profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=session.student_profile_id,
            include_student_user=True,
        )
        if not profile:
            raise NotFoundException(
                resource_name="StudentProfile",
                identifier=session.student_profile_id,
            )

        # Build sanitized debrief context
        context = build_session_debrief_context(
            session=session,
            profile=profile,
        )

        system_prompt = SESSION_DEBRIEF_SYSTEM_PROMPT
        user_prompt = build_session_debrief_user_prompt(context)

        # External AI network call
        debrief_output: SessionDebriefOutput = await self.ai_client.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=SessionDebriefOutput,
            temperature=0.2,
        )

        # Atomic transaction boundary: update debrief fields, status, and batch homework
        try:
            await self.session_repo.update(
                session_id=session.id,
                values={
                    "ai_session_summary": debrief_output.summary,
                    "ai_suggested_focus": debrief_output.next_session_focus,
                    "status": SessionStatus.AI_REVIEWED,
                },
            )

            # Persist recommended homework via existing HomeworkService
            if debrief_output.homework:
                formatted_tasks = [
                    {"title": hw.title, "description": hw.description}
                    for hw in debrief_output.homework
                ]
                await homework_service.create_homework_many(
                    session_id=session.id,
                    tutor_id=tutor_id,
                    tasks=formatted_tasks,
                    student_profile_id=session.student_profile_id,
                )

            await self.db.commit()

            hydrated = await self.session_repo.get_by_id(session.id, options=SESSION_DISPLAY_OPTIONS)
            return hydrated or session

        except Exception as exc:
            await self.db.rollback()
            logger.error("Failed committing debrief for session %s: %s", session_id, exc, exc_info=True)
            raise

    # =========================================================================
    # 3. LONGITUDINAL STUDENT PROGRESS
    # =========================================================================

    async def generate_student_progress(
        self,
        *,
        student_profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> StudentProgress:
        """Synthesize completed lesson history into a persistent StudentProgress snapshot.

        - Validates multi-tenant tutor ownership over the student profile.
        - Bounded query loading up to 15 completed/reviewed sessions.
        - Performs an atomic upsert on the student_progress table.
        """
        belongs = await self.student_service.verify_student_belongs_to_tutor(
            student_profile_id=student_profile_id,
            tutor_id=tutor_id,
        )
        if not belongs:
            raise NotFoundException(
                resource_name="StudentProfile",
                identifier=student_profile_id,
            )

        profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=student_profile_id,
            include_student_user=True,
        )
        if not profile:
            raise NotFoundException(
                resource_name="StudentProfile",
                identifier=student_profile_id,
            )

        # Retrieve completed learning history
        completed_sessions = await self.session_repo.list_recent_by_student(
            student_profile_id=student_profile_id,
            limit=15,
        )
        if not completed_sessions:
            raise BadRequestException(
                "Cannot generate progress summary: student has no completed tutoring sessions."
            )

        # Build longitudinal context
        context = build_student_progress_context(
            profile=profile,
            completed_sessions=completed_sessions,
        )

        system_prompt = PROGRESS_SYSTEM_PROMPT
        user_prompt = build_progress_user_prompt(context)

        # External AI network call
        progress_output: ProgressOutput = await self.ai_client.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=ProgressOutput,
            temperature=0.2,
        )

        # Atomic upsert into dedicated student_progress table
        progress_record = await self.progress_repo.upsert_progress(
            student_profile_id=student_profile_id,
            overall_summary=progress_output.summary,
            strengths=progress_output.strengths,
            areas_to_improve=progress_output.areas_to_improve,
            recommended_focus=progress_output.recommended_focus,
        )
        await self.db.commit()

        return progress_record