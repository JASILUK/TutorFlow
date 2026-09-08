import uuid
from typing import Annotated, AsyncGenerator, List

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_maker
from app.core.security import decode_access_token
from app.models.user import User, UserRole

# Reusable Bearer scheme; handles "Authorization: Bearer <token>"
security_scheme = HTTPBearer(auto_error=False)


# ==========================================
# 1. DATABASE SESSION DEPENDENCY
# ==========================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an independent async session per request and guarantees
    the connection is cleanly closed when the request completes.
    """
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


DBDep = Annotated[AsyncSession, Depends(get_db)]


# ==========================================
# 2. TOKEN EXTRACTION (Bearer Header OR Cookie)
# ==========================================

def get_token_from_header_or_cookie(
    request: Request,
    auth_header: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
) -> str:
    """
    Extracts access token from Authorization header first.
    If missing, falls back to checking an 'access_token' cookie.
    """
    if auth_header and auth_header.credentials:
        return auth_header.credentials

    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ==========================================
# 3. CURRENT USER DEPENDENCY
# ==========================================

async def get_current_user(
    db: DBDep,
    token: Annotated[str, Depends(get_token_from_header_or_cookie)],
) -> User:
    """
    Decodes the JWT, loads the active user from PostgreSQL,
    and attaches the full User instance to the request.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        # Reject tokens missing a subject or that aren't access tokens
        if not user_id_str or token_type != "access":
            raise credentials_exception

        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    # Query the user from the database
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


# ==========================================
# 4. ROLE-BASED ACCESS GUARDS (RBAC)
# ==========================================

class RoleChecker:
    """
    Callable class used to restrict endpoints to specific UserRoles.
    Admin always bypasses role restrictions.
    """

    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: CurrentUserDep) -> User:
        if current_user.role == UserRole.ADMIN:
            return current_user

        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires role: {[r.value for r in self.allowed_roles]}",
            )
        return current_user


# Type-annotated dependencies ready to plug directly into endpoint definitions
RequireTutor = Annotated[User, Depends(RoleChecker([UserRole.TUTOR]))]
RequireStudent = Annotated[User, Depends(RoleChecker([UserRole.STUDENT]))]
RequireAdmin = Annotated[User, Depends(RoleChecker([UserRole.ADMIN]))]