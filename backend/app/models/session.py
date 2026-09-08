import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.homework import HomeworkTask
    from app.models.student_profile import StudentProfile
    from app.models.user import User


class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    AI_REVIEWED = "ai_reviewed"


class Session(Base, TimestampMixin):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Ownership & relationships
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    student_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Scheduling
    topic: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Meeting URL (custom provided link OR generated Google Meet)
    meeting_url: Mapped[Optional[str]] = mapped_column(
        String(2048),
        nullable=True,
    )

    # Google Calendar & Meet Sync Integration
    google_calendar_event_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    is_google_meet: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Extended conference details (conferenceId, dial-in, pin, etc.)
    google_meet_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
    )

    # Lifecycle
    status: Mapped[SessionStatus] = mapped_column(
        Enum(
            SessionStatus,
            name="session_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=SessionStatus.SCHEDULED,
        nullable=False,
        index=True,
    )

    # Runtime timestamps
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    # Tutor notes
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    # Pre-session AI plan
    ai_plan: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
    )

    # Post-session AI debrief
    ai_session_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    ai_suggested_focus: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    tutor: Mapped["User"] = relationship(
        "User",
        foreign_keys=[tutor_id],
    )

    student_profile: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        back_populates="sessions",
    )

    homework_tasks: Mapped[List["HomeworkTask"]] = relationship(
        "HomeworkTask",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index(
            "ix_sessions_tutor_active_window",
            "tutor_id",
            "scheduled_start",
            "scheduled_end",
            postgresql_where=text(
                "status IN ('scheduled', 'in_progress')"
            ),
        ),
    )

    # =========================================================================
    # DERIVED DISPLAY ATTRIBUTES (For Pydantic from_attributes Serialization)
    # =========================================================================

    @property
    def tutor_name(self) -> str:
        """Display name of the tutor conducting this session."""
        if self.tutor and hasattr(self.tutor, "full_name"):
            return self.tutor.full_name
        return ""

    @property
    def student_name(self) -> str:
        """Display name of the student enrolled in this session."""
        if (
            self.student_profile
            and getattr(self.student_profile, "student_user", None)
            and hasattr(self.student_profile.student_user, "full_name")
        ):
            return self.student_profile.student_user.full_name
        return ""

    def __repr__(self) -> str:
        return (
            f"<Session id={self.id} "
            f"topic='{self.topic}' "
            f"status='{self.status.value}'>"
        )