import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.session import Session
    from app.models.student_progress import StudentProgress


class StudentProfile(Base, TimestampMixin):
    """
    Stores academic data and AI context for a student.
    In V1, each student profile is managed by a single tutor (1-to-1).
    """

    __tablename__ = "student_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # The student user account (1:1 with users table)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # The tutor who created and manages this student
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core academic fields required by the hiring prompt
    subject: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    current_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    learning_goals: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    weak_areas: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    # Relationships
    # Link back to the Student's User account
    student_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="student_profile",
    )

    # Link back to the Tutor's User account
    tutor_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[tutor_id],
        back_populates="managed_students",
    )

    # Sessions belonging to this student
    sessions: Mapped[List["Session"]] = relationship(
        "Session",
        back_populates="student_profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    progress: Mapped[Optional["StudentProgress"]] = relationship(
        "StudentProgress",
        back_populates="student_profile",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        # Optimized index for queries filtering students by tutor and subject
        Index("ix_student_profiles_tutor_subject", "tutor_id", "subject"),
    )

    def __repr__(self) -> str:
        return f"<StudentProfile id={self.id} user_id={self.user_id} subject={self.subject}>"