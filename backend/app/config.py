"""
Application configuration
"""
from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""

    # Application
    APP_NAME: str = "Timetable Scheduler"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # Database
    DATABASE_URL: str
    DATABASE_ASYNC_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        # Get path to backend/.env file
        backend_dir = Path(__file__).parent.parent
        env_file = backend_dir / ".env"
        case_sensitive = True


settings = Settings()
