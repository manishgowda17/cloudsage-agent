"""Application configuration settings."""

import os
from typing import List, Union

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import field_validator

    class Settings(BaseSettings):
        PROJECT_NAME: str = "ai-kubernetes-agent"
        API_V1_STR: str = "/api/v1"
        HOST: str = "0.0.0.0"
        PORT: int = 8000
        CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

        @field_validator("CORS_ORIGINS", mode="before")
        def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
            if isinstance(v, str):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    return [origin.strip() for origin in v.split(",") if origin.strip()]
            return v

        # Google Gemini API configuration
        GEMINI_API_KEY: str = ""
        GEMINI_MODEL: str = "gemini-2.5-flash"

        # Legacy optional OpenRouter fallback
        OPENROUTER_API_KEY: str = ""
        OPENROUTER_MODEL: str = "anthropic/claude-3.5-sonnet"

        KUBECONFIG_PATH: str = ""

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            case_sensitive=True,
            extra="ignore",
        )

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        PROJECT_NAME: str = "ai-kubernetes-agent"
        API_V1_STR: str = "/api/v1"
        HOST: str = os.environ.get("HOST", "0.0.0.0")
        PORT: int = int(os.environ.get("PORT", "8000"))
        CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
        GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
        OPENROUTER_MODEL: str = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
        KUBECONFIG_PATH: str = os.environ.get("KUBECONFIG_PATH", "")


settings = Settings()
# Check GOOGLE_API_KEY if GEMINI_API_KEY is empty
if not settings.GEMINI_API_KEY and os.environ.get("GOOGLE_API_KEY"):
    settings.GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
