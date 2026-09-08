"""Response schemas for the Tutor Dashboard."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.session import SessionStatus





class TutorDashboardSummary(BaseModel):
    """Headline metrics for the tutor's active workload."""

    model_config = ConfigDict(from_attributes=True)

    total_students: int = Field(..., ge=0, description="Total active students on tutor roster.")
    sessions_today: int = Field(..., ge=0, description="Number of sessions scheduled for today.")
    upcoming_sessions: int = Field(..., ge=0, description="Total active upcoming sessions.")


class DashboardSessionItem(BaseModel):
    """Compact session item for dashboard timelines."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_profile_id: uuid.UUID
    student_name: str
    topic: str
    scheduled_start: datetime
    scheduled_end: datetime
    status: SessionStatus
    meeting_url: Optional[str] = None


class StudentsNeedingAttentionItem(BaseModel):
    """Actionable alert for student-related tasks."""

    model_config = ConfigDict(from_attributes=True)

    student_profile_id: uuid.UUID
    student_name: str
    reason: str = Field(..., description="Action category (e.g. pending_debrief).")
    session_id: Optional[uuid.UUID] = None
    topic: Optional[str] = None


class HomeworkTaskSummaryItem(BaseModel):
    """Compact homework task entry for tutor dashboard."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    student_profile_id: uuid.UUID
    student_name: str
    title: str
    created_at: datetime


class TutorHomeworkSummary(BaseModel):
    """High-level homework metrics for assigned work."""

    model_config = ConfigDict(from_attributes=True)

    total_pending: int = Field(..., ge=0)
    recent_pending: List[HomeworkTaskSummaryItem] = Field(default_factory=list)


class TutorDashboardResponse(BaseModel):
    """Consolidated response payload for GET /api/v1/tutor/dashboard."""

    model_config = ConfigDict(from_attributes=True)

    summary: TutorDashboardSummary
    today_sessions: List[DashboardSessionItem] = Field(default_factory=list)
    upcoming_sessions: List[DashboardSessionItem] = Field(default_factory=list)
    students_needing_attention: List[StudentsNeedingAttentionItem] = Field(default_factory=list)
    recent_sessions: List[DashboardSessionItem] = Field(default_factory=list)
    homework_summary: TutorHomeworkSummary





# student dashboard schema

class StudentNextSessionItem(BaseModel):
    """Next upcoming or active session for the student."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic: str
    scheduled_start: datetime
    scheduled_end: datetime
    tutor_name: str
    status: SessionStatus
    meeting_url: Optional[str] = None


class StudentRecentSessionItem(BaseModel):
    """Past completed or reviewed session for review."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic: str
    scheduled_start: datetime
    scheduled_end: datetime
    tutor_name: str
    status: SessionStatus
    meeting_url: Optional[str] = None


class StudentDashboardHomeworkItem(BaseModel):
    """Individual pending homework task."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    title: str
    description: str
    is_completed: bool
    created_at: datetime


class StudentDashboardHomework(BaseModel):
    """Pending homework snapshot for the student dashboard."""

    model_config = ConfigDict(from_attributes=True)

    pending_count: int = Field(..., ge=0)
    recent: List[StudentDashboardHomeworkItem] = Field(default_factory=list)


class StudentDashboardProgress(BaseModel):
    """Persisted learning progress snapshot without running AI generation."""

    model_config = ConfigDict(from_attributes=True)

    total_sessions_completed: int = Field(..., ge=0)
    latest_ai_focus: Optional[str] = None


class StudentDashboardResponse(BaseModel):
    """Consolidated response payload for GET /api/v1/student/dashboard."""

    model_config = ConfigDict(from_attributes=True)

    next_session: Optional[StudentNextSessionItem] = None
    homework: StudentDashboardHomework
    progress: StudentDashboardProgress
    recent_sessions: List[StudentRecentSessionItem] = Field(default_factory=list)