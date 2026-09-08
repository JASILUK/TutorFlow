from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.api.deps import CurrentUserDep, DBDep
from app.core.config import settings
from app.schemas.auth import (
    AuthResponse,
    MessageResponse,
    PasswordChangeRequest,
    TokenRefreshResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "refresh_token"
COOKIE_MAX_AGE = getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7) * 24 * 60 * 60
IS_PRODUCTION = getattr(settings, "ENVIRONMENT", "development").lower() == "production"


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Sets the refresh token in a secure, tamper-proof HttpOnly cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/api/v1/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    """Clears the refresh cookie on logout."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/v1/auth",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
    )


# =============================================================================
# 1. REGISTER
# =============================================================================

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    payload: UserRegisterRequest,
    response: Response,
    db: DBDep,
) -> AuthResponse:
    auth_service = AuthService(db)
    tokens = await auth_service.register(payload)

    set_refresh_cookie(response, tokens.raw_refresh_token)

    return AuthResponse(
        access_token=tokens.access_token,
        token_type="bearer",
        expires_in=tokens.expires_in,
        user=UserResponse.model_validate(tokens.user),
    )


# =============================================================================
# 2. LOGIN
# =============================================================================

@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and obtain tokens",
)
async def login(
    payload: UserLoginRequest,
    response: Response,
    db: DBDep,
) -> AuthResponse:
    auth_service = AuthService(db)
    tokens = await auth_service.login(payload)

    set_refresh_cookie(response, tokens.raw_refresh_token)

    return AuthResponse(
        access_token=tokens.access_token,
        token_type="bearer",
        expires_in=tokens.expires_in,
        user=UserResponse.model_validate(tokens.user),
    )


# =============================================================================
# 3. REFRESH TOKEN ROTATION
# =============================================================================

@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue new access token",
)
async def refresh_token(
    response: Response,
    db: DBDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> TokenRefreshResponse:
    auth_service = AuthService(db)
    new_access_token, new_raw_token, expires_in, user = await auth_service.refresh_tokens(
        raw_refresh_token=refresh_token or ""
    )

    # Set rotated token in cookie
    set_refresh_cookie(response, new_raw_token)

    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


# =============================================================================
# 4. LOGOUT (Current Device)
# =============================================================================

@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Log out and revoke current session",
)
async def logout(
    response: Response,
    db: DBDep,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> MessageResponse:
    auth_service = AuthService(db)
    await auth_service.logout(raw_refresh_token=refresh_token)
    clear_refresh_cookie(response)

    return MessageResponse(message="Successfully logged out.")


# =============================================================================
# 5. LOGOUT ALL SESSIONS (Every Device)
# =============================================================================

@router.post(
    "/logout-all",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Log out and revoke all active sessions across all devices",
)
async def logout_all_sessions(
    response: Response,
    db: DBDep,
    current_user: CurrentUserDep,
) -> MessageResponse:
    auth_service = AuthService(db)
    revoked_count = await auth_service.logout_all_sessions(current_user.id)
    clear_refresh_cookie(response)

    return MessageResponse(
        message=f"Successfully revoked {revoked_count} active session(s)."
    )


# =============================================================================
# 6. CHANGE PASSWORD
# =============================================================================

@router.post(
    "/change-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change password and invalidate all other active sessions",
)
async def change_password(
    payload: PasswordChangeRequest,
    response: Response,
    db: DBDep,
    current_user: CurrentUserDep,
) -> MessageResponse:
    auth_service = AuthService(db)
    await auth_service.change_password(
        user_id=current_user.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    clear_refresh_cookie(response)

    return MessageResponse(
        message="Password updated successfully. Please log in again with your new credentials."
    )


# =============================================================================
# 7. CURRENT USER PROFILE (/me)
# =============================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get details of currently authenticated user",
)
async def get_current_user_profile(
    current_user: CurrentUserDep,
) -> UserResponse:
    return UserResponse.model_validate(current_user)