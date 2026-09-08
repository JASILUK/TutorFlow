from fastapi import APIRouter

from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.homework import router as homework_router
from app.api.v1.endpoints.sessions import router as session_router
from app.api.v1.endpoints.students import router as student_router
from app.api.v1.endpoints.google_auth import router as google_auth_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(student_router)
api_router.include_router(session_router)
api_router.include_router(homework_router)
api_router.include_router(
    dashboard_router,
    prefix="/dashboard",
    tags=["Dashboard"],
)
api_router.include_router(ai_router)
api_router.include_router(google_auth_router)