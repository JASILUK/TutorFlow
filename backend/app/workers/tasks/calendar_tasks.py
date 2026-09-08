"""Celery worker tasks for Google Calendar & Meet synchronization."""

from __future__ import annotations

import asyncio
import logging
import uuid

from celery.exceptions import MaxRetriesExceededError

from app.core.database import async_session_maker
from app.repositories.session_repository import SessionRepository
from app.services.google.google_calendar_service import GoogleCalendarService
from app.workers.celery_app import celery_app
from app.workers.tasks.email_tasks import send_session_scheduled_email

logger = logging.getLogger(__name__)


async def _execute_calendar_sync(session_id: uuid.UUID) -> bool:
    """Isolated DB session scope to sync session to Google Calendars."""
    async with async_session_maker() as db:
        session_repo = SessionRepository(db)
        
        # Clean repository method call — no ORM query logic in the task
        session = await session_repo.get_by_id_with_calendar_relations(session_id)

        if not session:
            logger.warning("Skipping calendar sync: session not found", extra={"session_id": str(session_id)})
            return False

        calendar_service = GoogleCalendarService(db)
        await calendar_service.sync_session_to_calendars(session=session)
        return True

@celery_app.task(
    name="sync_session_google_calendar",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def sync_session_google_calendar(self, session_id: str) -> bool:
    """Asynchronous Celery task creating Google Calendar event & Meet link, then queuing email."""
    try:
        session_uuid = uuid.UUID(str(session_id))
    except (ValueError, TypeError):
        logger.error("Invalid session_id passed to sync_session_google_calendar", extra={"session_id": session_id})
        return False

    logger.info("Processing Google Calendar sync task", extra={"session_id": str(session_uuid), "attempt": self.request.retries + 1})

    try:
        asyncio.run(_execute_calendar_sync(session_uuid))
        logger.info("Google Calendar sync task completed successfully", extra={"session_id": str(session_uuid)})

        # Chain email task here so email goes out AFTER Meet link is generated and saved
        send_session_scheduled_email.delay(session_id)
        logger.info("Queued send_session_scheduled_email task after successful calendar sync", extra={"session_id": str(session_uuid)})

        return True
    except Exception as exc:
        logger.warning("Transient failure in Google Calendar sync; retrying", extra={"session_id": str(session_uuid), "error": str(exc)})
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            logger.error("Max retries exceeded for Google Calendar sync", extra={"session_id": str(session_uuid)})
            return False