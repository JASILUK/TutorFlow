"""Sanitized context models and builders for TutorFlow AI operations.

Guarantees that no passwords, hashes, tokens, emails, or internal database
metadata are leaked to the LLM providers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence

from app.models.session import Session
from app.models.student_profile import StudentProfile


# =============================================================================
# 1. CONTEXT DATA STRUCTURES (Immutable & Sanitized)
# =============================================================================

@dataclass(frozen=True)
class SessionPlanContext:
    """Pedagogical context required for pre-session lesson planning."""

    student_name: str
    subject: str
    current_level: str
    learning_goals: str
    weak_areas: str
    topic: str
    past_session_topics: List[str]


@dataclass(frozen=True)
class SessionDebriefContext:
    """Context required for post-session analysis and homework generation."""

    student_name: str
    subject: str
    current_level: str
    topic: str
    notes: str
    plan_objectives: List[str]
    plan_outline: List[str]


@dataclass(frozen=True)
class HistoricalSessionSummary:
    """Summary of a past completed session for longitudinal progress analysis."""

    topic: str
    date_str: str
    summary: str
    suggested_focus: Optional[str]


@dataclass(frozen=True)
class StudentProgressContext:
    """Longitudinal history context required for student progress synthesis."""

    student_name: str
    subject: str
    current_level: str
    learning_goals: str
    weak_areas: str
    total_completed_sessions: int
    session_history: List[HistoricalSessionSummary]


# =============================================================================
# 2. FEATURE-SPECIFIC CONTEXT BUILDERS
# =============================================================================

def build_session_plan_context(
    *,
    session: Session,
    profile: StudentProfile,
    recent_sessions: Sequence[Session],
) -> SessionPlanContext:
    """Build sanitized context for lesson planning from session and profile entities."""
    student_name = (
        profile.student_user.full_name
        if profile.student_user and profile.student_user.full_name
        else "Student"
    )

    # Gather past topics covered, excluding the current session
    past_topics = [
        s.topic.strip()
        for s in recent_sessions
        if s.id != session.id and s.topic and s.topic.strip()
    ]

    return SessionPlanContext(
        student_name=student_name.strip(),
        subject=profile.subject.strip(),
        current_level=profile.current_level.strip(),
        learning_goals=(profile.learning_goals or "").strip(),
        weak_areas=(profile.weak_areas or "").strip(),
        topic=session.topic.strip(),
        past_session_topics=past_topics,
    )


def build_session_debrief_context(
    *,
    session: Session,
    profile: StudentProfile,
) -> SessionDebriefContext:
    """Build sanitized context for post-session debriefing from session notes and plan."""
    student_name = (
        profile.student_user.full_name
        if profile.student_user and profile.student_user.full_name
        else "Student"
    )

    plan_objectives: List[str] = []
    plan_outline: List[str] = []

    # Extract intended lesson plan goals if one was generated prior to the session
    if session.ai_plan and isinstance(session.ai_plan, dict):
        objectives_raw = session.ai_plan.get("learning_objectives", [])
        if isinstance(objectives_raw, list):
            plan_objectives = [str(obj) for obj in objectives_raw]

        outline_raw = session.ai_plan.get("lesson_outline", [])
        if isinstance(outline_raw, list):
            plan_outline = [
                step.get("title", "")
                for step in outline_raw
                if isinstance(step, dict) and "title" in step
            ]

    return SessionDebriefContext(
        student_name=student_name.strip(),
        subject=profile.subject.strip(),
        current_level=profile.current_level.strip(),
        topic=session.topic.strip(),
        notes=session.notes.strip(),
        plan_objectives=plan_objectives,
        plan_outline=plan_outline,
    )


def build_student_progress_context(
    *,
    profile: StudentProfile,
    completed_sessions: Sequence[Session],
) -> StudentProgressContext:
    """Build longitudinal context from student history for progress evaluation."""
    student_name = (
        profile.student_user.full_name
        if profile.student_user and profile.student_user.full_name
        else "Student"
    )

    history_items: List[HistoricalSessionSummary] = []
    for s in completed_sessions:
        summary_text = (s.ai_session_summary or s.notes or "").strip()
        if not summary_text:
            summary_text = "Topic covered during lesson."

        date_formatted = s.scheduled_start.strftime("%B %-d, %Y")

        history_items.append(
            HistoricalSessionSummary(
                topic=s.topic.strip(),
                date_str=date_formatted,
                summary=summary_text,
                suggested_focus=(s.ai_suggested_focus or "").strip() or None,
            )
        )

    return StudentProgressContext(
        student_name=student_name.strip(),
        subject=profile.subject.strip(),
        current_level=profile.current_level.strip(),
        learning_goals=(profile.learning_goals or "").strip(),
        weak_areas=(profile.weak_areas or "").strip(),
        total_completed_sessions=len(completed_sessions),
        session_history=history_items,
    )