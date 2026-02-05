"""Configuration settings for Course Copilot backend."""
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from functools import lru_cache

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/course_copilot")
    
    # JWT Authentication
    jwt_secret: str = os.getenv("JWT_SECRET", "your-super-secret-jwt-key")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Gemini API
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # CORS
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # File Upload
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # Debug
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
