import uuid
from typing import Any, List, Optional, Sequence, Tuple

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.student_profile import StudentProfile
from app.models.user import User
from app.repositories.base import BaseRepository


class StudentProfileRepository(BaseRepository[StudentProfile]):
    """
    Repository for managing student academic profiles.
    Inherits generic CRUD and pagination from BaseRepository.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(StudentProfile, session)

    # =========================================================================
    # SINGLE RECORD QUERIES (with relationship eager loading)
    # =========================================================================

    async def get_by_id_with_relations(
        self,
        profile_id: uuid.UUID,
        include_student_user: bool = True,
        include_tutor_user: bool = False,
        include_sessions: bool = False,
    ) -> Optional[StudentProfile]:
        """
        Fetch a student profile by ID with explicit eager loading
        to avoid N+1 query overhead.
        """
        options = []
        if include_student_user:
            options.append(selectinload(StudentProfile.student_user))
        if include_tutor_user:
            options.append(selectinload(StudentProfile.tutor_user))
        if include_sessions:
            options.append(selectinload(StudentProfile.sessions))

        return await self.get_by_id(profile_id, options=options)

    async def get_by_user_id(
        self,
        user_id: uuid.UUID,
        include_student_user: bool = False,
    ) -> Optional[StudentProfile]:
        """Find the academic profile belonging to a student user account."""
        options = [selectinload(StudentProfile.student_user)] if include_student_user else None
        return await self.get_one(StudentProfile.user_id == user_id, options=options)

    async def get_by_tutor_and_id(
        self,
        profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
        include_student_user: bool = True,
    ) -> Optional[StudentProfile]:
        """
        Multi-tenant authorization check: Fetch student profile only if
        managed by the requesting tutor.
        """
        options = [selectinload(StudentProfile.student_user)] if include_student_user else None
        return await self.get_one(
            StudentProfile.id == profile_id,
            StudentProfile.tutor_id == tutor_id,
            options=options,
        )

    async def exists_for_tutor(
        self,
        profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> bool:
        """
        Lightweight existence check to verify student profile ownership 
        without loading full relational models into memory.
        """
        stmt = (
            select(func.count(StudentProfile.id))
            .where(
                StudentProfile.id == profile_id,
                StudentProfile.tutor_id == tutor_id,
            )
        )
        result = await self.session.execute(stmt)
        return (result.scalar_one() or 0) > 0

    # =========================================================================
    # MUTATIONS
    # =========================================================================

    async def create_profile(
        self,
        user_id: uuid.UUID,
        tutor_id: uuid.UUID,
        subject: str,
        current_level: str,
        learning_goals: str = "",
        weak_areas: str = "",
    ) -> StudentProfile:
        """
        Instantiates and flushes a new student profile.
        Keeps transaction open for downstream service commit.
        """
        return await self.create(
            user_id=user_id,
            tutor_id=tutor_id,
            subject=subject.strip(),
            current_level=current_level.strip(),
            learning_goals=learning_goals.strip(),
            weak_areas=weak_areas.strip(),
        )

    async def update_profile(
        self,
        profile_id: uuid.UUID,
        **values: Any,
    ) -> Optional[StudentProfile]:
        """Updates profile columns (subject, level, learning_goals, weak_areas)."""
        if "subject" in values and isinstance(values["subject"], str):
            values["subject"] = values["subject"].strip()
        if "current_level" in values and isinstance(values["current_level"], str):
            values["current_level"] = values["current_level"].strip()

        return await self.update(profile_id, **values)

    # =========================================================================
    # PAGINATED TUTOR DASHBOARD QUERIES
    # =========================================================================

    async def get_students_for_tutor_paginated(
        self,
        tutor_id: uuid.UUID,
        subject: Optional[str] = None,
        search_query: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[Sequence[StudentProfile], int]:
        """
        Paginated student list for a tutor's dashboard.
        - Uses index ix_student_profiles_tutor_subject when filtering by subject.
        - Pre-loads student_user via selectinload to display names/emails without extra queries.
        """
        filters: List[ColumnElement[bool]] = [StudentProfile.tutor_id == tutor_id]

        if subject:
            filters.append(func.lower(StudentProfile.subject) == subject.lower().strip())

        if search_query:
            term = f"%{search_query.lower().strip()}%"
            query_join_filter = StudentProfile.student_user.has(
                (func.lower(User.full_name).like(term)) | (func.lower(User.email).like(term))
            )
            filters.append(query_join_filter)

        return await self.paginate_offset(
            filters=filters,
            order_by=StudentProfile.created_at.desc(),
            offset=offset,
            limit=limit,
            options=[selectinload(StudentProfile.student_user)],
        )

    async def count_students_by_tutor(self, tutor_id: uuid.UUID) -> int:
        """Fast index count of total students managed by a tutor."""
        stmt = (
            select(func.count(StudentProfile.id))
            .where(StudentProfile.tutor_id == tutor_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0