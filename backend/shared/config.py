from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str
    ENVIRONMENT: str
    GEMINI_API_KEY: str
    GEMINI_MODEL_FLASH: str
    GEMINI_MODEL_PRO: str
    TRANSACTIONAL_EMAIL_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
