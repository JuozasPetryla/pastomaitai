from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pastomatai API"
    database_url: str = "postgresql+asyncpg://pastomatai:pastomatai@localhost:5432/pastomatai"
    cors_origins: list[str] = ["http://localhost:5173"]

    brevo_api_key: str | None = None
    brevo_sender_email: str | None = None
    brevo_sender_name: str = "Pastomatai"
    brevo_sms_sender: str | None = None

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
