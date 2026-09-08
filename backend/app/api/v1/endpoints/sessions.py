import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Query, status, Depends

from app.api.deps import CurrentUserDep, DBDep, RequireTutor
from app.models.session import SessionStatus
from app.repositories.session_repository import SessionRepository
from app.schemas.auth import MessageResponse
from app.schemas.session import (
    SessionCreateRequest,
    SessionDetailResponse,
    SessionNotesUpdateRequest,
    SessionResponse,
    SessionUpdateRequest,
    SessionQueryParams
)
from app.services.session_service import SessionService
from app.services.student_service import StudentService

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _get_session_service(db: DBDep) -> SessionService:
    """Helper factory for instantiating SessionService with injected dependencies."""
    return SessionService(
        session_repository=SessionRepository(session=db),
        db_session=db,
        student_service=StudentService(session=db),
    )


# =============================================================================
# 1. SCHEDULE SESSION (TUTOR ONLY)
# =============================================================================

@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new session with a student",
)
async def create_session(
    payload: SessionCreateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionResponse:
    """
    Schedules a new tutoring session:
    - Verifies student profile belongs to this tutor.
    - Validates scheduled_start < scheduled_end.
    - Performs double-booking collision check (plus DB-level GiST exclusion protection).
    - Status initialized strictly to SCHEDULED.
    """
    service = _get_session_service(db)
    session = await service.create_session(
        tutor_id=current_user.id,
        student_profile_id=payload.student_profile_id,
        topic=payload.topic,
        scheduled_start=payload.scheduled_start,
        scheduled_end=payload.scheduled_end,
        meeting_url=payload.meeting_url,
    )
    return SessionResponse.model_validate(session)


# =============================================================================
# 2. LIST SESSIONS (TUTOR OR STUDENT)
# =============================================================================

@router.get(
    "",
    response_model=List[SessionResponse],
    status_code=status.HTTP_200_OK,
    summary="List sessions for the current authenticated user",
)
async def list_sessions(
    db: DBDep,
    current_user: CurrentUserDep,
    filters: SessionQueryParams = Depends(),
) -> List[SessionResponse]:
    service = _get_session_service(db)
    sessions = await service.list_sessions(
        user=current_user,
        student_profile_id=filters.student_profile_id,
        status=filters.status,
        start=filters.start,
        end=filters.end,
        limit=filters.limit,
    )
    return [SessionResponse.model_validate(s) for s in sessions]


# =============================================================================
# 3. GET SINGLE SESSION DETAILS (TUTOR OR STUDENT)
# =============================================================================

@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single session details",
)
async def get_session(
    session_id: uuid.UUID,
    db: DBDep,
    current_user: CurrentUserDep,
) -> SessionResponse:
    """
    Fetches details for a single session.
    Enforces ownership:
    - Tutors must own the session.
    - Students must belong to the session's student profile.
    """
    service = _get_session_service(db)
    session = await service.get_session(
        session_id=session_id,
        user=current_user,
    )
    return SessionResponse.model_validate(session)


# =============================================================================
# 4. UPDATE SCHEDULED SESSION (TUTOR ONLY)
# =============================================================================

@router.patch(
    "/{session_id}",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update topic, time window, or meeting URL of a scheduled session",
)
async def update_session(
    session_id: uuid.UUID,
    payload: SessionUpdateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionResponse:
    """
    Updates a session's scheduling parameters:
    - Permitted ONLY when session status is SCHEDULED.
    - If timing is updated, re-evaluates double-booking overlaps (excluding this session).
    """
    service = _get_session_service(db)
    updated_session = await service.update_session(
        session_id=session_id,
        tutor_id=current_user.id,
        topic=payload.topic,
        scheduled_start=payload.scheduled_start,
        scheduled_end=payload.scheduled_end,
        meeting_url=payload.meeting_url,
        ai_plan=payload.ai_plan,  
    )
    return SessionResponse.model_validate(updated_session)


# =============================================================================
# 5. START SESSION (TUTOR ONLY)
# =============================================================================

@router.post(
    "/{session_id}/start",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transition session from SCHEDULED to IN_PROGRESS",
)
async def start_session(
    session_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionResponse:
    """
    Begins the live session:
    - Strictly enforces transition SCHEDULED -> IN_PROGRESS.
    - Records the current UTC timestamp as started_at.
    """
    service = _get_session_service(db)
    session = await service.start_session(
        session_id=session_id,
        tutor_id=current_user.id,
        now=datetime.now(),
    )
    return SessionResponse.model_validate(session)


# =============================================================================
# 6. LIVE NOTES AUTOSAVE (TUTOR ONLY)
# =============================================================================

@router.patch(
    "/{session_id}/notes",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update live lesson notes during the session",
)
async def update_notes(
    session_id: uuid.UUID,
    payload: SessionNotesUpdateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionResponse:
    """
    Autosaves tutor session notes:
    - Permitted ONLY while session status is IN_PROGRESS.
    - Once completed, notes become strictly read-only.
    - Idempotent for repeated identical payload calls.
    """
    service = _get_session_service(db)
    session = await service.update_notes(
        session_id=session_id,
        tutor_id=current_user.id,
        notes=payload.notes,
    )
    return SessionResponse.model_validate(session)


# =============================================================================
# 7. COMPLETE SESSION (TUTOR ONLY)
# =============================================================================

@router.post(
    "/{session_id}/complete",
    response_model=SessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transition session from IN_PROGRESS to COMPLETED",
)
async def complete_session(
    session_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> SessionResponse:
    """
    Finishes the live session:
    - Strictly enforces transition IN_PROGRESS -> COMPLETED.
    - Records current UTC timestamp as completed_at.
    - Does NOT mark AI_REVIEWED (AI debrief is a dedicated subsequent operation).
    """
    service = _get_session_service(db)
    session = await service.complete_session(
        session_id=session_id,
        tutor_id=current_user.id,
        now=datetime.now(),
    )
    return SessionResponse.model_validate(session)


# =============================================================================
# 8. DELETE SESSION (TUTOR ONLY)
# =============================================================================

@router.delete(
    "/{session_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Permanently delete a scheduled session",
)
async def delete_session(
    session_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> MessageResponse:
    """
    Removes a session:
    - Allowed strictly when status == SCHEDULED.
    - Active (IN_PROGRESS) or historical (COMPLETED / AI_REVIEWED) sessions cannot be deleted.
    """
    service = _get_session_service(db)
    await service.delete_session(
        session_id=session_id,
        tutor_id=current_user.id,
    )
    return MessageResponse(message="Scheduled session deleted successfully.")