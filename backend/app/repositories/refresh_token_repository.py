import uuid
from datetime import datetime, timezone
from typing import List, Optional, Sequence

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.refresh_token import RefreshToken
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    """
    Dedicated repository for RefreshToken operations.
    Handles storage, verification, session listing, and revocation.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(RefreshToken, session)

    # =========================================================================
    # TOKEN CREATION
    # =========================================================================

    async def create_token(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> RefreshToken:
        """Stores a new hashed refresh token in PostgreSQL."""
        return await self.create(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

    # =========================================================================
    # TOKEN VERIFICATION QUERIES
    # =========================================================================

    async def get_active_by_hash(
        self,
        token_hash: str,
        load_user: bool = True,
    ) -> Optional[RefreshToken]:
        """
        Used by POST /auth/refresh.
        Finds an active, unrevoked, unexpired token by its SHA-256 hash.
        Eagerly loads the User using selectinload to eliminate N+1 queries.
        """
        now = datetime.now(timezone.utc)
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        if load_user:
            stmt = stmt.options(selectinload(RefreshToken.user))

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_by_user_and_hash(
        self,
        user_id: uuid.UUID,
        token_hash: str,
    ) -> Optional[RefreshToken]:
        """
        Scattered verification: checks that a token belongs to a specific user.
        Utilizes both unique token_hash index and composite user_id indexes.
        """
        now = datetime.now(timezone.utc)
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_sessions_for_user(
        self,
        user_id: uuid.UUID,
    ) -> Sequence[RefreshToken]:
        """
        Lists all active devices/sessions for a user.
        Uses ix_refresh_tokens_user_active (user_id, expires_at).
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # =========================================================================
    # REVOCATION & CLEANUP
    # =========================================================================

    async def revoke_by_hash(self, token_hash: str) -> bool:
        """
        Revokes a single token on standard logout or rotation.
        Sets revoked_at timestamp without deleting the audit trail row.
        """
        stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def revoke_by_user_and_hash(
        self,
        user_id: uuid.UUID,
        token_hash: str,
    ) -> bool:
        """Revokes a specific token guaranteed to belong to the given user."""
        stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> int:
        """
        Revokes all active sessions for a user.
        Used for 'Log out of all devices' or upon password reset.
        """
        stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        return result.rowcount

    async def purge_expired_or_revoked(self) -> int:
        """
        Background maintenance job:
        Permanently deletes tokens that have either expired or been revoked.
        """
        now = datetime.now(timezone.utc)
        stmt = delete(RefreshToken).where(
            (RefreshToken.expires_at <= now) | (RefreshToken.revoked_at.is_not(None))
        )
        result = await self.session.execute(stmt)
        return result.rowcount