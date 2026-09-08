import uuid
from typing import List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.interfaces import LoaderOption

from app.models.student_progress import StudentProgress
from app.repositories.base import BaseRepository


class StudentProgressRepository(BaseRepository[StudentProgress]):
    """
    SQLAlchemy 2.0 repository for the StudentProgress entity.
    Governs reading and upserting the longitudinal AI progress snapshot.
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(model=StudentProgress, session=session)

    async def get_by_student_profile_id(
        self,
        student_profile_id: uuid.UUID,
        *,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Optional[StudentProgress]:
        """
        Fetch the current progress snapshot by student_profile_id.
        Since student_profile_id is UNIQUE, this returns at most one record.
        """
        stmt = select(StudentProgress).where(
            StudentProgress.student_profile_id == student_profile_id
        )
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_progress(
        self,
        *,
        student_profile_id: uuid.UUID,
        overall_summary: str,
        strengths: List[str],
        areas_to_improve: List[str],
        recommended_focus: str,
    ) -> StudentProgress:
        """
        Atomic upsert using PostgreSQL ON CONFLICT on the unique student_profile_id.

        - If no record exists: inserts a new row.
        - If a record already exists: updates fields in-place.
        - Flushes to make updated data immediately available without committing.
        """
        insert_stmt = insert(StudentProgress).values(
            id=uuid.uuid4(),
            student_profile_id=student_profile_id,
            overall_summary=overall_summary.strip(),
            strengths=strengths,
            areas_to_improve=areas_to_improve,
            recommended_focus=recommended_focus.strip(),
        )

        upsert_stmt = (
            insert_stmt.on_conflict_do_update(
                index_elements=[StudentProgress.student_profile_id],
                set_={
                    "overall_summary": insert_stmt.excluded.overall_summary,
                    "strengths": insert_stmt.excluded.strengths,
                    "areas_to_improve": insert_stmt.excluded.areas_to_improve,
                    "recommended_focus": insert_stmt.excluded.recommended_focus,
                },
            )
            .returning(StudentProgress)
        )

        result = await self.session.execute(upsert_stmt)
        await self.session.flush()
        return result.scalar_one()

    async def delete_by_student_profile_id(
        self,
        student_profile_id: uuid.UUID,
    ) -> bool:
        """
        Explicitly removes a progress snapshot for a given student profile.
        """
        record = await self.get_by_student_profile_id(student_profile_id)
        if not record:
            return False
        return await self.delete(record.id)