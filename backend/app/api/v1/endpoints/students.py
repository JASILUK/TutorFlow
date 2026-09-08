import uuid
from typing import Optional

from fastapi import APIRouter, Query, status

from app.api.deps import DBDep, RequireTutor
from app.schemas.auth import MessageResponse
from app.schemas.student import (
    PaginatedStudentResponse,
    StudentCreateRequest,
    StudentProfileResponse,
    StudentStatusUpdateRequest,
    StudentUpdateRequest,
    StudentOverviewResponse
)
from app.schemas.ai import StudentProgressResponse
from app.services.student_service import StudentService
from app.services.student_overview_service import StudentOverviewService

router = APIRouter(prefix="/students", tags=["Students"])


# =============================================================================
# 1. CREATE STUDENT & PROFILE
# =============================================================================

@router.post(
    "",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student user and linked academic profile",
)
async def create_student(
    payload: StudentCreateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> StudentProfileResponse:
    """
    Tutor creates a student account and an academic profile under their management.
    Restricted to authenticated tutors.
    """
    service = StudentService(db)
    profile = await service.create_student_with_profile(
        tutor_id=current_user.id,
        payload=payload,
    )
    return StudentProfileResponse.model_validate(profile)


# =============================================================================
# 2. LIST TUTOR'S STUDENTS (PAGINATED + SEARCH)
# =============================================================================

@router.get(
    "",
    response_model=PaginatedStudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get paginated list of students managed by the tutor",
)
async def list_students(
    db: DBDep,
    current_user: RequireTutor,
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    subject: Optional[str] = Query(default=None, description="Filter by subject"),
    search: Optional[str] = Query(default=None, description="Search student name or email"),
) -> PaginatedStudentResponse:
    """
    Returns a paginated list of students belonging to the authenticated tutor.
    Supports filtering by subject and full-text substring search across names and emails.
    """
    service = StudentService(db)
    items, total, total_pages = await service.get_tutor_students(
        tutor_id=current_user.id,
        page=page,
        page_size=page_size,
        subject=subject,
        search=search,
    )

    return PaginatedStudentResponse(
        items=[StudentProfileResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# =============================================================================
# 3. GET SINGLE STUDENT PROFILE
# =============================================================================

@router.get(
    "/{profile_id}",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get detailed student profile by profile ID",
)
async def get_student(
    profile_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> StudentProfileResponse:
    """
    Fetches details for a single student.
    Enforces authorization: raises 403 if the student belongs to another tutor.
    """
    service = StudentService(db)
    profile = await service.get_student_details(
        profile_id=profile_id,
        tutor_id=current_user.id,
    )
    return StudentProfileResponse.model_validate(profile)


# =============================================================================
# 4. UPDATE STUDENT ACADEMIC INFO
# =============================================================================

@router.patch(
    "/{profile_id}",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update academic fields or student full name",
)
async def update_student(
    profile_id: uuid.UUID,
    payload: StudentUpdateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> StudentProfileResponse:
    """
    Partially updates a student's profile (weak areas, goals, level, subject)
    or their user account name.
    """
    service = StudentService(db)
    profile = await service.update_student(
        profile_id=profile_id,
        tutor_id=current_user.id,
        payload=payload,
    )
    return StudentProfileResponse.model_validate(profile)


# =============================================================================
# 5. TOGGLE ACTIVE STATUS (ACTIVATE / DEACTIVATE)
# =============================================================================

@router.patch(
    "/{profile_id}/status",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate a student account",
)
async def set_student_status(
    profile_id: uuid.UUID,
    payload: StudentStatusUpdateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> StudentProfileResponse:
    """
    Toggles a student account status.
    Deactivating revokes all active refresh tokens for the student immediately.
    """
    service = StudentService(db)
    profile = await service.toggle_student_status(
        profile_id=profile_id,
        tutor_id=current_user.id,
        is_active=payload.is_active,
    )
    return StudentProfileResponse.model_validate(profile)


# =============================================================================
# 6. PERMANENT DELETE (CASCADE)
# =============================================================================

@router.delete(
    "/{profile_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Permanently delete student account and cascade profile",
)
async def delete_student(
    profile_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> MessageResponse:
    """
    Deletes the underlying student User record.
    Foreign key cascading automatically wipes out profile, tokens, and sessions.
    """
    service = StudentService(db)
    await service.delete_student(
        profile_id=profile_id,
        tutor_id=current_user.id,
    )
    return MessageResponse(message="Student account and profile deleted successfully.")



@router.get(
    "/{profile_id}/overview",
    response_model=StudentOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated student overview dashboard",
)
async def get_student_overview(
    profile_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> StudentOverviewResponse:
    """
    Returns a unified overview dashboard for a student:
    - Profile information & learning goals
    - Next upcoming session
    - Up to 3 recent past completed sessions
    - Incomplete homework tasks
    - Summary metrics

    Accessible by:
    - The tutor who manages the student.
    - The student who owns the profile.
    """
    service = StudentOverviewService(db)
    return await service.get_student_overview(
        student_profile_id=profile_id,
        current_user=current_user,
    )


@router.get(
    "/{student_id}/progress",
    response_model=Optional[StudentProgressResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current AI progress snapshot for student",
)
async def get_student_progress(
    student_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> Optional[StudentProgressResponse]:
    """Retrieve existing progress snapshot without triggering any AI generation."""
    student_service = StudentService(session=db)
    progress = await student_service.get_student_progress(
        student_profile_id=student_id,
        tutor_id=current_user.id,
    )
    if not progress:
        return None

    return StudentProgressResponse.model_validate(progress)