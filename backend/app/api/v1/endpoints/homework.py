import uuid
from typing import Optional

from fastapi import APIRouter, Query, status
from sqlalchemy.orm import joinedload

from app.api.deps import CurrentUserDep, DBDep, RequireStudent, RequireTutor
from app.models.homework import HomeworkTask
from app.models.user import UserRole
from app.repositories.homework_repository import HomeworkRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.auth import MessageResponse
from app.schemas.homework import (
    HomeworkCompleteRequest,
    HomeworkCreateRequest,
    HomeworkDashboardResponse,
    HomeworkSummaryCounts,
    HomeworkTaskResponse,
    HomeworkUpdateRequest,
)
from app.services.homework_service import HomeworkService
from app.services.session_service import SessionService
from app.services.student_service import StudentService

router = APIRouter(prefix="/homework", tags=["Homework"])


def _get_homework_service(db: DBDep) -> HomeworkService:
    """Instantiate and inject all required collaborators for HomeworkService."""
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
# 1. TUTOR GLOBAL & FILTERED HOMEWORK (Used in Nav, Student Tab, & Session)
# =============================================================================

@router.get(
    "",
    response_model=HomeworkDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get homework list with counts for tutors (filterable by student, session, status)",
)
async def list_tutor_homework(
    db: DBDep,
    current_user: RequireTutor,
    student_profile_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Filter tasks for a specific student (used in Student Detail > Homework tab)",
    ),
    session_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Filter tasks for a specific session (used in Session workspace)",
    ),
    is_completed: Optional[bool] = Query(
        default=None,
        description="Filter by completion status: true (completed) or false (pending)",
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Items to return"),
    offset: Optional[int] = Query(default=None, ge=0, description="Offset for pagination"),
) -> HomeworkDashboardResponse:
    """
    Tutor-facing homework dashboard and contextual list:
    1. Global Navbar: retrieves tasks across all students.
    2. Student Detail: retrieves tasks for a specific student with accurate metrics.
    3. Session Workspace: retrieves tasks assigned during that exact session.
    """
    service = _get_homework_service(db)
    repo = service.repo
    options = [joinedload(HomeworkTask.session)]

    # Case A: Inside a specific session workspace
    if session_id is not None:
        tasks = await service.list_homework_by_session(
            session_id=session_id,
            user=current_user,
            is_completed=is_completed,
            limit=limit,
            options=options,
        )
        total = len(tasks)
        completed = sum(1 for t in tasks if t.is_completed)
        counts = HomeworkSummaryCounts(
            total=total,
            pending_count=total - completed,
            completed_count=completed,
        )
    # Case B: Filtered by student or global tutor roster
    else:
        tasks = await service.list_homework_by_tutor(
            tutor_id=current_user.id,
            student_profile_id=student_profile_id,
            is_completed=is_completed,
            limit=limit,
            offset=offset,
            options=options,
        )

        if student_profile_id is not None:
            total = await repo.count_by_student(student_profile_id)
            pending = await repo.count_by_student(student_profile_id, is_completed=False)
            completed = await repo.count_by_student(student_profile_id, is_completed=True)
        else:
            all_tutor_tasks = await repo.list_by_tutor(tutor_id=current_user.id, limit=200)
            total = len(all_tutor_tasks)
            completed = sum(1 for t in all_tutor_tasks if t.is_completed)
            pending = total - completed

        counts = HomeworkSummaryCounts(
            total=total,
            pending_count=pending,
            completed_count=completed,
        )

    return HomeworkDashboardResponse(
        counts=counts,
        items=[HomeworkTaskResponse.model_validate(t) for t in tasks],
    )


# =============================================================================
# 2. STUDENT PORTAL "MY HOMEWORK" (Student Only)
# =============================================================================

@router.get(
    "/my",
    response_model=HomeworkDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get student's own homework list and counters (supports session filtering)",
)
async def list_my_homework(
    db: DBDep,
    current_user: RequireStudent,
    session_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Filter homework for a specific session (used in Student Session Detail)",
    ),
    is_completed: Optional[bool] = Query(default=None, description="Filter by true/false"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: Optional[int] = Query(default=None, ge=0),
) -> HomeworkDashboardResponse:
    """
    Dedicated endpoint for students visiting their homework portal or session detail page.
    Derives student identity securely from the token.
    """
    service = _get_homework_service(db)
    student_profile = await service.student_service.get_profile_by_user_id(current_user.id)
    if not student_profile:
        return HomeworkDashboardResponse(
            counts=HomeworkSummaryCounts(total=0, pending_count=0, completed_count=0),
            items=[],
        )

    options = [joinedload(HomeworkTask.session)]

    # Case A: Filtered by specific session
    if session_id is not None:
        tasks = await service.list_homework_by_session(
            session_id=session_id,
            user=current_user,
            is_completed=is_completed,
            limit=limit,
            options=options,
        )
        total = len(tasks)
        completed = sum(1 for t in tasks if t.is_completed)
        counts = HomeworkSummaryCounts(
            total=total,
            pending_count=total - completed,
            completed_count=completed,
        )
    # Case B: All homework for this student
    else:
        tasks = await service.list_homework_by_student(
            student_profile_id=student_profile.id,
            is_completed=is_completed,
            limit=limit,
            offset=offset,
            options=options,
        )
        total = await service.count_student_homework(student_profile_id=student_profile.id)
        pending = await service.count_student_homework(student_profile_id=student_profile.id, is_completed=False)
        completed = await service.count_student_homework(student_profile_id=student_profile.id, is_completed=True)
        counts = HomeworkSummaryCounts(
            total=total,
            pending_count=pending,
            completed_count=completed,
        )

    return HomeworkDashboardResponse(
        counts=counts,
        items=[HomeworkTaskResponse.model_validate(t) for t in tasks],
    )


