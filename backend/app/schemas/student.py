import uuid
from datetime import datetime
from typing import List, Optional,Any, Dict
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.auth import UserResponse
from app.models.session import SessionStatus
from app.schemas.session import SessionResponse


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class StudentCreateRequest(BaseModel):
    """Payload used by a tutor to register a new student and their profile."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    subject: str = Field(..., min_length=2, max_length=100)
    current_level: str = Field(..., min_length=1, max_length=50)
    learning_goals: str = Field(default="", max_length=2000)
    weak_areas: str = Field(default="", max_length=2000)


class StudentUpdateRequest(BaseModel):
    """Payload to update an existing student's academic profile or name."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    subject: Optional[str] = Field(None, min_length=2, max_length=100)
    current_level: Optional[str] = Field(None, min_length=1, max_length=50)
    learning_goals: Optional[str] = Field(None, max_length=2000)
    weak_areas: Optional[str] = Field(None, max_length=2000)


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class StudentProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tutor_id: uuid.UUID
    subject: str
    current_level: str
    learning_goals: str
    weak_areas: str
    created_at: datetime
    updated_at: datetime
    student_user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedStudentResponse(BaseModel):
    items: List[StudentProfileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StudentStatusUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Set true to activate, false to deactivate")






class OverviewStudentSummary(BaseModel):
    """Academic and personal details of the student."""
    model_config = ConfigDict(from_attributes=True)

    profile_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    subject: str
    current_level: str
    learning_goals: str
    weak_areas: str


class OverviewHomeworkTaskSummary(BaseModel):
    """Minimal homework summary for the overview screen."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    is_completed: bool
    due_date: Optional[datetime] = None


class OverviewMetrics(BaseModel):
    """Aggregated operational metrics for quick scanning."""
    total_sessions_completed: int
    pending_homework_count: int
    latest_ai_focus: Optional[str] = None


class StudentOverviewResponse(BaseModel):
    """
    Consolidated student overview payload returned in 1 network call.
    """
    student: OverviewStudentSummary
    metrics: OverviewMetrics
    next_session: Optional[SessionResponse] = None
    recent_sessions: List[SessionResponse] = []
    pending_homework: List[OverviewHomeworkTaskSummary] = []