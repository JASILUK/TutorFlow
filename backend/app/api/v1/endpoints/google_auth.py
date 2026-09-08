"""Google OAuth connection, callback, and status endpoints."""

from __future__ import annotations

import logging
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.api.deps import DBDep, CurrentUserDep
from app.core.config import settings
from app.services.google.client import GOOGLE_SCOPES
from app.repositories.oauth_repository import UserOAuthAccountRepository
from app.schemas.google_auth import GoogleConnectionStatusResponse

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])
logger = logging.getLogger(__name__)


class GoogleAuthUrlResponse(BaseModel):
    url: str


@router.get(
    "/authorize",
    response_model=GoogleAuthUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Google OAuth connection URL",
)
async def google_authorize(
    current_user: CurrentUserDep,
) -> dict:
    """Generates Google consent URL manually without PKCE constraints."""
    scopes_str = " ".join(GOOGLE_SCOPES)
    
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(settings.GOOGLE_REDIRECT_URI, safe='')}&"
        "response_type=code&"
        f"scope={urllib.parse.quote(scopes_str, safe='')}&"
        f"state={current_user.id}&"
        "access_type=offline&"
        "include_granted_scopes=true&"
        "prompt=consent"
    )
    
    return {"url": auth_url}


@router.get(
    "/callback",
    summary="Google OAuth callback handler",
)
async def google_callback(
    db: DBDep,
    code: str = Query(...),
    state: str = Query(..., description="User ID passed during authorization"),
) -> RedirectResponse:
    """Exchanges authorization code for tokens directly via HTTP and saves them in database."""
    user_id = uuid.UUID(state)

    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)
        if response.status_code != 200:
            logger.error("Failed to fetch Google tokens: %s", response.text)
            raise ValueError(f"Failed to exchange token with Google: {response.text}")
        token_data = response.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    id_token_str = token_data.get("id_token")
    expires_in = token_data.get("expires_in", 3600)
    
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None
    scopes = token_data.get("scope", "").split()

    email = None
    if id_token_str:
        try:
            id_info = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
            email = id_info.get("email")
        except Exception as exc:
            logger.warning("Failed verifying Google ID token: %s", exc)

    oauth_repo = UserOAuthAccountRepository(db)
    await oauth_repo.upsert_tokens(
        user_id=user_id,
        provider="google",
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
        email=email,
        provider_user_id=settings.GOOGLE_CLIENT_ID,
    )
    await db.commit()

    frontend_success_url = f"{settings.FRONTEND_APP_URL}/settings?google=connected"
    return RedirectResponse(url=frontend_success_url)


@router.get(
    "/status",
    response_model=GoogleConnectionStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check if current user has connected Google Calendar",
)
async def google_connection_status(
    db: DBDep,
    current_user: CurrentUserDep,
) -> GoogleConnectionStatusResponse:
    """Returns connection status and connected Google email if present."""
    oauth_repo = UserOAuthAccountRepository(db)
    account = await oauth_repo.get_by_user_and_provider(
        user_id=current_user.id,
        provider="google",
    )
    if not account:
        return GoogleConnectionStatusResponse(connected=False, email=None, expires_at=None)

    return GoogleConnectionStatusResponse(
        connected=True,
        email=account.email,
        expires_at=account.expires_at,
    )