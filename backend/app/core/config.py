"""
app/core/config.py
Application settings loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── NOAA SWPC endpoints ──────────────────────────────────────────────────
    NOAA_BASE_URL: str = "https://services.swpc.noaa.gov"

    # Solar wind magnetic field (IMF / Bz) — DSCOVR primary feed
    MAG_ENDPOINT: str = "/products/solar-wind/mag-1-day.json"

    # Solar wind plasma (speed, density, temperature)
    PLASMA_ENDPOINT: str = "/products/solar-wind/plasma-1-day.json"

    # OVATION auroral probability grid  (360 × 181, ~30-min cadence)
    OVATION_ENDPOINT: str = "/json/ovation_aurora_latest.json"

    # Kp index (3-hour blocks, context display)
    KP_ENDPOINT: str = "/json/planetary_k_index_1m.json"

    # 3-day Kp forecast (2× daily)
    KP_FORECAST_ENDPOINT: str = "/products/3-day-forecast.json"

    # NOAA active alerts & watches (event-driven)
    ALERTS_ENDPOINT: str = "/products/alerts.json"

    # ── Polling cadences (seconds) ───────────────────────────────────────────
    MAG_POLL_INTERVAL: int = Field(60, description="Solar wind mag polling interval in seconds")
    PLASMA_POLL_INTERVAL: int = Field(60, description="Plasma polling interval in seconds")
    OVATION_POLL_INTERVAL: int = Field(1800, description="OVATION polling interval in seconds")
    KP_POLL_INTERVAL: int = Field(180, description="Kp index polling interval in seconds")
    ALERTS_POLL_INTERVAL: int = Field(60, description="NOAA alerts polling interval in seconds")

    # ── Alert thresholds ─────────────────────────────────────────────────────
    BZ_ALERT_THRESHOLD: float = Field(-7.0, description="Bz threshold (nT) to fire alert")
    SOLAR_WIND_SPEED_THRESHOLD: float = Field(500.0, description="Solar wind speed (km/s) to fire alert")
    BZ_SUBSTORM_RATE_THRESHOLD: float = Field(-2.0, description="Bz rate of change (nT/min) for substorm early warning")

    # ── HTTP client config ────────────────────────────────────────────────────
    HTTP_TIMEOUT: float = Field(15.0, description="Timeout in seconds for NOAA requests")
    HTTP_MAX_RETRIES: int = Field(3, description="Max retry attempts on transient failures")
    HTTP_RETRY_BACKOFF: float = Field(2.0, description="Exponential backoff multiplier")

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Aurora Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
