import logging
import math
import uuid
from typing import Any, Dict, Optional, Sequence, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    EmailAlreadyExistsException,
    ForbiddenException,
    NotFoundException,
)
from app.core.security import get_password_hash
from app.models.student_profile import StudentProfile
from app.models.user import UserRole
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.student_repository import StudentProfileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.student import StudentCreateRequest, StudentUpdateRequest
from app.models.student_progress import StudentProgress
from app.repositories.student_progress_repository import StudentProgressRepository
from app.core.exceptions import NotFoundException
logger = logging.getLogger(__name__)

class StudentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.profile_repo = StudentProfileRepository(session)
        self.token_repo = RefreshTokenRepository(session)

    # =========================================================================
    # CORE CRUD OPERATIONS
    # =========================================================================

    # =========================================================================
    # CORE CRUD OPERATIONS
    # =========================================================================

    async def create_student_with_profile(
        self,
        tutor_id: uuid.UUID,
        payload: StudentCreateRequest,
    ) -> StudentProfile:
        clean_email = payload.email.lower().strip()

        if await self.user_repo.email_exists(clean_email):
            raise EmailAlreadyExistsException(clean_email)

        # 1. Create student user account
        hashed_password = get_password_hash(payload.password)
        new_student_user = await self.user_repo.create_user(
            email=clean_email,
            hashed_password=hashed_password,
            full_name=payload.full_name.strip(),
            role=UserRole.STUDENT,
            is_active=True,
            is_verified=True,
        )

        # 2. Create academic student profile
        profile = await self.profile_repo.create_profile(
            user_id=new_student_user.id,
            tutor_id=tutor_id,
            subject=payload.subject.strip(),
            current_level=payload.current_level.strip(),
            learning_goals=payload.learning_goals.strip(),
            weak_areas=payload.weak_areas.strip(),
        )

        # Single atomic commit for user + profile
        await self.session.commit()

        # Enqueue background email notification strictly after commit
        self._dispatch_student_account_created_email(profile.id, payload.password)

        full_profile = await self.profile_repo.get_by_id_with_relations(
            profile.id,
            include_student_user=True,
        )
        return full_profile or profile

    @staticmethod
    def _dispatch_student_account_created_email(
        profile_id: uuid.UUID,
        temporary_password: str,
    ) -> None:
        """Queue Celery invitation notification without impacting database integrity."""
        try:
            from app.workers.tasks.email_tasks import send_student_account_created_email

            send_student_account_created_email.delay(str(profile_id), temporary_password)
        except Exception as exc:
            logger.warning(
                "Celery task dispatcher unavailable. Could not enqueue account created email for student %s: %s",
                profile_id,
                exc,
            )

    async def get_tutor_students(
        self,
        tutor_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        subject: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[Sequence[StudentProfile], int, int]:
        offset = (page - 1) * page_size
        items, total = await self.profile_repo.get_students_for_tutor_paginated(
            tutor_id=tutor_id,
            subject=subject,
            search_query=search,
            offset=offset,
            limit=page_size,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return items, total, total_pages

    async def get_student_details(
        self,
        profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> StudentProfile:
        profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=profile_id,
            include_student_user=True,
        )

        if not profile:
            raise NotFoundException(resource_name="StudentProfile", identifier=profile_id)

        if profile.tutor_id != tutor_id:
            raise ForbiddenException(message="You do not have access to this student profile.")

        return profile

    async def update_student(
        self,
        profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
        payload: StudentUpdateRequest,
    ) -> StudentProfile:
        profile = await self.get_student_details(profile_id, tutor_id)

        if payload.full_name is not None:
            await self.user_repo.update_user(
                profile.user_id,
                full_name=payload.full_name.strip(),
            )

        update_data = payload.model_dump(exclude_unset=True, exclude={"full_name"})
        if update_data:
            await self.profile_repo.update_profile(profile_id, **update_data)

        await self.session.commit()

        updated_profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=profile_id,
            include_student_user=True,
        )
        return updated_profile or profile

    async def toggle_student_status(
        self,
        profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
        is_active: bool,
    ) -> StudentProfile:
        profile = await self.get_student_details(profile_id, tutor_id)

        await self.user_repo.update_user(profile.user_id, is_active=is_active)

        if not is_active:
            await self.token_repo.revoke_all_for_user(profile.user_id)

        await self.session.commit()

        updated_profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=profile_id,
            include_student_user=True,
        )
        return updated_profile or profile

    async def delete_student(
        self,
        profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> bool:
        profile = await self.get_student_details(profile_id, tutor_id)
        user_id = profile.user_id

        deleted = await self.user_repo.delete(user_id)
        await self.session.commit()
        return deleted

    # =========================================================================
    # SESSION SERVICE & AI COLLABORATION METHODS
    # =========================================================================

    async def verify_student_belongs_to_tutor(
        self,
        student_profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> bool:
        """
        Fast multi-tenant validation used by SessionService before creating or
        modifying sessions. Avoids loading the full entity into memory.
        """
        return await self.profile_repo.exists_for_tutor(
            profile_id=student_profile_id,
            tutor_id=tutor_id,
        )

    async def get_profile_by_user_id(
        self,
        user_id: uuid.UUID,
    ) -> Optional[StudentProfile]:
        """
        Finds the student profile associated with an authenticated student User account.
        Used by SessionService when a student queries their sessions.
        """
        return await self.profile_repo.get_by_user_id(user_id=user_id)

    async def get_ai_student_context(
        self,
        student_profile_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Extracts pedagogical context for AI plan and debrief generation.
        Sanitizes all authentication credentials, hashes, and tokens.
        """
        profile = await self.profile_repo.get_by_id_with_relations(
            profile_id=student_profile_id,
            include_student_user=True,
        )
        if not profile:
            raise NotFoundException(resource_name="StudentProfile", identifier=student_profile_id)

        student_name = profile.student_user.full_name if profile.student_user else "Student"

        return {
            "student_profile_id": str(profile.id),
            "student_name": student_name,
            "subject": profile.subject,
            "current_level": profile.current_level,
            "learning_goals": profile.learning_goals,
            "weak_areas": profile.weak_areas,
        }


    async def get_student_progress(
        self,
        *,
        student_profile_id: uuid.UUID,
        tutor_id: uuid.UUID,
    ) -> Optional[StudentProgress]:
        """
        Fetch the current AI progress record for a student profile.
        Enforces tutor ownership before returning. Returns None if not yet generated.
        """
        # 1. Enforce ownership
        belongs = await self.verify_student_belongs_to_tutor(
            student_profile_id=student_profile_id,
            tutor_id=tutor_id,
        )
        if not belongs:
            raise NotFoundException(
                resource_name="StudentProfile",
                identifier=student_profile_id,
            )

        # 2. Fetch current progress snapshot
        progress_repo = StudentProgressRepository(self.session)
        return await progress_repo.get_by_student_profile_id(student_profile_id)