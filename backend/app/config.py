from functools import lru_cache
from pathlib import Path
from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/codeatlas"
    frontend_origin: str = "http://localhost:3000"
    environment: str = "development"
    encryption_key: str = ""
    cookie_secure: bool = False
    session_hours: int = 24
    ai_timeout_seconds: int = 120
    max_context_chars: int = 60000
    allow_local_ai: bool = True

    default_ai_provider_name: str = ""
    default_ai_base_url: str = ""
    default_ai_model: str = ""
    default_ai_api_key: SecretStr = SecretStr("")
    default_ai_owner_email: str = ""
    default_ai_owner_id: str = ""

    @model_validator(mode="after")
    def validate_environment_provider(self):
        if self.default_ai_api_key.get_secret_value():
            if not all(
                [
                    self.default_ai_provider_name.strip(),
                    self.default_ai_base_url.strip(),
                    self.default_ai_model.strip(),
                    self.default_ai_owner_email.strip(),
                    self.default_ai_owner_id.strip(),
                ]
            ):
                raise ValueError("Environment AI requires provider name, base URL, model, owner email and account ID")
        self.default_ai_owner_email = self.default_ai_owner_email.strip().lower()
        return self

    def secret_key(self) -> bytes:
        if self.encryption_key:
            return self.encryption_key.encode()
        if self.environment != "development":
            raise RuntimeError("ENCRYPTION_KEY is required outside development")
        path = Path(".local/encryption.key")
        path.parent.mkdir(exist_ok=True)
        if not path.exists():
            with path.open("xb") as stream:
                stream.write(Fernet.generate_key())
            path.chmod(0o600)
        return path.read_bytes()


@lru_cache
def get_settings() -> Settings:
    return Settings()
