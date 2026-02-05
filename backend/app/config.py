"""Configuration settings for Course Copilot backend."""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database - Railway injects DATABASE_URL
    database_url: str = "postgresql://postgres:password@localhost:5432/course_copilot"
    
    # JWT Authentication
    jwt_secret_key: str = "your-super-secret-jwt-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    
    # Gemini API
    gemini_api_key: str = ""
    
    # CORS
    frontend_url: str = "http://localhost:5173"
    
    # File Upload
    upload_dir: str = "./uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # Debug
    debug: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
