import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class UserOAuthAccount(Base, TimestampMixin):
    """
    Stores external OAuth tokens and provider details.
    
    Guarantees:
    - 1 account per provider per user (e.g., user can connect 'google' once).
    - Stores refresh_token for background calendar sync without re-prompting login.
    - Stores token expiry to proactively refresh before making Google API calls.
    """

    __tablename__ = "user_oauth_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="google",
        index=True,
    )

    # Provider's user identifier (Google sub)
    provider_user_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Connected Google account email (for display in UI: "Connected as tutor@gmail.com")
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Encrypted/secured tokens
    access_token: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    refresh_token: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Granted scopes (e.g., ['https://www.googleapis.com/auth/calendar.events'])
    scopes: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Relationship back to User
    user: Mapped["User"] = relationship(
        "User",
        back_populates="oauth_accounts",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_oauth_provider"),
    )

    def __repr__(self) -> str:
        return f"<UserOAuthAccount user_id={self.user_id} provider={self.provider}>"