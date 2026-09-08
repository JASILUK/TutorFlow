"""Production Gemini provider implementation using official google-genai SDK."""

from __future__ import annotations

import logging
from typing import Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.ai.client import AIClient, AIConfigurationError, AIServiceError
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class GeminiClient(AIClient):
    """Implements AIClient protocol using the official google-genai SDK."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")
        self.model = model or getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not self.api_key or not self.api_key.strip():
            raise AIConfigurationError("GEMINI_API_KEY is not configured in environment.")
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.2,
    ) -> T:
        client = self._get_client()

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=response_model,
            temperature=temperature,
        )

        try:
            # client.aio exposes the asynchronous client methods
            response = await client.aio.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=config,
            )

            raw_text = response.text
            if not raw_text:
                raise AIServiceError("Gemini returned an empty response.")

            # Validate the JSON string against our strict Pydantic model
            return response_model.model_validate_json(raw_text)

        except ValidationError as exc:
            logger.error("Pydantic validation failed on Gemini output: %s", exc)
            raise AIServiceError("Gemini generated data that failed schema validation.") from exc
        except (AIServiceError, AIConfigurationError):
            raise
        except Exception as exc:
            logger.error("Gemini API call failed: %s", exc, exc_info=True)
            raise AIServiceError(f"Gemini service error: {exc}") from exc