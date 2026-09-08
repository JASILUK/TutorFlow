"""Service orchestrating Google Calendar events and Google Meet generation."""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.google.client import GoogleProviderClient
from app.models.session import Session
from app.repositories.oauth_repository import UserOAuthAccountRepository
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)


class GoogleCalendarService:
    """Orchestrates Google Calendar and Google Meet scheduling for Sessions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.oauth_repo = UserOAuthAccountRepository(db)
        self.session_repo = SessionRepository(db)

    async def sync_session_to_calendars(
        self,
        *,
        session: Session,
    ) -> Session:
        """
        1. Checks tutor Google connection. If connected, creates calendar event & generates Meet link.
        2. Checks student Google connection. If connected, creates calendar event on student's calendar too.
        3. Updates session with meeting_url and event IDs.
        """
        tutor_id = session.tutor_id
        student_user_id = (
            session.student_profile.user_id
            if session.student_profile and hasattr(session.student_profile, "user_id")
            else None
        )
        student_email = (
            session.student_profile.student_user.email
            if session.student_profile and session.student_profile.student_user
            else None
        )

        # 1. Fetch Tutor OAuth credentials
        tutor_oauth = await self.oauth_repo.get_by_user_and_provider(
            user_id=tutor_id,
            provider="google",
        )

        if not tutor_oauth:
            logger.info("Tutor %s has not connected Google Calendar. Skipping calendar sync.", tutor_id)
            return session

        # 2. Initialize Tutor Google Client
        tutor_client = GoogleProviderClient(
            access_token=tutor_oauth.access_token,
            refresh_token=tutor_oauth.refresh_token,
            token_expiry=tutor_oauth.expires_at,
        )

        has_custom_url = bool(session.meeting_url and session.meeting_url.strip())
        generate_meet = not has_custom_url

        attendee_emails = [student_email] if student_email else []
        summary = f"TutorFlow: {session.topic}"
        description = f"Tutoring session for {session.topic}.\nScheduled via TutorFlow."

        # 3. Create Event on Tutor's Calendar (Generates Meet link if needed)
        tutor_event = await tutor_client.create_calendar_event(
            summary=summary,
            description=description,
            start_time=session.scheduled_start,
            end_time=session.scheduled_end,
            attendee_emails=attendee_emails,
            generate_meet=generate_meet,
            custom_meeting_url=session.meeting_url,
        )

        event_id = tutor_event.get("id")
        meet_link = session.meeting_url
        meet_data = None
        is_meet = False

        if generate_meet:
            meet_link = tutor_event.get("hangoutLink")
            conference_data = tutor_event.get("conferenceData", {})
            if conference_data:
                is_meet = True
                meet_data = conference_data

        # 4. Check if Student is also connected to Google
        if student_user_id:
            student_oauth = await self.oauth_repo.get_by_user_and_provider(
                user_id=student_user_id,
                provider="google",
            )
            if student_oauth:
                try:
                    student_client = GoogleProviderClient(
                        access_token=student_oauth.access_token,
                        refresh_token=student_oauth.refresh_token,
                        token_expiry=student_oauth.expires_at,
                    )
                    # Create matching event on student's calendar using the generated Meet link
                    await student_client.create_calendar_event(
                        summary=summary,
                        description=f"{description}\n\nJoin Meeting: {meet_link}",
                        start_time=session.scheduled_start,
                        end_time=session.scheduled_end,
                        attendee_emails=[],
                        generate_meet=False,
                        custom_meeting_url=meet_link,
                    )
                    logger.info("Successfully mirrored calendar event to student %s calendar", student_user_id)
                except Exception as exc:
                    logger.error("Failed syncing calendar event to student calendar: %s", exc)

        # 5. Save results to Session table
        await self.session_repo.update(
            session_id=session.id,
            values={
                "google_calendar_event_id": event_id,
                "meeting_url": meet_link,
                "is_google_meet": is_meet,
                "google_meet_data": meet_data,
            },
        )

        # Update refreshed tutor token if necessary
        if tutor_client._credentials.token != tutor_oauth.access_token:
            await self.oauth_repo.upsert_tokens(
                user_id=tutor_id,
                provider="google",
                access_token=tutor_client._credentials.token,
                expires_at=tutor_client._credentials.expiry,
            )

        await self.db.commit()
        return session