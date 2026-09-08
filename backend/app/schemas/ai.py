"""Public API response schemas for AI operations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.session import SessionStatus
from app.schemas.homework import HomeworkTaskResponse


# =============================================================================
# 1. PRE-SESSION PLAN COMPONENT SCHEMAS
# =============================================================================

class LessonStepDetail(BaseModel):
    """Component step inside a session lesson plan."""
    model_config = ConfigDict(from_attributes=True)

    step: int = Field(..., ge=1, le=4)
    title: str
    duration_minutes: int
    description: str


class SessionPlanDetail(BaseModel):
    """Structured lesson plan payload stored on Session.ai_plan."""
    model_config = ConfigDict(from_attributes=True)

    learning_objectives: List[str]
    lesson_outline: List[LessonStepDetail]
    practice_questions: List[str]


# =============================================================================
# 2. POST-SESSION DEBRIEF RESPONSE
# =============================================================================

class SessionDebriefResponse(BaseModel):
    """Enriched response returned after generating a session debrief."""
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    status: SessionStatus
    ai_session_summary: str
    ai_suggested_focus: str
    homework_created: List[HomeworkTaskResponse] = Field(
        default_factory=list,
        description="Homework tasks created and attached to this session",
    )


# =============================================================================
# 3. STUDENT PROGRESS RESPONSE
# =============================================================================

class StudentProgressResponse(BaseModel):
    """Snapshot response for longitudinal student progress."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_profile_id: uuid.UUID
    overall_summary: str
    strengths: List[str]
    areas_to_improve: List[str]
    recommended_focus: str
    updated_at: datetime