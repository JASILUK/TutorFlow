"""Celery worker tasks for email notifications in TutorFlow."""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from celery.exceptions import MaxRetriesExceededError

from app.core.config import settings
from app.core.database import async_session_maker
from app.core.exceptions import EmailConfigurationError, EmailServiceError
from app.models.session import SessionStatus
from app.repositories.session_repository import SessionRepository
from app.repositories.student_repository import StudentProfileRepository
from app.services.email import (
    EmailService,
    EmailTemplateRenderer,
    SessionScheduledEmailData,
    StudentAccountCreatedEmailData,
    get_email_service,
    get_template_renderer,
)
from app.services.session_service import SessionService
from app.services.student_service import StudentService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _load_session_email_context(
    session_id: uuid.UUID,
) -> tuple[Optional[str], Optional[SessionScheduledEmailData]]:
    """Retrieve session entity via SessionService and build email context.

    Opens an isolated DB session that closes immediately after data extraction.

    Returns:
        tuple[recipient_email, SessionScheduledEmailData] or (None, None) if ineligible.
    """
    async with async_session_maker() as db:
        student_service = StudentService(session=db)
        session_service = SessionService(
            session_repository=SessionRepository(session=db),
            db_session=db,
            student_service=student_service,
        )

        session = await session_service.get_session_for_notification(session_id)

        if not session:
            logger.warning(
                "Skipping scheduled-session email: session not found",
                extra={"session_id": str(session_id)},
            )
            return None, None

        # Guard: Only notify for newly scheduled sessions
        if session.status != SessionStatus.SCHEDULED:
            logger.info(
                "Skipping scheduled-session email: session is no longer in SCHEDULED state",
                extra={"session_id": str(session_id), "status": session.status.value},
            )
            return None, None

        # Extract student account email
        student_profile = session.student_profile
        student_user = student_profile.student_user if student_profile else None
        student_email = student_user.email if student_user else None

        if not student_email or not student_email.strip():
            logger.error(
                "Skipping scheduled-session email: student profile has no valid email",
                extra={"session_id": str(session_id)},
            )
            return None, None

        # Convert UTC datetimes to local display timezone (e.g., Asia/Kolkata) for emails
        local_tz = ZoneInfo("Asia/Kolkata")
        start_dt_local = session.scheduled_start.astimezone(local_tz)
        end_dt_local = session.scheduled_end.astimezone(local_tz)

        scheduled_date_str = start_dt_local.strftime("%B %-d, %Y")
        start_time_str = start_dt_local.strftime("%-I:%M %p")
        end_time_str = end_dt_local.strftime("%-I:%M %p")

        email_data = SessionScheduledEmailData(
            student_name=session.student_name or "Student",
            tutor_name=session.tutor_name or "Your Tutor",
            topic=session.topic,
            scheduled_date=scheduled_date_str,
            scheduled_start_time=start_time_str,
            scheduled_end_time=end_time_str,
            meeting_url=session.meeting_url if session.meeting_url else None,
        )

        return student_email.strip(), email_data


def _build_plain_text(data: SessionScheduledEmailData) -> str:
    """Generate concise plain-text fallback content."""
    lines = [
        "TutorFlow",
        "",
        f"Hi {data.student_name},",
        "",
        f"Your tutoring session on {data.topic} with {data.tutor_name} has been scheduled.",
        "",
        "Session Details:",
        f"  Topic: {data.topic}",
        f"  Tutor: {data.tutor_name}",
        f"  Date:  {data.scheduled_date}",
        f"  Time:  {data.scheduled_start_time} - {data.scheduled_end_time}",
    ]

    if data.meeting_url:
        lines.extend([
            "",
            "Join Session:",
            f"  {data.meeting_url}",
        ])
    else:
        lines.extend([
            "",
            "The meeting link will be available in TutorFlow before your session starts.",
        ])

    lines.extend([
        "",
        "---",
        "This is an automated notification from TutorFlow.",
    ])

    return "\n".join(lines)