# =============================================================================
# 3. GET SINGLE HOMEWORK ITEM
# =============================================================================

@router.get(
    "/{homework_id}",
    response_model=HomeworkTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single homework task details",
)
async def get_homework(
    homework_id: uuid.UUID,
    db: DBDep,
    current_user: CurrentUserDep,
) -> HomeworkTaskResponse:
    """
    Retrieves task details with eager-loaded session topic and scheduled time.
    Enforces tutor or student ownership via SQL joins.
    """
    service = _get_homework_service(db)
    task = await service.get_homework(
        homework_id=homework_id,
        user=current_user,
        options=[joinedload(HomeworkTask.session)],
    )
    return HomeworkTaskResponse.model_validate(task)


# =============================================================================
# 4. TASK COMPLETION TOGGLE (Students & Tutors)
# =============================================================================

@router.patch(
    "/{homework_id}/complete",
    response_model=HomeworkTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle task completion status (Checkbox)",
)
async def toggle_homework_complete(
    homework_id: uuid.UUID,
    payload: HomeworkCompleteRequest,
    db: DBDep,
    current_user: CurrentUserDep,
) -> HomeworkTaskResponse:
    """
    Checkbox action:
    - Students can toggle tasks assigned to them.
    - Tutors can toggle/review tasks attached to their sessions.
    """
    service = _get_homework_service(db)

    if current_user.role == UserRole.STUDENT:
        student_profile = await service.student_service.get_profile_by_user_id(current_user.id)
        if not student_profile:
            return HomeworkTaskResponse.model_validate(
                await service.get_homework_for_student(
                    homework_id=homework_id,
                    student_profile_id=uuid.uuid4(),  # Triggers domain HomeworkNotFoundError
                )
            )
        task = await service.complete_homework(
            homework_id=homework_id,
            student_profile_id=student_profile.id,
            is_completed=payload.is_completed,
        )
    else:
        task = await service.get_homework_for_tutor(
            homework_id=homework_id,
            tutor_id=current_user.id,
        )
        task = await service.repo.set_completed(task.id, completed=payload.is_completed)
        await service.db.commit()
        await service.db.refresh(task)

    # Re-fetch with session details populated for UI card consistency
    detailed_task = await service.repo.get_by_id(
        task.id,
        options=[joinedload(HomeworkTask.session)],
    )
    return HomeworkTaskResponse.model_validate(detailed_task or task)


# =============================================================================
# 5. CREATE HOMEWORK (Tutors Only)
# =============================================================================

@router.post(
    "",
    response_model=HomeworkTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a homework task under a session",
)
async def create_homework(
    payload: HomeworkCreateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> HomeworkTaskResponse:
    """Creates a new homework task and links it to a tutor's session."""
    service = _get_homework_service(db)
    task = await service.create_homework(
        tutor_id=current_user.id,
        payload=payload,
    )
    detailed_task = await service.repo.get_by_id(
        task.id,
        options=[joinedload(HomeworkTask.session)],
    )
    return HomeworkTaskResponse.model_validate(detailed_task or task)


# =============================================================================
# 6. UPDATE HOMEWORK (Tutors Only)
# =============================================================================

@router.patch(
    "/{homework_id}",
    response_model=HomeworkTaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Update homework task title or description",
)
async def update_homework(
    homework_id: uuid.UUID,
    payload: HomeworkUpdateRequest,
    db: DBDep,
    current_user: RequireTutor,
) -> HomeworkTaskResponse:
    """Updates task instructions or title. Only owning tutors can edit."""
    service = _get_homework_service(db)
    task = await service.update_homework(
        homework_id=homework_id,
        tutor_id=current_user.id,
        payload=payload,
    )
    detailed_task = await service.repo.get_by_id(
        task.id,
        options=[joinedload(HomeworkTask.session)],
    )
    return HomeworkTaskResponse.model_validate(detailed_task or task)


# =============================================================================
# 7. DELETE HOMEWORK (Tutors Only)
# =============================================================================

@router.delete(
    "/{homework_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a homework task",
)
async def delete_homework(
    homework_id: uuid.UUID,
    db: DBDep,
    current_user: RequireTutor,
) -> MessageResponse:
    """Permanently deletes a task. Restricted to the owning tutor."""
    service = _get_homework_service(db)
    await service.delete_homework(
        homework_id=homework_id,
        tutor_id=current_user.id,
    )
    return MessageResponse(message="Homework task deleted successfully.")