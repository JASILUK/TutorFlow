import uuid
from typing import Any, Generic, List, Optional, Sequence, Tuple, Type, TypeVar

from sqlalchemy import ColumnElement, desc, func, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.interfaces import LoaderOption

# Canonical Base matching all Alembic models and Session
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic SQLAlchemy 2.0 Async Repository providing clean CRUD 
    and dual pagination (Offset + Keyset Cursor).
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    # =========================================================================
    # CORE CRUD OPERATIONS
    # =========================================================================

    async def get_by_id(
        self,
        record_id: uuid.UUID,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Optional[ModelType]:
        stmt = select(self.model).where(self.model.id == record_id)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_one(
        self,
        *filters: ColumnElement[bool] | Any,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Optional[ModelType]:
        stmt = select(self.model).where(*filters)
        if options:
            stmt = stmt.options(*options)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, **kwargs: Any) -> ModelType:
        """Create, flush to retrieve generated defaults, and return without committing."""
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        return instance

    async def update(
        self,
        record_id: uuid.UUID,
        values: Optional[dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Optional[ModelType]:
        """
        Accepts either a values dict: repo.update(id, values={"topic": "Math"})
        or kwargs: repo.update(id, topic="Math")
        Ensures backwards compatibility with all existing repositories.
        """
        payload: dict[str, Any] = {}
        if values:
            payload.update(values)
        if kwargs:
            payload.update(kwargs)

        if not payload:
            return await self.get_by_id(record_id)

        stmt = (
            update(self.model)
            .where(self.model.id == record_id)
            .values(**payload)
            .execution_options(synchronize_session="fetch")
        )
        result = await self.session.execute(stmt)
        if result.rowcount == 0:
            return None

        await self.session.flush()
        return await self.get_by_id(record_id)

    async def delete(self, record_id: uuid.UUID) -> bool:
        """Delete by ID and flush."""
        stmt = delete(self.model).where(self.model.id == record_id)
        result = await self.session.execute(stmt)
        if result.rowcount > 0:
            await self.session.flush()
            return True
        return False

    # =========================================================================
    # 1. OFFSET PAGINATION (Kept intact for Users & Admin views)
    # =========================================================================

    async def paginate_offset(
        self,
        *,
        filters: Optional[Sequence[ColumnElement[bool] | Any]] = None,
        order_by: Optional[Any] = None,
        offset: int = 0,
        limit: int = 20,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Tuple[Sequence[ModelType], int]:
        count_stmt = select(func.count(self.model.id))
        if filters:
            count_stmt = count_stmt.where(*filters)
        total_result = await self.session.execute(count_stmt)
        total: int = total_result.scalar_one() or 0

        if total == 0:
            return [], 0

        query = select(self.model)
        if filters:
            query = query.where(*filters)

        if order_by is not None:
            query = query.order_by(order_by)
        else:
            query = query.order_by(self.model.id.desc())

        if options:
            query = query.options(*options)

        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        items = result.scalars().all()

        return items, total

    # =========================================================================
    # 2. KEYSET / CURSOR PAGINATION (Kept intact for Infinite Scroll feeds)
    # =========================================================================

    async def paginate_cursor(
        self,
        *,
        cursor_column: Any,
        cursor_value: Optional[Any] = None,
        filters: Optional[Sequence[ColumnElement[bool] | Any]] = None,
        limit: int = 20,
        descending: bool = True,
        options: Optional[Sequence[LoaderOption]] = None,
    ) -> Tuple[Sequence[ModelType], Optional[Any]]:
        query = select(self.model)
        active_filters = list(filters) if filters else []

        if cursor_value is not None:
            if descending:
                active_filters.append(cursor_column < cursor_value)
            else:
                active_filters.append(cursor_column > cursor_value)

        if active_filters:
            query = query.where(*active_filters)

        query = query.order_by(desc(cursor_column) if descending else cursor_column)

        if options:
            query = query.options(*options)

        query = query.limit(limit + 1)
        result = await self.session.execute(query)
        records = list(result.scalars().all())

        has_next = len(records) > limit
        items = records[:limit] if has_next else records

        next_cursor = None
        if has_next and items:
            last_item = items[-1]
            next_cursor = getattr(last_item, cursor_column.key)

        return items, next_cursor