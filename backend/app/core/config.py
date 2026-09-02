from functools import lru_cache
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    TutorFlow application settings.
    All production secrets and service URLs must be supplied
    through environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ==========================================================
    # Application
    # ==========================================================
    APP_NAME: str = "TutorFlow API"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # ==========================================================
    # Security / JWT
    # ==========================================================
    SECRET_KEY: str = "change_this_to_a_secure_secret_key_32_characters_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

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
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ==========================================================
    # Email 
    # ==========================================================
    RESEND_API_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM: str = "TutorFlow <notifications@tutorflow.dev>"

    # ==========================================================
    # CORS (Stored as raw string to prevent JSON parsing crashes)
    # ==========================================================
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

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