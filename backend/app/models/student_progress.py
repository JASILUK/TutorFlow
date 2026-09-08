import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.student_profile import StudentProfile


class StudentProgress(Base, TimestampMixin):
    """
    Stores a consolidated, longitudinal learning progress snapshot synthesized by AI.
    
    Architecture Guarantees:
    - Strictly 1-to-1 with student_profiles via UNIQUE foreign key constraint.
    - Preserves independent updated_at for tracking exactly when AI review occurred.
    - JSONB storage for strengths and areas_to_improve allows schema flexibility.
    - Cascades on delete if the parent StudentProfile is deleted.
    """

    __tablename__ = "student_progress"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # 1:1 relation to student_profiles
    student_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Holistic synthesis across completed sessions
    overall_summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Validated list of demonstrated competencies (stored as JSONB array of strings)
    strengths: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Validated list of persistent gaps or misconceptions (stored as JSONB array of strings)
    areas_to_improve: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Primary pedagogical directive for upcoming sessions
    recommended_focus: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # Bi-directional 1-to-1 relationship with StudentProfile
    student_profile: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        back_populates="progress",
    )

    __table_args__ = (
        Index("ix_student_progress_profile_id", "student_profile_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<StudentProgress id={self.id} "
            f"student_profile_id={self.student_profile_id}>"
        )