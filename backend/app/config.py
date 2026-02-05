from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://localhost/course_copilot"

    # JWT Authentication
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Gemini API
    GEMINI_API_KEY: str = ""

    # File uploads
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # App settings
    DEBUG: bool = False
    APP_NAME: str = "Course Copilot"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
