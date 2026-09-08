"""Production OpenAI provider implementation using native structured outputs."""

from __future__ import annotations

import logging
from typing import Type, TypeVar

from openai import APIError, APITimeoutError, AsyncOpenAI, RateLimitError
from pydantic import BaseModel, ValidationError

from app.ai.client import AIClient, AIConfigurationError, AIServiceError
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class OpenAIClient(AIClient):
    """Implements AIClient protocol using OpenAI's official AsyncOpenAI SDK."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.api_key = api_key or getattr(settings, "OPENAI_API_KEY", "")
        self.model = model or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        self.timeout_seconds = timeout_seconds
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI:
        if not self.api_key or not self.api_key.strip():
            raise AIConfigurationError("OPENAI_API_KEY is not configured in environment.")
        if self._client is None:
            self._client = AsyncOpenAI(api_key=self.api_key, timeout=self.timeout_seconds)
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

        try:
            completion = await client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format=response_model,
                temperature=temperature,
            )

            message = completion.choices[0].message
            if message.refusal:
                logger.error("OpenAI model refused completion: %s", message.refusal)
                raise AIServiceError("The AI model refused to process the tutoring prompt.")

            if message.parsed is None:
                raise AIServiceError("AI provider returned empty structured content.")

            return message.parsed

        except APITimeoutError as exc:
            logger.error("OpenAI request timed out: %s", exc)
            raise AIServiceError("AI generation request timed out. Please try again.") from exc
        except RateLimitError as exc:
            logger.warning("OpenAI rate limit reached: %s", exc)
            raise AIServiceError("AI service rate limit encountered. Please try again shortly.") from exc
        except APIError as exc:
            logger.error("OpenAI API error: %s", exc)
            raise AIServiceError(f"OpenAI service error: {exc.message}") from exc
        except ValidationError as exc:
            logger.error("Pydantic validation failed on OpenAI output: %s", exc)
            raise AIServiceError("AI generated data in an invalid format.") from exc
        except (AIServiceError, AIConfigurationError):
            raise
        except Exception as exc:
            logger.error("Unexpected error in OpenAIClient: %s", exc, exc_info=True)
            raise AIServiceError("An unexpected error occurred during AI generation.") from exc