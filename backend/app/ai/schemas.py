"""
Strict Pydantic structured output schemas for TutorFlow AI features.
Compatible with Google Gemini API and OpenAI structured outputs.
"""

from __future__ import annotations

from typing import List
from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# 1. PRE-SESSION LESSON PLAN (Persisted into Session.ai_plan JSONB)
# =============================================================================

class LessonStep(BaseModel):
    """A distinct structural stage within a tutoring session."""

    model_config = ConfigDict(frozen=True)

    step: int = Field(
        ...,
        ge=1,
        le=4,
        description="Sequential stage number (strictly 1, 2, 3, or 4).",
    )
    title: str = Field(
        ...,
        min_length=2,
        max_length=120,
        description="Stage title (e.g., 'Diagnostic Warm-up & Review', 'Guided Practice').",
    )
    duration_minutes: int = Field(
        ...,
        ge=5,
        le=60,
        description="Allocated instructional time in minutes for this stage.",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=600,
        description="Concrete pedagogical activities, explanation prompts, and student interactions.",
    )


class SessionPlanOutput(BaseModel):
    """
    Contract for AI pre-session planning.
    """

    model_config = ConfigDict(frozen=True)

    learning_objectives: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="2 to 5 specific, measurable academic objectives for this session.",
    )
    lesson_outline: List[LessonStep] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Exactly four sequential stages: Warm-up, Core Concept, Guided Practice, Wrap-up.",
    )
    practice_questions: List[str] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="Exactly three diagnostic or reinforcement questions targeting student weak areas.",
    )


# =============================================================================
# 2. POST-SESSION DEBRIEF (Updates Session status/summary + creates Homework)
# =============================================================================

class HomeworkSuggestion(BaseModel):
    """An actionable assignment derived from session performance and notes."""

    model_config = ConfigDict(frozen=True)

    title: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Clear title of the homework assignment.",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Detailed problems, instructions, or reading tasks.",
    )


class SessionDebriefOutput(BaseModel):
    """
    Contract for AI post-session debriefing.
    """

    model_config = ConfigDict(frozen=True)

    summary: str = Field(
        ...,
        min_length=20,
        max_length=2000,
        description="Recap of concepts covered, student mastery level, and friction points from notes.",
    )
    homework: List[HomeworkSuggestion] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="Exactly 2 to 3 targeted assignments directly reinforcing noted weak areas.",
    )
    next_session_focus: str = Field(
        ...,
        min_length=5,
        max_length=300,
        description="Single concise academic directive for the next lesson.",
    )


# =============================================================================
# 3. STUDENT PROGRESS SYNTHESIS (Persisted to StudentProgress table)
# =============================================================================

class ProgressOutput(BaseModel):
    """
    Contract for longitudinal student progress synthesis.
    """

    model_config = ConfigDict(frozen=True)

    summary: str = Field(
        ...,
        min_length=30,
        max_length=2500,
        description="Comprehensive evaluation of student trajectory, retention, and progress.",
    )
    strengths: List[str] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="2 to 6 key skills or concepts the student has demonstrably mastered.",
    )
    areas_to_improve: List[str] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="2 to 6 persistent obstacles or foundational topics needing practice.",
    )
    recommended_focus: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Highest-priority pedagogical focus for upcoming tutoring sessions.",
    )