@celery_app.task(
    name="send_session_scheduled_email",
    bind=True,
    autoretry_for=(EmailServiceError,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def send_session_scheduled_email(
    self,
    session_id: str,
) -> bool:
    """Asynchronous Celery task coordinating data extraction, HTML rendering,

    and delivery of the session confirmation email to the enrolled student.
    """
    try:
        session_uuid = uuid.UUID(str(session_id))
    except (ValueError, TypeError):
        logger.error(
            "Invalid session_id passed to send_session_scheduled_email",
            extra={"session_id": session_id},
        )
        return False

    logger.info(
        "Processing scheduled-session email task",
        extra={"session_id": str(session_uuid), "attempt": self.request.retries + 1},
    )

    # Phase 1: Database Load & Context Construction (SessionService delegates query)
    try:
        recipient_email, email_data = asyncio.run(_load_session_email_context(session_uuid))
    except Exception as exc:
        logger.error(
            "Database error loading session for email notification",
            extra={"session_id": str(session_uuid), "error": str(exc)},
            exc_info=True,
        )
        raise self.retry(exc=exc)

    # Exit cleanly if session deleted, cancelled, or missing email (non-retryable)
    if not recipient_email or not email_data:
        return False

    # Phase 2: Template Rendering (In-memory, DB connection already closed)
    try:
        renderer: EmailTemplateRenderer = get_template_renderer()
        html_body = renderer.render_session_scheduled(email_data)
        plain_text_body = _build_plain_text(email_data)
    except Exception as exc:
        logger.error(
            "Failed to render session scheduled email template",
            extra={"session_id": str(session_uuid), "error": str(exc)},
            exc_info=True,
        )
        return False

    # Phase 3: External Dispatch via EmailService (Network I/O)
    email_service: EmailService = get_email_service()
    subject = "Your TutorFlow session is scheduled"

    try:
        asyncio.run(
            email_service.send(
                to=recipient_email,
                subject=subject,
                html=html_body,
                text=plain_text_body,
            )
        )
        logger.info(
            "Scheduled-session email sent successfully",
            extra={
                "session_id": str(session_uuid),
                "recipient": email_service._mask_email(recipient_email),
            },
        )
        return True
    except EmailConfigurationError as exc:
        logger.error(
            "Email service configuration error. Cannot deliver email.",
            extra={"session_id": str(session_uuid), "error": str(exc)},
        )
        return False
    except EmailServiceError as exc:
        logger.warning(
            "Transient failure sending session email; retrying via Celery",
            extra={
                "session_id": str(session_uuid),
                "attempt": self.request.retries + 1,
                "error": str(exc),
            },
        )
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error(
                "Max retries exceeded for session scheduled email",
                extra={"session_id": str(session_uuid)},
            )
            return False


# =============================================================================
# 2. STUDENT ACCOUNT CREATED EMAIL TASK
# =============================================================================

async def _load_student_account_context(
    profile_id: uuid.UUID,
    temporary_password: str,
) -> tuple[Optional[str], Optional[StudentAccountCreatedEmailData]]:
    """Retrieve student profile and user details in an isolated DB scope.

    Returns:
        tuple[recipient_email, StudentAccountCreatedEmailData] or (None, None) if not found.
    """
    async with async_session_maker() as db:
        profile_repo = StudentProfileRepository(db)
        profile = await profile_repo.get_by_id_with_relations(
            profile_id=profile_id,
            include_student_user=True,
        )

        if not profile or not profile.student_user:
            logger.warning(
                "Skipping account-created email: student profile or user record not found",
                extra={"student_profile_id": str(profile_id)},
            )
            return None, None

        user = profile.student_user
        if not user.email or not user.email.strip():
            logger.error(
                "Skipping account-created email: student user has no email address",
                extra={"student_profile_id": str(profile_id)},
            )
            return None, None

        frontend_base = settings.FRONTEND_APP_URL.rstrip("/")
        login_url = f"{frontend_base}/login"

        email_data = StudentAccountCreatedEmailData(
            student_name=user.full_name.strip() if user.full_name else "Student",
            student_email=user.email.strip(),
            temporary_password=temporary_password,
            login_url=login_url,
        )

        return user.email.strip(), email_data


def _build_student_account_plain_text(data: StudentAccountCreatedEmailData) -> str:
    """Generate clean plain-text fallback content."""
    return "\n".join([
        "TutorFlow",
        "",
        f"Hi {data.student_name},",
        "",
        "Your TutorFlow student account has been created by your tutor.",
        "",
        "Your login details:",
        f"  Email: {data.student_email}",
        f"  Temporary password: {data.temporary_password}",
        "",
        f"Log in here: {data.login_url}",
        "",
        "Important: For your security, please change your password after logging in from Settings.",
        "",
        "If you were not expecting this account, please contact your tutor.",
        "",
        "---",
        "This is an automated notification from TutorFlow.",
    ])


@celery_app.task(
    name="send_student_account_created_email",
    bind=True,
    autoretry_for=(EmailServiceError,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def send_student_account_created_email(
    self,
    student_profile_id: str,
    temporary_password: str,
) -> bool:
    """Asynchronous Celery task coordinating data loading, template rendering,

    and delivery of initial credentials to the student.
    The temporary password is NEVER logged or saved to any database.
    """
    try:
        profile_uuid = uuid.UUID(str(student_profile_id))
    except (ValueError, TypeError):
        logger.error(
            "Invalid student_profile_id passed to send_student_account_created_email",
            extra={"student_profile_id": student_profile_id},
        )
        return False

    logger.info(
        "Processing student account created email task",
        extra={"student_profile_id": str(profile_uuid), "attempt": self.request.retries + 1},
    )

    # Phase 1: Database Load & Context Construction (DB connection closed immediately)
    try:
        recipient_email, email_data = asyncio.run(
            _load_student_account_context(profile_uuid, temporary_password)
        )
    except Exception as exc:
        logger.error(
            "Database error loading student profile for account email",
            extra={"student_profile_id": str(profile_uuid), "error": str(exc)},
            exc_info=True,
        )
        raise self.retry(exc=exc)

    if not recipient_email or not email_data:
        return False

    # Phase 2: Template Rendering (Pure in-memory)
    try:
        renderer: EmailTemplateRenderer = get_template_renderer()
        html_body = renderer.render_student_account_created(email_data)
        plain_text_body = _build_student_account_plain_text(email_data)
    except Exception as exc:
        logger.error(
            "Failed to render student account created email template",
            extra={"student_profile_id": str(profile_uuid), "error": str(exc)},
            exc_info=True,
        )
        return False

    # Phase 3: External Dispatch via EmailService (Network I/O)
    email_service: EmailService = get_email_service()
    subject = "Your TutorFlow account is ready"

    try:
        asyncio.run(
            email_service.send(
                to=recipient_email,
                subject=subject,
                html=html_body,
                text=plain_text_body,
            )
        )
        logger.info(
            "Student account created email sent successfully",
            extra={
                "student_profile_id": str(profile_uuid),
                "recipient": email_service._mask_email(recipient_email),
            },
        )
        return True
    except EmailConfigurationError as exc:
        logger.error(
            "Email service configuration error. Cannot deliver student account email.",
            extra={"student_profile_id": str(profile_uuid), "error": str(exc)},
        )
        return False
    except EmailServiceError as exc:
        logger.warning(
            "Transient failure sending student account email; retrying via Celery",
            extra={
                "student_profile_id": str(profile_uuid),
                "attempt": self.request.retries + 1,
                "error": str(exc),
            },
        )
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error(
                "Max retries exceeded for student account created email",
                extra={"student_profile_id": str(profile_uuid)},
            )
            return False


@celery_app.task(name="test_email_task")
def test_email_task() -> str:
    """Worker health check / smoke test."""
    return "Email worker ready"