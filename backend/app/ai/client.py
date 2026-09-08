"""Domain abstraction protocol for AI LLM providers."""

from __future__ import annotations

from typing import Protocol, Type, TypeVar
from pydantic import BaseModel

from app.core.exceptions import AppException

T = TypeVar("T", bound=BaseModel)


class AIServiceError(AppException):
    """Raised when an external AI provider fails or times out."""

    def __init__(self, message: str = "AI generation service failure.", details: list | None = None) -> None:
        super().__init__(
            message=message,
            status_code=502,
            error_code="AI_SERVICE_ERROR",
            details=details,
        )


class AIConfigurationError(AppException):
    """Raised when an AI provider is invoked without valid API keys or settings."""

    def __init__(self, message: str = "AI provider is not properly configured.") -> None:
        super().__init__(
            message=message,
            status_code=500,
            error_code="AI_CONFIG_ERROR",
        )


class AIClient(Protocol):
    """Minimal, provider-agnostic interface for structured schema generation."""

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.2,
    ) -> T:
        """
        Execute prompt against the provider and return a validated Pydantic instance.

        Raises:
            AIServiceError: When API errors, rate limits, or validation failures occur.
            AIConfigurationError: When the client lacks valid credentials.
        """
        ...