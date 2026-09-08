"""API endpoints for TutorFlow AI operations."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, status
from sqlalchemy.orm import joinedload

from app.api.deps import  RequireTutor, DBDep
from app.models.homework import HomeworkTask
from app.repositories.homework_repository import HomeworkRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.ai import SessionDebriefResponse, StudentProgressResponse
from app.schemas.homework import HomeworkTaskResponse
from app.schemas.session import SessionResponse
from app.services.ai_service import AIService
from app.services.homework_service import HomeworkService
from app.services.session_service import SessionService
from app.services.student_service import StudentService

router = APIRouter(prefix="/ai", tags=["AI Operations"])


def _get_ai_service(db: DBDep) -> AIService:
    return AIService(db=db)


def _get_homework_service(db: DBDep) -> HomeworkService:
    student_service = StudentService(session=db)
    session_service = SessionService(
        session_repository=SessionRepository(session=db),
        db_session=db,
        student_service=student_service,
    )
    return HomeworkService(
        homework_repository=HomeworkRepository(session=db),
        session_service=session_service,
        student_service=student_service,
        db_session=db,
    )


# =============================================================================
# 1. GENERATE LESSON PLAN
# =============================================================================

@router.post(
    "/sessions/{session_id}/plan",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate pre-session AI lesson plan",
)
async def generate_session_plan(
    session_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionResponse:
    """Generates an AI lesson plan and saves it into Session.ai_plan."""
    ai_service = _get_ai_service(db)
    session = await ai_service.generate_session_plan(
        session_id=session_id,
        tutor_id=current_user.id,
    )
    return SessionResponse.model_validate(session)


# =============================================================================
# 2. GENERATE SESSION DEBRIEF & HOMEWORK
# =============================================================================

@router.post(
    "/sessions/{session_id}/debrief",
    response_model=SessionDebriefResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate post-session AI debrief and homework tasks",
)
async def generate_session_debrief(
    session_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionDebriefResponse:
    """Analyzes tutor notes, creates homework, and transitions to AI_REVIEWED."""
    ai_service = _get_ai_service(db)
    homework_service = _get_homework_service(db)

    session = await ai_service.generate_session_debrief(
        session_id=session_id,
        tutor_id=current_user.id,
        homework_service=homework_service,
    )

    # Fetch created tasks with session joined for full response
    tasks = await homework_service.repo.list_by_session(
        session_id=session.id,
        options=[joinedload(HomeworkTask.session)],
    )

    return SessionDebriefResponse(
        session_id=session.id,
        status=session.status,
        ai_session_summary=session.ai_session_summary or "",
        ai_suggested_focus=session.ai_suggested_focus or "",
        homework_created=[HomeworkTaskResponse.model_validate(t) for t in tasks],
    )


# =============================================================================
# 3. GENERATE STUDENT PROGRESS
# =============================================================================

@router.post(
    "/students/{student_id}/progress-summary",
    response_model=StudentProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate longitudinal AI student progress analysis",
)
async def generate_student_progress(
    student_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> StudentProgressResponse:
    """Synthesizes student's past completed sessions into a progress snapshot."""
    ai_service = _get_ai_service(db)
    progress = await ai_service.generate_student_progress(
        student_profile_id=student_id,
        tutor_id=current_user.id,
    )
    return StudentProgressResponse.model_validate(progress)