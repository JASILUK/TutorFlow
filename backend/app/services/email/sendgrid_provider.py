"""SendGrid email provider implementation for TutorFlow."""

from __future__ import annotations

import asyncio
import email.utils
import logging
from typing import Final

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Content, Email, Mail, To

from app.services.email.provider import (
    EmailConfigurationError,
    EmailMessage,
    EmailProvider,
    EmailProviderError,
)

logger = logging.getLogger(__name__)

# HTTP status codes SendGrid returns on successful message queuing/acceptance
_SUCCESS_STATUS_CODES: Final[set[int]] = {200, 201, 202}


class SendGridEmailProvider(EmailProvider):
    """Production-grade SendGrid email provider implementing EmailProvider protocol.

    - Parses and validates RFC 5322 formatted sender addresses ("Name <addr@domain.com>").
    - Dispatches synchronous SendGrid SDK calls in worker threads via asyncio.to_thread.
    - Sanitizes errors and logs so API keys or sensitive contents are never leaked.
    """

    def __init__(
        self,
        *,
        api_key: str,
        from_email: str,
    ) -> None:
        self._api_key = api_key
        self._from_email_raw = from_email
        self._sender_name, self._sender_email = self._parse_from_address(from_email)

    @staticmethod
    def _parse_from_address(raw_sender: str) -> tuple[str | None, str]:
        """Parse raw sender strings into display name and clean email address.

        Supports:
            - 'TutorFlow <notifications@tutorflow.dev>'
            - 'notifications@tutorflow.dev'
        """
        if not raw_sender or not raw_sender.strip():
            raise EmailConfigurationError("EMAIL_FROM is not configured or is empty.")

        display_name, parsed_email = email.utils.parseaddr(raw_sender.strip())

        # Validate that email contains '@' and valid segments
        if not parsed_email or "@" not in parsed_email:
            raise EmailConfigurationError(
                f"Invalid sender address format in EMAIL_FROM: '{raw_sender}'"
            )

        name = display_name.strip() if display_name.strip() else None
        return name, parsed_email.strip()

    def _get_client(self) -> SendGridAPIClient:
        """Instantiate SendGrid API client, validating API key presence."""
        if not self._api_key or not self._api_key.strip():
            raise EmailConfigurationError(
                "SENDGRID_API_KEY is not configured. Email delivery is disabled."
            )
        return SendGridAPIClient(api_key=self._api_key.strip())

    def _build_mail(self, message: EmailMessage) -> Mail:
        """Construct the SendGrid Mail helper object."""
        from_obj = (
            Email(email=self._sender_email, name=self._sender_name)
            if self._sender_name
            else Email(email=self._sender_email)
        )
        to_obj = To(email=message.to.strip())

        # Plain-text alternative content
        plain_text_content = (
            Content("text/plain", message.text)
            if message.text
            else Content("text/plain", " ")
        )
        html_content = Content("text/html", message.html)

        mail = Mail(
            from_email=from_obj,
            to_emails=to_obj,
            subject=message.subject,
            plain_text_content=plain_text_content,
            html_content=html_content,
        )
        return mail

    def _send_sync(self, message: EmailMessage) -> None:
        """Blocking SDK network call designed to run inside asyncio.to_thread."""
        client = self._get_client()
        mail = self._build_mail(message)

        try:
            response = client.send(mail)
        except Exception as exc:
            # Mask API key if by any chance SDK string representation includes it
            err_repr = str(exc)
            if self._api_key and self._api_key in err_repr:
                err_repr = err_repr.replace(self._api_key, "[REDACTED]")

            logger.error(
                "SendGrid SDK delivery error",
                extra={
                    "provider": "sendgrid",
                    "recipient": self._mask_email(message.to),
                    "error": err_repr,
                },
            )
            raise EmailProviderError(
                f"Failed to deliver email via SendGrid: {err_repr}"
            ) from None

        if response.status_code not in _SUCCESS_STATUS_CODES:
            logger.error(
                "SendGrid API rejected message",
                extra={
                    "provider": "sendgrid",
                    "recipient": self._mask_email(message.to),
                    "status_code": response.status_code,
                },
            )
            raise EmailProviderError(
                f"SendGrid rejected email with status code {response.status_code}"
            )

        logger.info(
            "Email delivered successfully via SendGrid",
            extra={
                "provider": "sendgrid",
                "recipient": self._mask_email(message.to),
                "status_code": response.status_code,
            },
        )

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str | None = None,
    ) -> None:
        """Asynchronously dispatch email using a worker thread to avoid blocking the event loop."""
        if not to or "@" not in to:
            raise EmailProviderError(f"Invalid recipient email: '{to}'")
        if not subject or not subject.strip():
            raise EmailProviderError("Email subject cannot be empty.")
        if not html or not html.strip():
            raise EmailProviderError("Email HTML body cannot be empty.")

        message = EmailMessage(
            to=to.strip(),
            subject=subject.strip(),
            html=html,
            text=text,
        )

        # Offload synchronous SDK I/O to a thread
        await asyncio.to_thread(self._send_sync, message)

    @staticmethod
    def _mask_email(email_addr: str) -> str:
        """Mask email address for safe, privacy-preserving operational logs."""
        try:
            local, domain = email_addr.split("@", 1)
            if len(local) <= 2:
                masked_local = "*" * len(local)
            else:
                masked_local = f"{local[0]}***{local[-1]}"
            return f"{masked_local}@{domain}"
        except Exception:
            return "***@masked"