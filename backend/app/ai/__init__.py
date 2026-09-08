"""TutorFlow AI foundation module."""

from app.ai.client import AIClient, AIConfigurationError, AIServiceError
from app.ai.providers import get_ai_client
from app.ai.schemas import (
    HomeworkSuggestion,
    LessonStep,
    ProgressOutput,
    SessionDebriefOutput,
    SessionPlanOutput,
)

__all__ = [
    "AIClient",
    "AIConfigurationError",
    "AIServiceError",
    "HomeworkSuggestion",
    "LessonStep",
    "ProgressOutput",
    "SessionDebriefOutput",
    "SessionPlanOutput",
    "get_ai_client",
]