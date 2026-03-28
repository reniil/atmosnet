from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Check if using SQLite
IS_SQLITE = settings.DATABASE_URL.startswith('sqlite')

if IS_SQLITE:
    # SQLite with aiosqlite for async support
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL with PostGIS
    from geoalchemy2 import Geometry
    
    # Create async engine for PostgreSQL
    engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
        echo=settings.DEBUG,
        future=True,
        pool_size=10,
        max_overflow=20
    )

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized")


async def get_db():
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
