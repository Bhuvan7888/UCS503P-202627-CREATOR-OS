from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# The single environment file for the whole repo (see /.env.example). Real environment variables
# take precedence over it, which is how CI and deployments configure the app.
ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str
    ENVIRONMENT: str
    GEMINI_API_KEY: str
    GEMINI_MODEL_FLASH: str
    GEMINI_MODEL_PRO: str
    # lighter model used when the main one is overloaded (see shared/llm/gemini_adapter.py)
    GEMINI_MODEL_FALLBACK: str = "gemini-flash-lite-latest"
    TRANSACTIONAL_EMAIL_API_KEY: str
    # public address of the frontend, used in links sent by email (workspace invitations)
    APP_URL: str = "http://localhost:3000"
    # where new support tickets are emailed (empty = tickets are only stored)
    SUPPORT_EMAIL: str = ""

    # extra="ignore": the shared file also holds the frontend's NEXT_PUBLIC_* keys.
    model_config = SettingsConfigDict(
        env_file=ROOT_ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def ai_configured(self) -> bool:
        """A real Gemini key is set (not empty or the .env.example placeholder)."""
        key = self.GEMINI_API_KEY.strip()
        return bool(key) and "dummy" not in key.lower() and not key.startswith("your-")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()
