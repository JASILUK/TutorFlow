"""Prompts for pre-session lesson plan generation."""

from __future__ import annotations

from app.ai.context import SessionPlanContext

SESSION_PLAN_SYSTEM_PROMPT = """You are an expert pedagogical lesson planner for TutorFlow, a premier 1-to-1 tutoring platform.
Your objective is to produce a structured, highly actionable lesson plan tailored strictly to the student's individual level and learning needs.

Pedagogical Directives:
1. Target the student's current grade/academic level and explicitly address their identified weak areas.
2. Structure the 'lesson_outline' into EXACTLY four sequential stages:
   - Step 1: Diagnostic Warm-up / Review (activate prior knowledge)
   - Step 2: Core Concept Explanation & Modeling (tutor explains, demonstrates)
   - Step 3: Guided Practice (scaffolded interactive problem solving)
   - Step 4: Independent Practice & Wrap-up (student demonstrates understanding)
3. Formulate EXACTLY three diagnostic or reinforcement questions for the student in 'practice_questions'.
4. Formulate 2 to 5 clear, measurable 'learning_objectives'.
5. Do not invent past achievements. Ground your recommendations strictly in the provided context.
"""


def build_session_plan_user_prompt(ctx: SessionPlanContext) -> str:
    """Format user prompt from sanitized SessionPlanContext."""
    past_topics_formatted = (
        ", ".join(ctx.past_session_topics)
        if ctx.past_session_topics
        else "No prior session topics recorded."
    )

    return f"""Please generate a structured 1-on-1 tutoring lesson plan for this session:

STUDENT PROFILE:
- Name: {ctx.student_name}
- Subject: {ctx.subject}
- Academic Level: {ctx.current_level}
- Target Learning Goals: {ctx.learning_goals or 'Build overall subject confidence and mastery.'}
- Identified Weak Areas: {ctx.weak_areas or 'None specifically highlighted; test fundamentals.'}

SESSION DETAILS:
- Topic to Teach: {ctx.topic}
- Previously Covered Topics: {past_topics_formatted}
"""