"""Prompts package for TutorFlow AI features."""

from app.ai.prompts.progress import PROGRESS_SYSTEM_PROMPT, build_progress_user_prompt
from app.ai.prompts.session_debrief import (
    SESSION_DEBRIEF_SYSTEM_PROMPT,
    build_session_debrief_user_prompt,
)
from app.ai.prompts.session_plan import (
    SESSION_PLAN_SYSTEM_PROMPT,
    build_session_plan_user_prompt,
)

__all__ = [
    "PROGRESS_SYSTEM_PROMPT",
    "SESSION_DEBRIEF_SYSTEM_PROMPT",
    "SESSION_PLAN_SYSTEM_PROMPT",
    "build_progress_user_prompt",
    "build_session_debrief_user_prompt",
    "build_session_plan_user_prompt",
]