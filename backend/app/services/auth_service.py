import uuid
from dataclasses import dataclass
from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    EmailAlreadyExistsException,
    InactiveUserException,
    InvalidCredentialsException,
    InvalidRefreshTokenException,
)
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserLoginRequest, UserRegisterRequest


@dataclass(frozen=True)
class AuthTokens:
    """Internal DTO to bundle tokens and user data returned to endpoints."""
    access_token: str
    raw_refresh_token: str
    expires_in: int
    user: User


class AuthService:
    """
    Business service orchestrating identity verification,
    registration, session persistence, and token rotation.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.token_repo = RefreshTokenRepository(session)

    # =========================================================================
    # 1. USER REGISTRATION
    # =========================================================================

    async def register(self, payload: UserRegisterRequest) -> AuthTokens:
        """
        Registers a new user, hashes their password, persists their account,
        issues initial session tokens, and commits the transaction atomically.
        """
        clean_email = payload.email.lower().strip()

        # Check for email conflict
        if await self.user_repo.email_exists(clean_email):
            raise EmailAlreadyExistsException(clean_email)

        # Hash password and persist user
        hashed_password = get_password_hash(payload.password)
        new_user = await self.user_repo.create_user(
            email=clean_email,
            hashed_password=hashed_password,
            full_name=payload.full_name,
            role=payload.role,
            is_active=True,
            is_verified=False,
        )

        # Issue and persist session tokens
        tokens = await self._issue_session_tokens(new_user)

        # Commit transaction atomically
        await self.session.commit()
        await self.session.refresh(new_user)

        return tokens

    # =========================================================================
    # 2. USER AUTHENTICATION / LOGIN
    # =========================================================================

    async def login(self, payload: UserLoginRequest) -> AuthTokens:
        """
        Authenticates user credentials, verifies active status,
        records a new session, and commits the transaction.
        """
        user = await self.user_repo.get_by_email(payload.email)

        # Constant-time comparison prevents user enumeration via timing attacks
        if not user or not verify_password(payload.password, user.hashed_password):
            raise InvalidCredentialsException()

        if not user.is_active:
            raise InactiveUserException()

        tokens = await self._issue_session_tokens(user)

        await self.session.commit()
        return tokens

    # =========================================================================
    # 3. TOKEN ROTATION (REFRESH)
    # =========================================================================

    async def refresh_tokens(self, raw_refresh_token: str) -> Tuple[str, str, int]:
        """
        Rotates refresh tokens to prevent replay attacks:
        1. Verifies the incoming raw refresh token hash.
        2. Revokes the old refresh token immediately.
        3. Generates a fresh refresh token and fresh access token.
        4. Commits changes and returns (new_access_token, new_raw_refresh_token, expires_in).
        """
        if not raw_refresh_token:
            raise InvalidRefreshTokenException(
                message="Refresh token is missing or empty."
            )

        current_token_hash = hash_token(raw_refresh_token)
        token_entry = await self.token_repo.get_active_by_hash(
            current_token_hash, load_user=True
        )

        if not token_entry:
            raise InvalidRefreshTokenException(
                message="Invalid, revoked, or expired refresh token. Please sign in again."
            )

        user = token_entry.user
        if not user or not user.is_active:
            raise InactiveUserException(
                message="User account associated with this session is inactive."
            )

        # 1. Invalidate old token (Rotation)
        await self.token_repo.revoke_by_hash(current_token_hash)

        # 2. Issue replacement pair
        new_raw_token, new_token_hash, expires_at = generate_refresh_token()
        await self.token_repo.create_token(
            user_id=user.id,
            token_hash=new_token_hash,
            expires_at=expires_at,
        )

        # 3. Create fresh JWT access token
        access_token_expires = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        new_access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
        )

        await self.session.commit()
        return new_access_token, new_raw_token, access_token_expires, user

    # =========================================================================
    # 4. LOGOUT & REVOCATION
    # =========================================================================

    async def logout(self, raw_refresh_token: Optional[str]) -> bool:
        """
        Revokes the specific refresh token session in PostgreSQL.
        """
        if not raw_refresh_token:
            return False

        token_hash = hash_token(raw_refresh_token)
        revoked = await self.token_repo.revoke_by_hash(token_hash)
        await self.session.commit()
        return revoked

    async def logout_all_sessions(self, user_id: uuid.UUID) -> int:
        """
        Revokes all active refresh tokens for a user across all devices.
        """
        revoked_count = await self.token_repo.revoke_all_for_user(user_id)
        await self.session.commit()
        return revoked_count

    # =========================================================================
    # 5. PASSWORD MANAGEMENT
    # =========================================================================

    async def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        Verifies old password, updates hash, and revokes all active sessions.
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user or not verify_password(current_password, user.hashed_password):
            raise BadRequestException(
                message="Current password verification failed.",
                error_code="INVALID_CURRENT_PASSWORD",
            )

        new_hash = get_password_hash(new_password)
        await self.user_repo.update_password(user_id, new_hash)

        # Invalidate existing sessions for security
        await self.token_repo.revoke_all_for_user(user_id)
        await self.session.commit()
        return True

    # =========================================================================
    # INTERNAL HELPERS
    # =========================================================================

    async def _issue_session_tokens(self, user: User) -> AuthTokens:
        """Helper to construct and persist access + refresh token pairs."""
        raw_refresh_token, token_hash, expires_at = generate_refresh_token()

        # Persist refresh token hash in DB
        await self.token_repo.create_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        # Issue access token
        access_token_expires = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
        )

        return AuthTokens(
            access_token=access_token,
            raw_refresh_token=raw_refresh_token,
            expires_in=access_token_expires,
            user=user,
        )