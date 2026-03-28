from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "AtmosNet"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://atmosnet:atmosnet@localhost:5432/atmosnet"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_OBSERVATIONS_TOPIC: str = "observations.raw"
    KAFKA_VALIDATED_TOPIC: str = "observations.validated"
    
    # API Keys
    OPENWEATHER_API_KEY: str = ""
    
    # Security
    SECRET_KEY: str = "change-me-in-production"
    RATE_LIMIT: str = "1/5minute"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Points system
    POINTS_TIER_A: int = 10
    POINTS_TIER_B: int = 4
    POINTS_DAILY_BONUS: int = 20
    POINTS_DAILY_BONUS_THRESHOLD: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
