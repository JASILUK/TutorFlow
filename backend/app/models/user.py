import enum
import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.refresh_token import RefreshToken
    from app.models.student_profile import StudentProfile
    from app.models.oauth_account import UserOAuthAccount  


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TUTOR = "tutor"
    STUDENT = "student"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=UserRole.STUDENT,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # 1 User -> Many RefreshTokens
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # If role == 'student': 1 User -> 1 StudentProfile (their academic profile)
    student_profile: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        foreign_keys="StudentProfile.user_id",
        back_populates="student_user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # If role == 'tutor': 1 User -> Many StudentProfiles (the students they manage)
    managed_students: Mapped[List["StudentProfile"]] = relationship(
        "StudentProfile",
        foreign_keys="StudentProfile.tutor_id",
        back_populates="tutor_user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    oauth_accounts: Mapped[List["UserOAuthAccount"]] = relationship(
        "UserOAuthAccount",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role.value})>"