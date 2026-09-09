from functools import lru_cache
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """TutorFlow application settings.

    All production secrets and service URLs must be supplied through
    environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ==========================================================
    # Application & URLs
    # ==========================================================
    APP_NAME: str = "TutorFlow API"
    APP_ENV: str = "development"
    DEBUG: bool = False
    ENVIRONMENT : str = "development"
    API_V1_STR: str = "/api/v1"
    FRONTEND_APP_URL: str = Field(
        default="http://localhost:5173",
        description="Frontend base URL for student invitation & action links",
    )

    # ==========================================================
    # Security / JWT
    # ==========================================================
    SECRET_KEY: str = "change_this_to_a_secure_secret_key_32_characters_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ==========================================================
    # Database
    # ==========================================================
    DATABASE_URL: str = (
        "postgresql+psycopg_async://tutorflow:tutorflow_dev_password@postgres:5432/tutorflow"
    )

    # ==========================================================
    # Redis / Celery
    # ==========================================================
    REDIS_URL: str = "redis://redis:6379/0"

    # ==========================================================
    # AI (OpenAI & Gemini)
    # ==========================================================

    AI_PROVIDER: str = Field(
        default="gemini",
        description="Active AI provider: 'gemini' or 'openai'",
    )
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"  

    # ==========================================================
    # Email
    # ==========================================================
    RESEND_API_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM: str = "TutorFlow <notifications@tutorflow.dev>"

    # ==========================================================
    # CORS
    # ==========================================================
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"


    # ==========================================================
    # Google OAuth & Calendar
    # ==========================================================
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        """Parses comma-separated string into a clean list of allowed origins."""
        if not self.BACKEND_CORS_ORIGINS:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        return [
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()