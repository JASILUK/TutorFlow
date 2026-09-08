"""Google Calendar & Meet provider integration client."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.events",
]


class GoogleAPIError(AppException):
    def __init__(self, message: str = "Google Calendar integration failure.") -> None:
        super().__init__(message=message, status_code=502, error_code="GOOGLE_API_ERROR")


class GoogleProviderClient:
    """Wrapper around Google OAuth2 credentials and Google Calendar API v3."""

    def __init__(
        self,
        *,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_expiry: Optional[datetime] = None,
    ) -> None:
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expiry = token_expiry
        self._credentials = self._init_credentials()

    def _init_credentials(self) -> Credentials:
        expiry = self.token_expiry
        if expiry is not None:
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            else:
                expiry = expiry.astimezone(timezone.utc)

        return Credentials(
            token=self.access_token,
            refresh_token=self.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=GOOGLE_SCOPES,
            expiry=expiry,
        )

    def get_valid_credentials(self) -> Credentials:
        """Refreshes the access token synchronously if expired."""
        if not self._credentials.valid:
            if self._credentials.expired and self._credentials.refresh_token:
                try:
                    self._credentials.refresh(Request())
                    logger.info("Successfully refreshed Google OAuth access token")
                except Exception as exc:
                    logger.error("Failed refreshing Google access token: %s", exc)
                    raise GoogleAPIError("Failed to refresh Google OAuth authorization.") from exc
            else:
                raise GoogleAPIError("Google OAuth credentials expired or revoked. Please reconnect.")
        return self._credentials

    def _sync_create_event(
        self,
        *,
        summary: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        attendee_emails: List[str],
        generate_meet: bool = False,
        custom_meeting_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        creds = self.get_valid_credentials()
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)

        event_body: Dict[str, Any] = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"},
            "attendees": [{"email": email} for email in attendee_emails if email],
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 60},
                    {"method": "popup", "minutes": 15},
                ],
            },
        }

        if custom_meeting_url and not generate_meet:
            event_body["location"] = custom_meeting_url
            event_body["description"] = f"{description}\n\nMeeting Link: {custom_meeting_url}"

        conference_data_version = 0
        if generate_meet:
            conference_data_version = 1
            event_body["conferenceData"] = {
                "createRequest": {
                    "requestId": str(uuid.uuid4()),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            }

        try:
            return (
                service.events()
                .insert(
                    calendarId="primary",
                    body=event_body,
                    conferenceDataVersion=conference_data_version,
                    sendUpdates="all",
                )
                .execute()
            )
        except Exception as exc:
            logger.error("Google Calendar insert event failed: %s", exc)
            raise GoogleAPIError(f"Failed to create Google Calendar event: {exc}") from exc

    async def create_calendar_event(
        self,
        *,
        summary: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        attendee_emails: List[str],
        generate_meet: bool = False,
        custom_meeting_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Runs the blocking Google API call in an asyncio executor."""
        return await asyncio.to_thread(
            self._sync_create_event,
            summary=summary,
            description=description,
            start_time=start_time,
            end_time=end_time,
            attendee_emails=attendee_emails,
            generate_meet=generate_meet,
            custom_meeting_url=custom_meeting_url,
        )