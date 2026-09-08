"""Prompts for post-session debrief and homework assignment generation."""

from __future__ import annotations

from app.ai.context import SessionDebriefContext

SESSION_DEBRIEF_SYSTEM_PROMPT = """You are a senior academic tutor supervisor for TutorFlow.
Your objective is to analyze a tutor's raw session notes from a completed 1-to-1 lesson and produce an insightful debrief and actionable homework.

Evaluation Directives:
1. 'summary': Write a professional 2-3 paragraph synthesis covering what concepts were addressed, what the student mastered, and where they encountered friction. Ground everything strictly in the tutor's notes.
2. 'homework': Recommend EXACTLY 2 to 3 targeted, actionable assignments. Each must have a clear 'title' and explicit 'description' (specific problems or tasks) to reinforce friction points from the notes.
3. 'next_session_focus': Provide a single, concise strategic recommendation for the subsequent lesson.
4. Do not invent details not supported by the tutor's notes.
"""


def build_session_debrief_user_prompt(ctx: SessionDebriefContext) -> str:
    """Format user prompt from sanitized SessionDebriefContext."""
    objectives_formatted = (
        "\n".join(f"  * {obj}" for obj in ctx.plan_objectives)
        if ctx.plan_objectives
        else "  * No initial plan objectives recorded."
    )

    outline_formatted = (
        "\n".join(f"  * {step}" for step in ctx.plan_outline)
        if ctx.plan_outline
        else "  * Standard lesson structure."
    )

    return f"""Please evaluate this completed tutoring session based on the tutor's raw notes:

LESSON CONTEXT:
- Student: {ctx.student_name}
- Subject: {ctx.subject} ({ctx.current_level})
- Topic: {ctx.topic}

PLANNED OBJECTIVES (Reference Only):
{objectives_formatted}

PLANNED OUTLINE (Reference Only):
{outline_formatted}

TUTOR'S RAW SESSION NOTES (Primary Source of Truth):
\"\"\"
{ctx.notes}
\"\"\"
"""