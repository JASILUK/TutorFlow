"""Prompts for longitudinal student progress evaluation across completed sessions."""

from __future__ import annotations

from app.ai.context import StudentProgressContext

PROGRESS_SYSTEM_PROMPT = """You are the Academic Director at TutorFlow.
Your objective is to synthesize longitudinal learning progress for a student based on their complete history of tutoring sessions.

Evaluation Directives:
1. 'summary': Provide a holistic evaluation of the student's learning trajectory, consistency, and retention across their completed sessions.
2. 'strengths': Identify 2 to 6 concrete skills, concepts, or habits the student has demonstrably mastered over time.
3. 'areas_to_improve': Identify 2 to 6 persistent conceptual obstacles or foundational areas requiring ongoing remediation.
4. 'recommended_focus': Specify the single highest-priority pedagogical focus for subsequent tutoring lessons.
5. Ground your synthesis strictly in the provided session history.
"""


def build_progress_user_prompt(ctx: StudentProgressContext) -> str:
    """Format user prompt from sanitized StudentProgressContext."""
    history_blocks = []
    for idx, s in enumerate(ctx.session_history, start=1):
        focus_line = f"\n  Next Focus Targeted: {s.suggested_focus}" if s.suggested_focus else ""
        history_blocks.append(
            f"Session {idx} ({s.date_str}): {s.topic}\n"
            f"  Debrief Summary: {s.summary}{focus_line}"
        )

    history_formatted = "\n\n".join(history_blocks)

    return f"""Please evaluate longitudinal progress for this student:

STUDENT OVERVIEW:
- Student: {ctx.student_name}
- Subject: {ctx.subject} ({ctx.current_level})
- Learning Goals: {ctx.learning_goals or 'Continuous academic advancement.'}
- Baseline Weak Areas: {ctx.weak_areas or 'None recorded.'}
- Total Completed Sessions: {ctx.total_completed_sessions}

COMPLETED SESSION HISTORY:
{history_formatted}
"""