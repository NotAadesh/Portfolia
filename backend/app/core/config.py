import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Portfolia"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "financial_ai_super_secret_jwt_key_2026_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Defaults to SQLite for local development; set to postgresql:// for production (Supabase/Neon)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./finance_agent.db")
    
    # SMTP Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "portfolia.yourportfoliomanager@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Portfolia")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "portfolia.yourportfoliomanager@gmail.com")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Superadmin initialization
    FIRST_SUPERADMIN_EMAIL: str = os.getenv("FIRST_SUPERADMIN_EMAIL", "admin@financialai.com")
    FIRST_SUPERADMIN_PASSWORD: str = os.getenv("FIRST_SUPERADMIN_PASSWORD", "Admin@123456")

    # Google Gemini AI Intelligence
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_FALLBACK_API_KEY: str = os.getenv("GEMINI_FALLBACK_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
