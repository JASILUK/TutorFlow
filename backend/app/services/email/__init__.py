"""TutorFlow email services and provider factories."""

from __future__ import annotations

from app.core.exceptions import EmailServiceError, EmailValidationError
from app.services.email.email_service import EmailService
from app.services.email.provider import (
    EmailConfigurationError,
    EmailMessage,
    EmailProvider,
    EmailProviderError,
)
from app.services.email.sendgrid_provider import SendGridEmailProvider
from app.services.email.template_renderer import (
    EmailTemplateRenderer,
    SessionScheduledEmailData,
    StudentAccountCreatedEmailData,
)


def get_email_provider() -> EmailProvider:
    """Factory creating the default configured email provider."""
    from app.core.config import settings

    return SendGridEmailProvider(
        api_key=settings.SENDGRID_API_KEY,
        from_email=settings.EMAIL_FROM,
    )


def get_email_service() -> EmailService:
    """Factory creating the application-level email service with default provider."""
    return EmailService(provider=get_email_provider())


def get_template_renderer() -> EmailTemplateRenderer:
    """Factory creating the default Jinja2 email template renderer."""
    return EmailTemplateRenderer()


__all__ = [
    "EmailConfigurationError",
    "EmailMessage",
    "EmailProvider",
    "EmailProviderError",
    "EmailService",
    "EmailServiceError",
    "EmailTemplateRenderer",
    "EmailValidationError",
    "SendGridEmailProvider",
    "SessionScheduledEmailData",
    "StudentAccountCreatedEmailData",
    "get_email_provider",
    "get_email_service",
    "get_template_renderer",
]