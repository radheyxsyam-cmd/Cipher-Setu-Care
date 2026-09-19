"""
SETU-Care Backend Configuration
Uses Pydantic Settings for type-safe environment variable loading.
All secrets are loaded from .env — never hardcoded.
"""
from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────
    app_env: Literal["development", "production", "test"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    mock_mode: bool = True  # Default safe — requires explicit opt-out for AWS

    # ── AWS Core ─────────────────────────────────────────────────
    aws_region: str = "ap-south-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # ── Amazon Bedrock ───────────────────────────────────────────
    bedrock_model_id: str = "anthropic.claude-3-haiku-20240307-v1:0"

    # ── Amazon DynamoDB ──────────────────────────────────────────
    dynamodb_table_name: str = "setu-care-patients"

    # ── Amazon S3 ────────────────────────────────────────────────
    s3_bucket_name: str = "setu-care-documents"

    # ── CORS / Security ──────────────────────────────────────────
    frontend_origin: str = "http://localhost:3000"

    # ── Upload Limits ────────────────────────────────────────────
    max_upload_size_mb: int = 5

    @field_validator("bedrock_model_id")
    @classmethod
    def validate_model_id(cls, v: str) -> str:
        allowed_prefixes = ["anthropic.claude", "amazon.titan", "meta.llama"]
        if not any(v.startswith(prefix) for prefix in allowed_prefixes):
            raise ValueError(f"Unsupported Bedrock model ID: {v}")
        return v

    @model_validator(mode="after")
    def warn_if_aws_missing(self) -> "Settings":
        """Auto-enable mock mode if AWS credentials are absent."""
        if not self.mock_mode:
            if not self.aws_access_key_id or not self.aws_secret_access_key:
                import logging
                logging.getLogger(__name__).warning(
                    "AWS credentials not found in environment. "
                    "Falling back to MOCK_MODE=true. "
                    "Set credentials or use IAM Role for real AWS access."
                )
                object.__setattr__(self, "mock_mode", True)
        return self

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings singleton — loaded once at startup."""
    return Settings()
