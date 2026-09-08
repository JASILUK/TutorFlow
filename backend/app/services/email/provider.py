"""Email provider interface and domain exceptions for TutorFlow."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


class EmailProviderError(Exception):
    """Raised when an email provider fails to deliver an email."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class EmailConfigurationError(EmailProviderError):
    """Raised when the email provider is misconfigured (e.g. missing API key or invalid sender)."""


@dataclass(frozen=True, slots=True)
class EmailMessage:
    """Internal immutable email representation."""

    to: str
    subject: str
    html: str
    text: str | None = None


@runtime_checkable
class EmailProvider(Protocol):
    """Minimal protocol representing the email provider contract."""

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str | None = None,
    ) -> None:
        """Send an email message via the underlying provider.

        Raises:
            EmailConfigurationError: If provider configuration is invalid or missing.
            EmailProviderError: If the provider fails to accept or send the email.
        """
        ...