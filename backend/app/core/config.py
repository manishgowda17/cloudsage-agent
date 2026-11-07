"""Application configuration settings."""

import os
from typing import List, Union
from dotenv import load_dotenv

# Automatically load backend/.env
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(_env_path)
load_dotenv(".env")

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import field_validator

    class Settings(BaseSettings):
        PROJECT_NAME: str = "ai-kubernetes-agent"
        API_V1_STR: str = "/api/v1"
        HOST: str = "0.0.0.0"
        PORT: int = 8000
        CORS_ORIGINS: Union[List[str], str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]

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

        # InsForge Auth and Verification configuration
        INSFORGE_URL: str = "https://mucsd7yw.us-east.insforge.app"
        INSFORGE_ANON_KEY: str = "anon_57cbe317689f3e724ced0051c10d088eab9ddc1123ce564702735a7dcb764eb8"

        # Hindsight Long-term Agent Memory configuration
        HINDSIGHT_URL: str = "http://localhost:8888"
        HINDSIGHT_CONTROL_PLANE_URL: str = "http://localhost:9999"
        HINDSIGHT_ENABLED: bool = True
        HINDSIGHT_TIMEOUT_SECONDS: float = 10.0

        # Legacy optional OpenRouter fallback
        OPENROUTER_API_KEY: str = ""
        OPENROUTER_MODEL: str = "anthropic/claude-3.5-sonnet"

        KUBECONFIG_PATH: str = ""

        _env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        model_config = SettingsConfigDict(
            env_file=(_env_file, ".env"),
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
        CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]
        GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        INSFORGE_URL: str = os.environ.get("INSFORGE_URL", "https://mucsd7yw.us-east.insforge.app")
        INSFORGE_ANON_KEY: str = os.environ.get(
            "INSFORGE_ANON_KEY",
            "anon_57cbe317689f3e724ced0051c10d088eab9ddc1123ce564702735a7dcb764eb8",
        )
        HINDSIGHT_URL: str = os.environ.get("HINDSIGHT_URL", "http://localhost:8888")
        HINDSIGHT_CONTROL_PLANE_URL: str = os.environ.get("HINDSIGHT_CONTROL_PLANE_URL", "http://localhost:9999")
        HINDSIGHT_ENABLED: bool = os.environ.get("HINDSIGHT_ENABLED", "true").lower() in ("true", "1", "yes")
        HINDSIGHT_TIMEOUT_SECONDS: float = float(os.environ.get("HINDSIGHT_TIMEOUT_SECONDS", "10.0"))
        OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
        OPENROUTER_MODEL: str = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
        KUBECONFIG_PATH: str = os.environ.get("KUBECONFIG_PATH", "")


settings = Settings()
# Check GOOGLE_API_KEY if GEMINI_API_KEY is empty
if not settings.GEMINI_API_KEY and os.environ.get("GOOGLE_API_KEY"):
    settings.GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
