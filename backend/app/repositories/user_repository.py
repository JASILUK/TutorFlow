import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional, Sequence, Tuple

from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """
    Production-grade repository for User and RefreshToken persistence.
    Inherits generic CRUD and dual pagination from BaseRepository.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    # =========================================================================
    # SINGLE USER QUERIES (with eager-load options to eliminate N+1)
    # =========================================================================

    async def get_by_id_with_relations(
        self,
        user_id: uuid.UUID,
        include_student_profile: bool = False,
        include_managed_students: bool = False,
    ) -> Optional[User]:
        """
        Fetch a user by ID, optionally loading their student profile or 
        managed students using selectinload to avoid N+1 query overhead.
        """
        options = []
        if include_student_profile:
            options.append(selectinload(User.student_profile))
        if include_managed_students:
            options.append(selectinload(User.managed_students))

        return await self.get_by_id(user_id, options=options)

    async def get_by_email(
        self,
        email: str,
        include_student_profile: bool = False,
    ) -> Optional[User]:
        """Fetch user by unique email (case-insensitive & trimmed)."""
        clean_email = email.lower().strip()
        options = [selectinload(User.student_profile)] if include_student_profile else None
        
        stmt = select(User).where(func.lower(User.email) == clean_email)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        """Lightweight existence check without materializing the full model."""
        stmt = select(func.count(User.id)).where(func.lower(User.email) == email.lower().strip())
        result = await self.session.execute(stmt)
        return (result.scalar_one() or 0) > 0

    # =========================================================================
    # USER MUTATIONS
    # =========================================================================

    async def create_user(
        self,
        email: str,
        hashed_password: str,
        full_name: str,
        role: UserRole = UserRole.STUDENT,
        is_active: bool = True,
        is_verified: bool = False,
    ) -> User:
        """Creates a new user record and flushes to populate defaults/UUIDs."""
        return await self.create(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            full_name=full_name.strip(),
            role=role,
            is_active=is_active,
            is_verified=is_verified,
        )

    async def update_user(
        self,
        user_id: uuid.UUID,
        **values: Any,
    ) -> Optional[User]:
        """Updates user columns (full_name, is_active, hashed_password, etc.)."""
        # Ensure email changes stay lowercased if provided
        if "email" in values and isinstance(values["email"], str):
            values["email"] = values["email"].lower().strip()

        return await self.update(user_id, **values)

    async def update_password(
        self,
        user_id: uuid.UUID,
        new_hashed_password: str,
    ) -> bool:
        """Direct password hash update."""
        user = await self.update(user_id, hashed_password=new_hashed_password)
        return user is not None

    async def mark_verified(self, user_id: uuid.UUID) -> Optional[User]:
        """Mark account email verification as True."""
        return await self.update(user_id, is_verified=True)

    # =========================================================================
    # FILTERED & PAGINATED QUERIES
    # =========================================================================

    async def get_users_paginated(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        search_query: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[Sequence[User], int]:
        """
        Offset pagination with optional filters for role, status, and name/email search.
        """
        filters: List[ColumnElement[bool]] = []

        if role is not None:
            filters.append(User.role == role)

        if is_active is not None:
            filters.append(User.is_active == is_active)

        if search_query:
            term = f"%{search_query.lower().strip()}%"
            filters.append(
                (func.lower(User.full_name).like(term)) | (func.lower(User.email).like(term))
            )

        return await self.paginate_offset(
            filters=filters,
            order_by=User.created_at.desc(),
            offset=offset,
            limit=limit,
        )

    # =========================================================================
    # REFRESH TOKEN OPERATIONS (Encapsulated in UserRepository)
    # =========================================================================

    async def save_refresh_token(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> RefreshToken:
        """
        Stores the SHA-256 hashed refresh token in the database.
        Flushes so the row is recorded in the current transaction.
        """
        token_entry = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.session.add(token_entry)
        await self.session.flush()
        return token_entry

    async def get_active_refresh_token(
        self,
        token_hash: str,
        load_user: bool = True,
    ) -> Optional[RefreshToken]:
        """
        Fetches an active, non-revoked, and unexpired refresh token.
        Eagerly loads the associated User to prevent an extra query.
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

    async def revoke_refresh_token(self, token_hash: str) -> bool:
        """Revokes a specific refresh token upon logout or rotation."""
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

    async def revoke_all_user_refresh_tokens(self, user_id: uuid.UUID) -> int:
        """
        Revokes all active sessions for a user (security reset / password change).
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