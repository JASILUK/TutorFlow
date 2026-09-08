import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# NESTED RELATION SCHEMAS
# =============================================================================

class HomeworkSessionSummary(BaseModel):
    """Minimal session details attached to homework task cards."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic: str
    scheduled_start: datetime


# =============================================================================
# REQUEST SCHEMAS (Inputs)
# =============================================================================

class HomeworkTaskBase(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Actionable homework title or exercise description.",
        examples=["Complete Calculus Exercise 4.2"],
    )
    description: str = Field(
        ...,
        min_length=1,
        description="Detailed task instructions, questions, or resources.",
        examples=["Solve problems 1 through 10 on page 142. Show all working."],
    )


class HomeworkCreateRequest(HomeworkTaskBase):
    """Payload to create a single homework task tied to an existing session."""
    session_id: uuid.UUID = Field(
        ...,
        description="UUID of the active or completed session this task belongs to.",
    )


class HomeworkItemCreate(HomeworkTaskBase):
    """Payload item used for batch ingestion (e.g., from AI debriefs)."""
    pass


class HomeworkUpdateRequest(BaseModel):
    """Payload for tutors to edit homework instructions."""
    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=200,
        description="Updated homework title.",
    )
    description: Optional[str] = Field(
        None,
        min_length=1,
        description="Updated instructions.",
    )


class HomeworkCompleteRequest(BaseModel):
    """Payload for student or tutor checkbox completion toggle."""
    is_completed: bool = Field(
        ...,
        description="Whether the task has been marked complete.",
    )


# =============================================================================
# RESPONSE SCHEMAS (Outputs)
# =============================================================================

class HomeworkTaskResponse(BaseModel):
    """Full representation of a single homework task entity."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    title: str
    description: str
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    session: Optional[HomeworkSessionSummary] = None


class HomeworkTaskListResponse(BaseModel):
    """Standard list response envelope."""
    items: List[HomeworkTaskResponse]
    total: int


class HomeworkSummaryCounts(BaseModel):
    """Metric counters for top-level summary badges."""
    total: int
    pending_count: int
    completed_count: int


class HomeworkDashboardResponse(BaseModel):
    """Consolidated payload for homework screens and tabs."""
    counts: HomeworkSummaryCounts
    items: List[HomeworkTaskResponse]