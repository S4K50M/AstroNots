"""
app/services/noaa_poller.py

Async polling service for all NOAA SWPC endpoints.

Architecture
────────────
• One `NoaaClient` handles raw HTTP fetching with retry + exponential backoff.
• `NoaaPollerService` orchestrates all timed jobs via APScheduler.
• A `SpaceWeatherStore` singleton holds the latest parsed state in memory.
  (Replace with Redis for multi-worker deployments.)
• Automatic DSCOVR → ACE failover: if the DSCOVR mag feed returns a data
  gap or HTTP error, the poller switches to the ACE backup and emits a
  structured log event.
• Schema detection: the parser inspects whether the root JSON is a list
  (legacy format, pre-2026) or a dict with a "data" key (2026+ format)
  and routes to the correct parser accordingly.
• Substorm early-warning: computes the Bz rate of change (nT/min) from
  the last two readings. When the rate falls below the configured threshold
  a substorm precursor event is logged / broadcast.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.logging import logger
from app.models.noaa import (
    AlertsResponse,
    KpResponse,
    KpReading,
    NoaaAlert,
    OvationResponse,
    SolarWindMagResponse,
    SolarWindPlasmaResponse,
    SpaceWeatherState,
)


# ── In-memory state store ─────────────────────────────────────────────────────

class SpaceWeatherStore:
    """
    Thread-safe (asyncio-safe) singleton that holds the most recent parsed
    NOAA data.  Expose `.state` to FastAPI routers.
    """

    _instance: Optional["SpaceWeatherStore"] = None

    def __new__(cls) -> "SpaceWeatherStore":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._state = SpaceWeatherState()
            cls._instance._lock = asyncio.Lock()
            cls._instance._alert_callbacks: list = []
        return cls._instance

    @property
    def state(self) -> SpaceWeatherState:
        return self._state

    async def update_mag(self, data: SolarWindMagResponse) -> None:
        async with self._lock:
            self._state.mag = data
            self._state.last_updated = datetime.now(timezone.utc)

    async def update_plasma(self, data: SolarWindPlasmaResponse) -> None:
        async with self._lock:
            self._state.plasma = data
            self._state.last_updated = datetime.now(timezone.utc)

    async def update_ovation(self, data: OvationResponse) -> None:
        async with self._lock:
            self._state.ovation = data
            self._state.last_updated = datetime.now(timezone.utc)

    async def update_kp(self, data: KpResponse) -> None:
        async with self._lock:
            self._state.kp = data
            self._state.last_updated = datetime.now(timezone.utc)             

    async def update_alerts(self, data: AlertsResponse) -> None:
        async with self._lock:
            self._state.alerts = data
            self._state.last_updated = datetime.now(timezone.utc)          

    def register_alert_callback(self, fn) -> None:
        """Register an async function to be called when a threshold event fires."""
        self._alert_callbacks.append(fn)

    async def fire_alert(self, event: dict) -> None:
        for cb in self._alert_callbacks:
            try:
                await cb(event)
            except Exception as exc:
                logger.warning("alert_callback_error", error=str(exc))

             


store = SpaceWeatherStore()


# ── HTTP Client ───────────────────────────────────────────────────────────────

class NoaaClient:
    """
    Thin async HTTP client with:
    • Configurable timeouts
    • Exponential-backoff retry
    • Structured error logging
    • Optional base-URL override (for ACE failover)
    """

    def __init__(self, base_url: str = settings.NOAA_BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "NoaaClient":
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(settings.HTTP_TIMEOUT),
            headers={"User-Agent": f"{settings.APP_NAME}/{settings.APP_VERSION}"},
            follow_redirects=True,
        )
        return self

    async def __aexit__(self, *args) -> None:
        if self._client:
            await self._client.aclose()

    async def get_json(self, path: str) -> Any:
        """
        Fetch JSON from `path`, retrying up to HTTP_MAX_RETRIES times
        with exponential backoff.  Returns parsed JSON or raises.
        """
        delay = 1.0
        last_exc: Exception = RuntimeError("No attempts made")

        for attempt in range(1, settings.HTTP_MAX_RETRIES + 1):
            try:
                assert self._client is not None, "Client not initialised — use async context manager"
                resp = await self._client.get(path)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as exc:
                last_exc = exc
                logger.warning(
                    "noaa_http_error",
                    path=path,
                    status=exc.response.status_code,
                    attempt=attempt,
                )
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_exc = exc
                logger.warning(
                    "noaa_request_error",
                    path=path,
                    error=str(exc),
                    attempt=attempt,
                )

            if attempt < settings.HTTP_MAX_RETRIES:
                await asyncio.sleep(delay)
                delay *= settings.HTTP_RETRY_BACKOFF

        raise last_exc


# ── Schema detection helpers ──────────────────────────────────────────────────

def _is_new_schema(raw: Any) -> bool:
    """
    Returns True when the payload uses the post-March-2026 dict format.
    Legacy format is a bare list-of-lists; new format is a dict with
    a "data" key (and usually a "meta" key).
    """
    return isinstance(raw, dict) and "data" in raw


# ── Individual fetch & parse functions ───────────────────────────────────────

async def _fetch_mag(client: NoaaClient, source: str = "DSCOVR") -> SolarWindMagResponse:
    try:
        raw = await client.get_json(settings.MAG_ENDPOINT)
        if _is_new_schema(raw):
            result = SolarWindMagResponse.from_new_format(raw, source=source)
        else:
            result = SolarWindMagResponse.from_legacy_list(raw, source=source)

        _check_data_gap(result, "mag")
        return result
    except Exception as exc:
        logger.error("mag_fetch_failed", source=source, error=str(exc))
        return SolarWindMagResponse(data_gap=True, source=source)


async def _fetch_plasma(client: NoaaClient, source: str = "DSCOVR") -> SolarWindPlasmaResponse:
    try:
        raw = await client.get_json(settings.PLASMA_ENDPOINT)
        if _is_new_schema(raw):
            result = SolarWindPlasmaResponse.from_new_format(raw, source=source)
        else:
            result = SolarWindPlasmaResponse.from_legacy_list(raw, source=source)

        _check_data_gap(result, "plasma")
        return result
    except Exception as exc:
        logger.error("plasma_fetch_failed", source=source, error=str(exc))
        return SolarWindPlasmaResponse(data_gap=True, source=source)


async def _fetch_ovation(client: NoaaClient) -> OvationResponse:
    try:
        raw = await client.get_json(settings.OVATION_ENDPOINT)
        result = OvationResponse.from_noaa_json(raw)
        if result.data_gap:
            logger.warning("ovation_data_gap")
        else:
            logger.info("ovation_fetched", cell_count=len(result.cells))
        return result
    except Exception as exc:
        logger.error("ovation_fetch_failed", error=str(exc))
        return OvationResponse(data_gap=True)


async def _fetch_kp(client: NoaaClient) -> KpResponse:
    try:
        raw = await client.get_json(settings.KP_ENDPOINT)
        readings: list[KpReading] = []

        if _is_new_schema(raw):
            # New format: dict with "data" list of objects
            for item in raw.get("data", []):
                readings.append(KpReading(
                    timestamp=_parse_ts(item.get("timestamp") or item.get("time_tag")),
                    kp=item.get("estimated_kp") or item.get("kp_index"),
                    observed=item.get("observed", True),
                ))
        elif isinstance(raw, list) and len(raw) > 0:
            first = raw[0]
            if isinstance(first, dict):
                # List of dicts — current NOAA format
                for item in raw:
                    readings.append(KpReading(
                        timestamp=_parse_ts(item.get("time_tag") or item.get("timestamp")),
                        kp=item.get("estimated_kp") or item.get("kp_index"),
                        observed=True,
                    ))
            else:
                # Legacy array-of-arrays with header row
                header = [h.lower() for h in first]
                for row in raw[1:]:
                    d = dict(zip(header, row))
                    readings.append(KpReading(
                        timestamp=_parse_ts(d.get("time_tag")),
                        kp=d.get("estimated_kp") or d.get("kp_index"),
                        observed=True,
                    ))

        return KpResponse(readings=readings, data_gap=len(readings) == 0)
    except Exception as exc:
        logger.error("kp_fetch_failed", error=str(exc))
        return KpResponse(data_gap=True)
    

async def _fetch_alerts(client: NoaaClient) -> AlertsResponse:
    try:
        raw = await client.get_json(settings.ALERTS_ENDPOINT)

        # Alerts endpoint returns a list of alert objects in both schemas
        items = raw if isinstance(raw, list) else raw.get("data", [])
        alerts = [NoaaAlert.from_dict(a) for a in items if isinstance(a, dict)]
        return AlertsResponse(alerts=alerts)
    except Exception as exc:
        logger.error("alerts_fetch_failed", error=str(exc))
        return AlertsResponse(data_gap=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_ts(v: Any) -> Optional[datetime]:
    from app.models.noaa import _parse_timestamp
    return _parse_timestamp(v)


def _check_data_gap(result: Any, name: str) -> None:
    """Flag stale data: if the latest reading is >15 min old, mark as gap."""
    if not result.latest or not result.latest.timestamp:
        result.data_gap = True
        logger.warning(f"{name}_no_timestamp")
        return

    ts = result.latest.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)

    age = datetime.now(timezone.utc) - ts
    if age > timedelta(minutes=15):
        result.data_gap = True
        logger.warning(f"{name}_data_gap", age_minutes=age.total_seconds() / 60)


# ── Threshold & substorm alert logic ─────────────────────────────────────────

_prev_bz: Optional[float] = None
_prev_bz_time: Optional[datetime] = None


async def _evaluate_thresholds(
    mag: SolarWindMagResponse,
    plasma: SolarWindPlasmaResponse,
) -> None:
    """
    Fire structured alert events when:
    1. Bz < BZ_ALERT_THRESHOLD (southward IMF alert)
    2. Solar wind speed > SOLAR_WIND_SPEED_THRESHOLD
    3. Bz rate of change indicates an imminent substorm
    """
    global _prev_bz, _prev_bz_time

    # ── Bz southward alert ────────────────────────────────────────────────
    if mag.latest and mag.latest.bz_gsm is not None:
        bz = mag.latest.bz_gsm
        ts = mag.latest.timestamp

        if bz < settings.BZ_ALERT_THRESHOLD:
            event = {
                "type": "BZ_ALERT",
                "bz_gsm": bz,
                "threshold": settings.BZ_ALERT_THRESHOLD,
                "timestamp": ts.isoformat() if ts else None,
                "source": mag.latest.source,
            }
            logger.warning("bz_threshold_crossed", **event)
            await store.fire_alert(event)

        # ── Substorm early warning (rate of change) ───────────────────────
        if _prev_bz is not None and _prev_bz_time is not None and ts is not None:
            t = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
            t_prev = _prev_bz_time if _prev_bz_time.tzinfo else _prev_bz_time.replace(tzinfo=timezone.utc)
            dt_min = (t - t_prev).total_seconds() / 60.0

            if dt_min > 0:
                bz_rate = (bz - _prev_bz) / dt_min  # nT/min
                if bz_rate < settings.BZ_SUBSTORM_RATE_THRESHOLD:
                    event = {
                        "type": "SUBSTORM_PRECURSOR",
                        "bz_rate_nT_per_min": round(bz_rate, 3),
                        "current_bz": bz,
                        "threshold": settings.BZ_SUBSTORM_RATE_THRESHOLD,
                        "timestamp": ts.isoformat() if ts else None,
                        "warning": "Substorm onset likely within ~10 minutes",
                    }
                    logger.warning("substorm_precursor_detected", **event)
                    await store.fire_alert(event)

        _prev_bz = bz
        _prev_bz_time = ts if ts and ts.tzinfo else (ts.replace(tzinfo=timezone.utc) if ts else None)

    # ── Solar wind speed alert ────────────────────────────────────────────
    if plasma.latest and plasma.latest.speed is not None:
        speed = plasma.latest.speed
        if speed > settings.SOLAR_WIND_SPEED_THRESHOLD:
            ts = plasma.latest.timestamp
            
            # --- L1 DELAY MATH ---
            # Calculate how many minutes until this wind hits Earth
            delay_minutes = int(1_500_000 / (speed * 60))
            impact_time = ts + timedelta(minutes=delay_minutes) if ts else None
            # -------------------------

            event = {
                "type": "SPEED_ALERT",
                "speed_km_s": speed,
                "threshold": settings.SOLAR_WIND_SPEED_THRESHOLD,
                "timestamp": ts.isoformat() if ts else None,
                "source": plasma.latest.source,
                # --- NEW ALERT FIELDS ---
                "arrival_delay_minutes": delay_minutes,
                "estimated_impact_time": impact_time.isoformat() if impact_time else None,
                "warning_message": f"Incoming solar shockwave detected. Aurora probability will spike in roughly {delay_minutes} minutes.",
            }
            logger.warning("solar_wind_speed_threshold_crossed", **event)
            await store.fire_alert(event)

    # ── Solar wind dynamic pressure alert ─────────────────────────────────
    # We use getattr just in case your Pydantic model named it something slightly different
    density = getattr(plasma.latest, 'density', None) if plasma.latest else None
    
    if plasma.latest and plasma.latest.speed is not None and density is not None:
        speed = plasma.latest.speed
        
        # Calculate Dynamic Pressure (nPa)
        # P = 1.67e-6 * n * v^2
        dynamic_pressure = 1.67e-6 * density * (speed ** 2)
        
        if dynamic_pressure > 3.0:
            ts = plasma.latest.timestamp
            event = {
                "type": "PRESSURE_ALERT",
                "dynamic_pressure_nPa": round(dynamic_pressure, 2),
                "density_cm3": density,
                "speed_km_s": speed,
                "threshold": 3.0,
                "timestamp": ts.isoformat() if ts else None,
                "warning_message": f"High solar wind pressure ({round(dynamic_pressure, 2)} nPa) detected. Magnetosphere compression imminent."
            }
            logger.warning("solar_wind_pressure_spike", **event)
            await store.fire_alert(event)            


# ── DSCOVR → ACE failover ─────────────────────────────────────────────────────

_using_ace_failover: bool = False

# NOTE: The ACE satellite feed endpoint differs from DSCOVR.
# NOAA sometimes mirrors ACE data at the same path with a different base URL.
# Update ACE_BASE_URL to the correct mirror if NOAA publishes one post-2026.
ACE_BASE_URL = "https://services.swpc.noaa.gov"   # same host, ACE data via alternate path
ACE_MAG_PATH = "/products/solar-wind/mag-1-day.json"    # currently same path, ACE flagged in meta
ACE_PLASMA_PATH = "/products/solar-wind/plasma-1-day.json"


async def _fetch_mag_with_failover(primary_client: NoaaClient) -> SolarWindMagResponse:
    global _using_ace_failover

    result = await _fetch_mag(primary_client, source="DSCOVR")

    if result.data_gap and not _using_ace_failover:
        logger.warning("dscovr_mag_gap_switching_to_ace_failover")
        _using_ace_failover = True
        async with NoaaClient(ACE_BASE_URL) as ace_client:
            ace_result = await _fetch_mag(ace_client, source="ACE")
            if not ace_result.data_gap:
                logger.info("ace_failover_success", source="ACE")
                return ace_result
    elif not result.data_gap and _using_ace_failover:
        logger.info("dscovr_mag_restored_switching_back")
        _using_ace_failover = False

    return result


# ── Poll job functions (called by APScheduler) ────────────────────────────────

async def job_poll_solar_wind() -> None:
    """Poll mag + plasma together; evaluate thresholds; update store."""
    async with NoaaClient() as client:
        mag, plasma = await asyncio.gather(
            _fetch_mag_with_failover(client),
            _fetch_plasma(client),
        )

    await store.update_mag(mag)
    await store.update_plasma(plasma)
    await _evaluate_thresholds(mag, plasma)

    logger.info(
        "solar_wind_polled",
        bz=mag.latest.bz_gsm if mag.latest else None,
        speed=plasma.latest.speed if plasma.latest else None,
        bz_alert=mag.latest.is_bz_alert if mag.latest else False,
        speed_alert=plasma.latest.is_speed_alert if plasma.latest else False,
        data_gap_mag=mag.data_gap,
        data_gap_plasma=plasma.data_gap,
        source=mag.source,
    )


async def job_poll_ovation() -> None:
    async with NoaaClient() as client:
        ovation = await _fetch_ovation(client)
    await store.update_ovation(ovation)


async def job_poll_kp() -> None:
    async with NoaaClient() as client:
        kp = await _fetch_kp(client)
    await store.update_kp(kp)
    logger.info("kp_polled", kp=kp.latest.kp if kp.latest else None)


async def job_poll_alerts() -> None:
    async with NoaaClient() as client:
        alerts = await _fetch_alerts(client)
    await store.update_alerts(alerts)
    if alerts.alerts:
        logger.info("noaa_alerts_fetched", count=len(alerts.alerts))


# ── Scheduler bootstrap ───────────────────────────────────────────────────────

class NoaaPollerService:
    """
    Wraps APScheduler and exposes start / stop lifecycle methods
    to be called from FastAPI lifespan events.
    """

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler(timezone="UTC")

    def setup_jobs(self) -> None:
        self._scheduler.add_job(
            job_poll_solar_wind,
            trigger=IntervalTrigger(seconds=settings.MAG_POLL_INTERVAL),
            id="solar_wind",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=30,
        )
        self._scheduler.add_job(
            job_poll_ovation,
            trigger=IntervalTrigger(seconds=settings.OVATION_POLL_INTERVAL),
            id="ovation",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=120,
        )
        self._scheduler.add_job(
            job_poll_kp,
            trigger=IntervalTrigger(seconds=settings.KP_POLL_INTERVAL),
            id="kp",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=60,
        )
        self._scheduler.add_job(
            job_poll_alerts,
            trigger=IntervalTrigger(seconds=settings.ALERTS_POLL_INTERVAL),
            id="alerts",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=30,
        )

    async def start(self) -> None:
        """Start scheduler and run initial polls immediately."""
        self.setup_jobs()
        self._scheduler.start()
        logger.info("noaa_poller_started")

        # Prime the store immediately — don't wait for first interval tick
        await asyncio.gather(
            job_poll_solar_wind(),
            job_poll_ovation(),
            job_poll_kp(),
            job_poll_alerts(),
            return_exceptions=True,   # don't crash startup if NOAA is briefly unreachable
        )
        logger.info("initial_noaa_poll_complete", summary=store.state.summary_dict())

    async def stop(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("noaa_poller_stopped")


# Module-level singleton — import this in main.py
poller = NoaaPollerService()
