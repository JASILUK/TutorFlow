from __future__ import annotations

import email.utils
import logging

from app.core.exceptions import EmailServiceError, EmailValidationError
from app.services.email.provider import EmailProvider, EmailProviderError

logger = logging.getLogger(__name__)


class EmailService:
    """Application-level service orchestrating email dispatch.

    Decouples application components (API endpoints, Celery workers) from the underlying
    EmailProvider implementation (SendGrid, mock providers, etc.).
    """

    def __init__(self, provider: EmailProvider) -> None:
        self._provider = provider

    @staticmethod
    def _validate_input(
        *,
        to: str,
        subject: str,
        html: str,
    ) -> str:
        """Validate email parameters prior to provider dispatch.

        Returns:
            Normalized recipient email string.

        Raises:
            EmailValidationError: If any required field is invalid or missing.
        """
        if not to or not to.strip():
            raise EmailValidationError(
                message="Recipient email address cannot be empty.",
                details=[{"field": "to", "message": "Email address cannot be empty."}],
            )

        clean_to = to.strip()
        _, parsed_addr = email.utils.parseaddr(clean_to)

        if not parsed_addr or "@" not in parsed_addr or "." not in parsed_addr.split("@")[-1]:
            raise EmailValidationError(
                message=f"Invalid recipient email format: '{clean_to}'.",
                details=[{"field": "to", "message": "Malformed email address."}],
            )

        if not subject or not subject.strip():
            raise EmailValidationError(
                message="Email subject cannot be empty.",
                details=[{"field": "subject", "message": "Subject cannot be empty."}],
            )

        if not html or not html.strip():
            raise EmailValidationError(
                message="Email HTML body cannot be empty.",
                details=[{"field": "html", "message": "HTML body cannot be empty."}],
            )

        return clean_to

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str | None = None,
    ) -> None:
        """Validate and dispatch an email via the injected provider.

        Args:
            to: Recipient email address.
            subject: Subject line.
            html: HTML content body.
            text: Optional plain-text fallback content.

        Raises:
            EmailValidationError: If arguments fail application validation.
            EmailServiceError: If the underlying email provider fails.
        """
        clean_to = self._validate_input(to=to, subject=subject, html=html)
        clean_subject = subject.strip()
        clean_text = text.strip() if text is not None and text.strip() else None

        try:
            await self._provider.send(
                to=clean_to,
                subject=clean_subject,
                html=html,
                text=clean_text,
            )
        except EmailProviderError as exc:
            logger.error(
                "Email delivery failed in provider",
                extra={
                    "recipient": self._mask_email(clean_to),
                    "subject": clean_subject,
                    "error": str(exc),
                },
            )
            raise EmailServiceError(f"Failed to send email: {exc.message}") from exc
        except Exception as exc:
            logger.error(
                "Unexpected error during email dispatch",
                extra={
                    "recipient": self._mask_email(clean_to),
                    "error_type": type(exc).__name__,
                },
                exc_info=True,
            )
            raise EmailServiceError("Unexpected failure in email delivery service.") from exc

    @staticmethod
    def _mask_email(email_addr: str) -> str:
        """Mask email address for safe log output."""
        try:
            local, domain = email_addr.split("@", 1)
            if len(local) <= 2:
                masked_local = "*" * len(local)
            else:
                masked_local = f"{local[0]}***{local[-1]}"
            return f"{masked_local}@{domain}"
        except Exception:
            return "***@masked"