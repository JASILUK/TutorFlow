"""Repository for managing external OAuth accounts and provider tokens."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_account import UserOAuthAccount
from app.repositories.base import BaseRepository


class UserOAuthAccountRepository(BaseRepository[UserOAuthAccount]):
    """
    SQLAlchemy 2.0 repository for user OAuth tokens.
    Handles token upserts, multi-provider lookups, and token revocation.
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(model=UserOAuthAccount, session=session)

    async def get_by_user_and_provider(
        self,
        *,
        user_id: uuid.UUID,
        provider: str = "google",
    ) -> Optional[UserOAuthAccount]:
        """
        Retrieve a user's active OAuth tokens for a specific provider.
        """
        stmt = select(UserOAuthAccount).where(
            UserOAuthAccount.user_id == user_id,
            UserOAuthAccount.provider == provider,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_tokens(
        self,
        *,
        user_id: uuid.UUID,
        provider: str = "google",
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        scopes: Optional[List[str]] = None,
        email: Optional[str] = None,
        provider_user_id: Optional[str] = None,
    ) -> UserOAuthAccount:
        """
        Atomic upsert for OAuth credentials.

        If the user already connected this provider:
        - Updates access_token, expires_at, and scopes.
        - Preserves the existing refresh_token if the incoming one is None
          (Google only issues refresh_token on the first prompt or forced consent).
        """
        insert_values = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "provider": provider,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "scopes": scopes or [],
            "email": email,
            "provider_user_id": provider_user_id,
        }

        update_values = {
            "access_token": access_token,
            "expires_at": expires_at,
            "scopes": scopes or [],
        }

        # Keep existing refresh token if Google didn't reissue one on this login
        if refresh_token:
            update_values["refresh_token"] = refresh_token
        if email:
            update_values["email"] = email
        if provider_user_id:
            update_values["provider_user_id"] = provider_user_id

        stmt = (
            insert(UserOAuthAccount)
            .values(**insert_values)
            .on_conflict_do_update(
                constraint="uq_user_oauth_provider",
                set_=update_values,
            )
            .returning(UserOAuthAccount)
        )

        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.scalar_one()

    async def disconnect_provider(
        self,
        *,
        user_id: uuid.UUID,
        provider: str = "google",
    ) -> bool:
        """
        Removes the OAuth link and tokens for a given provider.
        """
        stmt = delete(UserOAuthAccount).where(
            UserOAuthAccount.user_id == user_id,
            UserOAuthAccount.provider == provider,
        )
        result = await self.session.execute(stmt)
        if result.rowcount > 0:
            await self.session.flush()
            return True
        return False