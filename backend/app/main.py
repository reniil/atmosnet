from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, init_db
from app.api.v1 import observations, rewards, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="AtmosNet API",
    description="Hyperlocal weather intelligence network",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(observations.router, prefix="/v1/observations", tags=["observations"])
app.include_router(rewards.router, prefix="/v1/rewards", tags=["rewards"])
app.include_router(health.router, prefix="/health", tags=["health"])


@app.get("/")
async def root():
    return {
        "name": "AtmosNet API",
        "version": "1.0.0",
        "status": "operational"
    }
