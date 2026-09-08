import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

# 1. Password hashing context using Argon2 via pwdlib
password_hash = PasswordHash((Argon2Hasher(),))


# ==========================================
# PASSWORD UTILITIES
# ==========================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the provided password matches the stored Argon2 hash."""
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a secure Argon2 hash for a user password."""
    return password_hash.hash(password)


# ==========================================
# ACCESS TOKEN (JWT) UTILITIES
# ==========================================

def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Creates a signed JWT access token.
    'sub' holds the user's UUID string.
    'role' holds 'tutor', 'student', or 'admin'.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and cryptographically verifies the JWT signature and expiration.
    Raises jwt.PyJWTError if invalid, expired, or tampered with.
    """
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


# ==========================================
# REFRESH TOKEN (OPAQUE STRING + HASH)
# ==========================================

def hash_token(raw_token: str) -> str:
    """
    Computes a one-way SHA-256 hash of a raw token string.
    This hash is what gets stored in the 'refresh_tokens' table.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> tuple[str, str, datetime]:
    """
    Generates:
      1. raw_token: sent back to the user client
      2. token_hash: saved to database
      3. expires_at: timestamp when this token becomes invalid
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = hash_token(raw_token)

    refresh_days = getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 7)
    expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_days)

    return raw_token, token_hash, expires_at