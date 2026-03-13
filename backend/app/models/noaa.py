"""
app/models/noaa.py
Pydantic models that parse and validate NOAA SWPC JSON payloads.

IMPORTANT: NOAA updated its JSON schema effective March 31, 2026.
The parsers below handle BOTH the legacy (pre-2026) and new formats
via permissive field aliasing and optional fields.  Any unrecognised
key is silently discarded; missing critical fields raise a clear error.

Legacy mag-1-day.json format (rows of lists):
  [ ["time_tag", "bx_gsm", "by_gsm", "bz_gsm", "bt", "lat", "lon"], ...]

New format (array of objects, 2026+):
  { "data": [ {"timestamp": "...", "bz_gsm": -4.2, ...}, ... ],
    "meta": { "source": "DSCOVR", "last_updated": "..." } }

Both shapes are normalised into the same internal SolarWindMagReading model.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
import re

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Shared helpers ────────────────────────────────────────────────────────────

_MISSING_SENTINEL = {None, "", "null", "NULL", "missing", "-999.9", "-9999.0", "-99999.0"}


def _parse_float(v: Any) -> Optional[float]:
    """Return float or None for any NOAA missing-value sentinel."""
    if v is None:
        return None
    s = str(v).strip()
    if s in _MISSING_SENTINEL:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_timestamp(v: Any) -> Optional[datetime]:
    """Parse NOAA timestamp strings in multiple known formats."""
    if not v:
        return None
    s = str(v).strip()
    # Remove trailing 'Z' or timezone designator that datetime can't handle uniformly
    s = re.sub(r"Z$", "+00:00", s)
    formats = [
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


# ── Solar Wind Magnetic Field (IMF) ──────────────────────────────────────────

class SolarWindMagReading(BaseModel):
    """Single 1-minute IMF measurement from DSCOVR/ACE."""

    timestamp: Optional[datetime] = None
    bx_gsm: Optional[float] = None   # nT
    by_gsm: Optional[float] = None   # nT
    bz_gsm: Optional[float] = None   # nT  ← primary aurora driver
    bt: Optional[float] = None        # nT  total field magnitude
    lat_gsm: Optional[float] = None   # degrees
    lon_gsm: Optional[float] = None   # degrees
    source: str = "DSCOVR"            # DSCOVR | ACE

    @property
    def is_bz_alert(self) -> bool:
        """True when Bz crosses the southward alert threshold."""
        from app.core.config import settings
        return self.bz_gsm is not None and self.bz_gsm < settings.BZ_ALERT_THRESHOLD

    @property
    def bz_alert_threshold(self) -> float:
        from app.core.config import settings
        return settings.BZ_ALERT_THRESHOLD


class SolarWindMagResponse(BaseModel):
    """Parsed and validated mag-1-day endpoint response."""

    readings: list[SolarWindMagReading] = Field(default_factory=list)
    latest: Optional[SolarWindMagReading] = None
    source: str = "DSCOVR"
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    data_gap: bool = False   # True when last reading is >15 min stale
    parse_errors: int = 0

    @model_validator(mode="after")
    def _set_latest(self) -> "SolarWindMagResponse":
        if self.readings and self.latest is None:
            self.latest = self.readings[-1]
        return self

    @classmethod
    def from_legacy_list(cls, raw: list[list[Any]], source: str = "DSCOVR") -> "SolarWindMagResponse":
        """
        Parse the old-style array-of-arrays format:
        First row is a header: ["time_tag","bx_gsm","by_gsm","bz_gsm","bt","lat","lon"]
        Subsequent rows are data.
        """
        if not raw or len(raw) < 2:
            return cls(data_gap=True, source=source)

        header = [h.lower().strip() for h in raw[0]]
        readings: list[SolarWindMagReading] = []
        errors = 0

        for row in raw[1:]:
            try:
                d = dict(zip(header, row))
                readings.append(SolarWindMagReading(
                    timestamp=_parse_timestamp(d.get("time_tag")),
                    bx_gsm=_parse_float(d.get("bx_gsm")),
                    by_gsm=_parse_float(d.get("by_gsm")),
                    bz_gsm=_parse_float(d.get("bz_gsm")),
                    bt=_parse_float(d.get("bt")),
                    lat_gsm=_parse_float(d.get("lat", d.get("lat_gsm"))),
                    lon_gsm=_parse_float(d.get("lon", d.get("lon_gsm"))),
                    source=source,
                ))
            except Exception:
                errors += 1
                continue

        return cls(readings=readings, source=source, parse_errors=errors)

    @classmethod
    def from_new_format(cls, raw: dict[str, Any], source: str = "DSCOVR") -> "SolarWindMagResponse":
        """
        Parse the 2026+ object format:
        { "data": [...], "meta": { "source": "DSCOVR", ... } }
        """
        meta = raw.get("meta", {})
        declared_source = meta.get("source", source)
        data_rows = raw.get("data", [])
        readings: list[SolarWindMagReading] = []
        errors = 0

        for row in data_rows:
            try:
                readings.append(SolarWindMagReading(
                    timestamp=_parse_timestamp(row.get("timestamp") or row.get("time_tag")),
                    bx_gsm=_parse_float(row.get("bx_gsm") or row.get("bx")),
                    by_gsm=_parse_float(row.get("by_gsm") or row.get("by")),
                    bz_gsm=_parse_float(row.get("bz_gsm") or row.get("bz")),
                    bt=_parse_float(row.get("bt") or row.get("bt_gsm")),
                    lat_gsm=_parse_float(row.get("lat_gsm") or row.get("lat")),
                    lon_gsm=_parse_float(row.get("lon_gsm") or row.get("lon")),
                    source=declared_source,
                ))
            except Exception:
                errors += 1
                continue

        return cls(readings=readings, source=declared_source, parse_errors=errors)


# ── Solar Wind Plasma ─────────────────────────────────────────────────────────

class SolarWindPlasmaReading(BaseModel):
    """Single 1-minute plasma measurement."""

    timestamp: Optional[datetime] = None
    speed: Optional[float] = None       # km/s  ← velocity alert driver
    density: Optional[float] = None     # p/cm³
    temperature: Optional[float] = None  # K
    source: str = "DSCOVR"

    @property
    def is_speed_alert(self) -> bool:
        from app.core.config import settings
        return self.speed is not None and self.speed > settings.SOLAR_WIND_SPEED_THRESHOLD


class SolarWindPlasmaResponse(BaseModel):
    readings: list[SolarWindPlasmaReading] = Field(default_factory=list)
    latest: Optional[SolarWindPlasmaReading] = None
    source: str = "DSCOVR"
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    data_gap: bool = False
    parse_errors: int = 0

    @model_validator(mode="after")
    def _set_latest(self) -> "SolarWindPlasmaResponse":
        if self.readings and self.latest is None:
            self.latest = self.readings[-1]
        return self

    @classmethod
    def from_legacy_list(cls, raw: list[list[Any]], source: str = "DSCOVR") -> "SolarWindPlasmaResponse":
        if not raw or len(raw) < 2:
            return cls(data_gap=True, source=source)

        header = [h.lower().strip() for h in raw[0]]
        readings: list[SolarWindPlasmaReading] = []
        errors = 0

        for row in raw[1:]:
            try:
                d = dict(zip(header, row))
                readings.append(SolarWindPlasmaReading(
                    timestamp=_parse_timestamp(d.get("time_tag")),
                    speed=_parse_float(d.get("speed")),
                    density=_parse_float(d.get("density")),
                    temperature=_parse_float(d.get("temperature")),
                    source=source,
                ))
            except Exception:
                errors += 1
                continue

        return cls(readings=readings, source=source, parse_errors=errors)

    @classmethod
    def from_new_format(cls, raw: dict[str, Any], source: str = "DSCOVR") -> "SolarWindPlasmaResponse":
        meta = raw.get("meta", {})
        declared_source = meta.get("source", source)
        data_rows = raw.get("data", [])
        readings: list[SolarWindPlasmaReading] = []
        errors = 0

        for row in data_rows:
            try:
                readings.append(SolarWindPlasmaReading(
                    timestamp=_parse_timestamp(row.get("timestamp") or row.get("time_tag")),
                    speed=_parse_float(row.get("speed") or row.get("proton_speed")),
                    density=_parse_float(row.get("density") or row.get("proton_density")),
                    temperature=_parse_float(row.get("temperature") or row.get("proton_temperature")),
                    source=declared_source,
                ))
            except Exception:
                errors += 1
                continue

        return cls(readings=readings, source=declared_source, parse_errors=errors)


# ── OVATION Aurora Grid ───────────────────────────────────────────────────────

class OvationCell(BaseModel):
    """Single cell in the 360×181 OVATION probability grid."""
    lon: float   # 0–359 degrees
    lat: float   # -90 to +90 degrees
    aurora: float  # 0–100 probability

    @field_validator("aurora", mode="before")
    @classmethod
    def clamp_aurora(cls, v: Any) -> float:
        val = _parse_float(v) or 0.0
        return max(0.0, min(100.0, val))


class OvationResponse(BaseModel):
    """Parsed OVATION auroral probability grid."""

    cells: list[OvationCell] = Field(default_factory=list)
    observation_time: Optional[datetime] = None
    forecast_time: Optional[datetime] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    data_gap: bool = False
    hemisphere: str = "north"  # 'north' | 'south' | 'both'

    @classmethod
    def from_noaa_json(cls, raw: dict[str, Any]) -> "OvationResponse":
        """
        OVATION JSON shape (both old and 2026+):
        {
          "Observation Time": "...",
          "Forecast Time": "...",
          "Data": [[lon, lat, aurora], ...]   ← old
          "data": [{"lon":...,"lat":...,"aurora":...}, ...]  ← new
        }
        """
        obs_time = _parse_timestamp(
            raw.get("Observation Time") or raw.get("observation_time")
        )
        fcst_time = _parse_timestamp(
            raw.get("Forecast Time") or raw.get("forecast_time")
        )

        cells: list[OvationCell] = []

        # Try all known NOAA key names for the grid data
        grid = (
            raw.get("coordinates") or
            raw.get("Data") or
            raw.get("data") or
            []
        )

        for row in grid:
            try:
                if isinstance(row, (list, tuple)):
                    cells.append(OvationCell(lon=float(row[0]), lat=float(row[1]), aurora=float(row[2])))
                elif isinstance(row, dict):
                    cells.append(OvationCell(
                        lon=float(row.get("lon", row.get("longitude", 0))),
                        lat=float(row.get("lat", row.get("latitude", 0))),
                        aurora=float(row.get("aurora", row.get("probability", 0))),
                    ))
            except Exception:
                continue

        return cls(
            cells=cells,
            observation_time=obs_time,
            forecast_time=fcst_time,
            data_gap=len(cells) == 0,
        )


# ── Kp Index ─────────────────────────────────────────────────────────────────

class KpReading(BaseModel):
    timestamp: Optional[datetime] = None
    kp: Optional[float] = None
    kp_fraction: Optional[float] = None   # e.g. 4.33 for Kp 4+
    observed: bool = True                  # False = estimated/predicted

    @field_validator("kp", mode="before")
    @classmethod
    def parse_kp(cls, v: Any) -> Optional[float]:
        """Handle NOAA Kp notation: '4+' → 4.33, '4-' → 3.67, '4o' → 4.0"""
        if v is None:
            return None
        s = str(v).strip()
        if s.endswith("+"):
            return float(s[:-1]) + 0.33
        if s.endswith("-"):
            return float(s[:-1]) - 0.33
        if s.endswith("o"):
            return float(s[:-1])
        return _parse_float(s)


class KpResponse(BaseModel):
    readings: list[KpReading] = Field(default_factory=list)
    latest: Optional[KpReading] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    data_gap: bool = False

    @model_validator(mode="after")
    def _set_latest(self) -> "KpResponse":
        if self.readings and self.latest is None:
            self.latest = self.readings[-1]
        return self


# ── Active Alerts ─────────────────────────────────────────────────────────────

class NoaaAlert(BaseModel):
    product_id: Optional[str] = None
    issue_datetime: Optional[datetime] = None
    message: Optional[str] = None
    alert_type: Optional[str] = None    # 'watch' | 'warning' | 'alert'
    severity: Optional[str] = None      # 'G1'–'G5'

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "NoaaAlert":
        return cls(
            product_id=d.get("product_id"),
            issue_datetime=_parse_timestamp(d.get("issue_datetime")),
            message=d.get("message"),
            alert_type=d.get("type", "alert"),
            severity=d.get("severity"),
        )


class AlertsResponse(BaseModel):
    alerts: list[NoaaAlert] = Field(default_factory=list)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    data_gap: bool = False


# ── Combined Space Weather State ──────────────────────────────────────────────

class SpaceWeatherState(BaseModel):
    """Aggregated, normalised snapshot of all live NOAA data."""

    mag: Optional[SolarWindMagResponse] = None
    plasma: Optional[SolarWindPlasmaResponse] = None
    ovation: Optional[OvationResponse] = None
    kp: Optional[KpResponse] = None
    alerts: Optional[AlertsResponse] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    @property
    def bz_alert_active(self) -> bool:
        return bool(self.mag and self.mag.latest and self.mag.latest.is_bz_alert)

    @property
    def speed_alert_active(self) -> bool:
        return bool(self.plasma and self.plasma.latest and self.plasma.latest.is_speed_alert)

    @property
    def any_alert_active(self) -> bool:
        return self.bz_alert_active or self.speed_alert_active

    def summary_dict(self) -> dict:
        return {
            "bz_gsm": self.mag.latest.bz_gsm if self.mag and self.mag.latest else None,
            "solar_wind_speed": self.plasma.latest.speed if self.plasma and self.plasma.latest else None,
            "kp": self.kp.latest.kp if self.kp and self.kp.latest else None,
            "bz_alert": self.bz_alert_active,
            "speed_alert": self.speed_alert_active,
            "any_alert": self.any_alert_active,
            "data_gap_mag": self.mag.data_gap if self.mag else True,
            "data_gap_plasma": self.plasma.data_gap if self.plasma else True,
            "data_gap_ovation": self.ovation.data_gap if self.ovation else True,
            "last_updated": self.last_updated.isoformat(),
        }
