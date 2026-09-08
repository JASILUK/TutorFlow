import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.session import SessionStatus

from fastapi import Depends, Query
from app.core.exceptions import InvalidSessionTimeError




# =============================================================================
# NESTED USER & PROFILE RELATION SCHEMAS (Avoids Extra Roundtrips)
# =============================================================================

class SessionUserSummary(BaseModel):
    """Minimal user summary embedded inside session responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str


class SessionStudentProfileSummary(BaseModel):
    """Academic profile summary of the student linked to this session."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    subject: str
    current_level: str
    student_user: Optional[SessionUserSummary] = None


# =============================================================================
# REQUEST SCHEMAS (Inputs)
# =============================================================================

class SessionCreateRequest(BaseModel):
    """
    Payload to schedule a brand new session.
    Status starts strictly as SCHEDULED.
    """
    student_profile_id: uuid.UUID = Field(
        ...,
        description="UUID of the student profile (must belong to the authenticated tutor's roster).",
    )
    topic: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Core subject or lesson objective for this session.",
        examples=["Trigonometry - Law of Sines & Cosines"],
    )
    scheduled_start: datetime = Field(
        ...,
        description="Timezone-aware start timestamp (UTC normalized).",
    )
    scheduled_end: datetime = Field(
        ...,
        description="Timezone-aware end timestamp (UTC normalized).",
    )
    meeting_url: Optional[str] = Field(
        None,
        max_length=2048,
        description="External meeting URL (Google Meet, Zoom, MS Teams).",
        examples=["https://meet.google.com/abc-defg-hij"],
    )

    @model_validator(mode="after")
    def validate_time_range(self) -> "SessionCreateRequest":
        if self.scheduled_start >= self.scheduled_end:
            raise ValueError("scheduled_start must be earlier than scheduled_end.")
        return self


class SessionUpdateRequest(BaseModel):
    topic: Optional[str] = Field(None, min_length=1, max_length=200)
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    meeting_url: Optional[str] = Field(None, max_length=2048)
    ai_plan: Optional[Dict[str, Any]] = Field(
        None,
        description="Customized or edited lesson plan payload",
    )

    @model_validator(mode="after")
    def validate_time_range(self) -> "SessionUpdateRequest":
        if self.scheduled_start is not None and self.scheduled_end is not None:
            if self.scheduled_start >= self.scheduled_end:
                raise ValueError("scheduled_start must be earlier than scheduled_end.")
        return self


class SessionNotesUpdateRequest(BaseModel):
    """
    Payload for live note-taking autosaves.
    Permitted only during IN_PROGRESS state.
    """
    notes: str = Field(
        ...,
        description="Raw or Markdown tutor notes taken during the live session.",
        examples=["Student demonstrated mastery of differentiation but struggled with product rule."],
    )


# =============================================================================
# RESPONSE SCHEMAS (Outputs)
# =============================================================================

class SessionResponse(BaseModel):
    """
    Authoritative representation of a single Session entity.
    Maps directly from the SQLAlchemy Session model.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tutor_id: uuid.UUID
    student_profile_id: uuid.UUID

    # Display attributes resolved via model @property or empty string fallback
    tutor_name: str = ""
    student_name: str = ""

    topic: str
    scheduled_start: datetime
    scheduled_end: datetime
    meeting_url: Optional[str] = None
    status: SessionStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: str
    ai_plan: Optional[Dict[str, Any]] = None
    ai_session_summary: Optional[str] = None
    ai_suggested_focus: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SessionDetailResponse(SessionResponse):
    """
    Rich session view that eagerly includes relations 
    (tutor user, student user, and student profile) to avoid N+1 queries.
    """
    tutor: Optional[SessionUserSummary] = None
    student_profile: Optional[SessionStudentProfileSummary] = None


class SessionListResponse(BaseModel):
    """
    Standard envelope returned for list and filter queries.
    """
    items: List[SessionResponse]
    total: int


class SessionActionMessageResponse(BaseModel):
    """
    Generic confirmation message for state transitions or deletions.
    """
    success: bool = True
    message: str
    session_id: uuid.UUID
    status: Optional[SessionStatus] = None






class SessionQueryParams(BaseModel):
    student_profile_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Filter by student profile ID (tutors only)",
    )
    status: Optional[SessionStatus] = Field(
        default=None,
        description="Filter by session status",
    )
    start: Optional[datetime] = Field(
        default=None,
        description="Filter range start timestamp (ISO 8601 UTC)",
    )
    end: Optional[datetime] = Field(
        default=None,
        description="Filter range end timestamp (ISO 8601 UTC)",
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Max number of sessions to return",
    )

    @model_validator(mode="after")
    def validate_date_range(self) -> "SessionQueryParams":
        if self.start is not None and self.end is not None and self.start >= self.end:
            raise InvalidSessionTimeError("Filter parameter 'start' must be earlier than 'end'.")
        return self