from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# 1. Non-blocking Async Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,      # Tests connection liveness before checkout
    pool_size=10,            # Persistent open connections in the pool
    max_overflow=20,         # Maximum temporary surge connections
)

# 2. Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,  # Prevents attribute reload errors post-commit
)


# 3. Base Class for All Models
class Base(AsyncAttrs, DeclarativeBase):
    """
    Declarative base for all SQLAlchemy ORM models.
    Inherits AsyncAttrs to allow safe async relationship access.
    """
    pass


# 4. FastAPI Dependency for Route Handlers
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an isolated non-blocking AsyncSession.
    Automatically closes the session when the request cycle completes.
    """
    async with AsyncSessionLocal() as session:
        yield session