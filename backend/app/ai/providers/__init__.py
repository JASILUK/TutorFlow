"""AI Provider package and factory resolver."""

from __future__ import annotations

import logging

from app.ai.client import AIClient, AIConfigurationError
from app.ai.providers.gemini_client import GeminiClient
from app.ai.providers.openai_client import OpenAIClient
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_ai_client() -> AIClient:
    """Factory resolving the active AIClient based on AI_PROVIDER in settings."""
    provider = getattr(settings, "AI_PROVIDER", "gemini").lower().strip()
    gemini_key = getattr(settings, "GEMINI_API_KEY", "").strip()
    openai_key = getattr(settings, "OPENAI_API_KEY", "").strip()

    if provider == "gemini":
        if not gemini_key:
            raise AIConfigurationError(
                "AI_PROVIDER is set to 'gemini', but GEMINI_API_KEY is empty in .env"
            )
        return GeminiClient(
            api_key=gemini_key,
            model=getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash"),
        )

    if provider == "openai":
        if not openai_key:
            raise AIConfigurationError(
                "AI_PROVIDER is set to 'openai', but OPENAI_API_KEY is empty in .env"
            )
        return OpenAIClient(
            api_key=openai_key,
            model=getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"),
        )

    # Automatic fallback if provider was misconfigured
    if gemini_key:
        return GeminiClient(api_key=gemini_key)
    if openai_key:
        return OpenAIClient(api_key=openai_key)

    raise AIConfigurationError(
        "No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env"
    )


__all__ = ["AIClient", "GeminiClient", "OpenAIClient", "get_ai_client"]