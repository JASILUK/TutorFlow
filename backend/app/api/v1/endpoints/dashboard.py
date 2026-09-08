"""API endpoints for the Tutor Dashboard."""

from fastapi import APIRouter, status

from app.api.deps import DBDep, RequireTutor, RequireStudent
from app.schemas.dashboard import TutorDashboardResponse, StudentDashboardResponse
from app.services.tutor_dashboard_service import TutorDashboardService
from app.services.student_dashboard_service import StudentDashboardService

router = APIRouter()


@router.get(
    "/tutor",
    response_model=TutorDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated tutor dashboard data",
)
async def get_tutor_dashboard(
    db: DBDep,
    current_user: RequireTutor,
) -> TutorDashboardResponse:
    """
    Returns the tutor's dashboard view:
    - Today's teaching schedule
    - Upcoming sessions
    - Workload summary metrics
    - Attention queue
    - Assigned homework snapshot
    """
    service = TutorDashboardService(db)
    return await service.get_dashboard(tutor_id=current_user.id)





@router.get(
    "/student",
    response_model=StudentDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated student dashboard data",
)
async def get_student_dashboard(
    db: DBDep,
    current_user: RequireStudent,
) -> StudentDashboardResponse:
    """
    Returns the student's dashboard view:
    - Next upcoming or active session
    - Pending homework list & count
    - Persisted learning progress snapshot
    - Recent completed session review
    """
    service = StudentDashboardService(db)
    return await service.get_dashboard(user_id=current_user.id)