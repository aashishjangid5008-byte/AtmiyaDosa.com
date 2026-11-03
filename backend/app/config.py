import os
import warnings
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables and .env
    Supports local development and Google Cloud Run container deployments.
    """
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Configuration (Cloud Run injects PORT, usually 8080)
    PORT: int = Field(default_factory=lambda: int(os.environ.get("PORT", 5000)), description="Port the FastAPI server listens on")
    HOST: str = Field(default="0.0.0.0", description="Host address")
    ENVIRONMENT: str = Field(default="development", description="Environment: development | production")
    APP_NAME: str = "Atmiya Dosa Hub POS Engine"
    API_PREFIX: str = "/api"

    # Security & JWT
    JWT_SECRET: str = Field(default="atmiya_dosa_hub_petlad_secure_jwt_key_2026", description="Secret key for signing JWTs")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 12

    # Webhook HMAC Secret
    PETPOOJA_WEBHOOK_SECRET: str = Field(default="petpooja_hmac_secret_atmiya_petlad_2026", description="HMAC secret for Petpooja webhooks")

    # Supabase Cloud Configuration
    SUPABASE_URL: str = Field(default="https://cwdsurzzcvsrycklkhrz.supabase.co")
    SUPABASE_ANON_KEY: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    SUPABASE_DB_URL: str = Field(default="")

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = Field(default="")
    RAZORPAY_KEY_SECRET: str = Field(default="")

    # UPI Direct Payment Configuration
    DEFAULT_UPI_ID: str = Field(default="ranadarshit99@okicici", description="Default UPI VPA for customer direct payment")
    DEFAULT_PAYEE_NAME: str = Field(default="darshit rana", description="Payee / Merchant business name")

    # Free Email OTP & SMTP Configuration (Gmail or Hostinger / Domain SMTP)
    SMTP_SERVER: str = Field(default="smtp.gmail.com", description="SMTP server for email OTP (e.g. smtp.gmail.com or smtp.hostinger.com)")
    SMTP_PORT: int = Field(default=587, description="SMTP port (587 for TLS, 465 for SSL)")
    SMTP_USE_TLS: bool = Field(default=True, description="Enable STARTTLS encryption")
    SMTP_USERNAME: str = Field(default="ranadarshit99@gmail.com", description="Sender email address")
    SMTP_PASSWORD: str = Field(default="", description="Email password or Google App Password (16-char)")
    SMTP_FROM_NAME: str = Field(default="Atmiya Dosa Hub | OptiMap Solution", description="Sender display name")
    COMPANY_NAME: str = Field(default="OptiMap Solution", description="Company brand name")
    COMPANY_WEBSITE: str = Field(default="https://optimapsolution.com", description="Company website URL")

    # CORS Allowed Origins
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5000"
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

settings = Settings()

# Production Security Check
if settings.is_production and settings.JWT_SECRET == "atmiya_dosa_hub_petlad_secure_jwt_key_2026":
    warnings.warn(
        "SECURITY WARNING: Production mode is active with default JWT_SECRET. "
        "Set a unique cryptographically strong JWT_SECRET environment variable for Google Cloud Run deployment.",
        RuntimeWarning
    )
