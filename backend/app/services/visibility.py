"""
app/services/visibility.py

Composite Visibility Score Engine (0-100).

Score = 0.45 * aurora_score
      + 0.30 * darkness_score
      + 0.25 * cloud_score

aurora_score   — OVATION probability interpolated to the user's lat/lon
darkness_score — combines Bortle class light pollution + lunar illumination
                 + astronomical twilight (computed via ephem)
cloud_score    — inverted cloud cover from Open-Meteo free API
"""
from __future__ import annotations

import math
import asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx
import ephem

from app.core.config import settings
from app.core.logging import logger
from app.services.noaa_poller import store


# ── Weights ───────────────────────────────────────────────────────────────────
W_AURORA   = 0.45
W_DARKNESS = 0.30
W_CLOUD    = 0.25

# Open-Meteo free endpoint — no API key required
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&hourly=cloudcover&forecast_days=1&timezone=UTC"
)


# ── Bortle class lookup (approximate by lat/lon distance to dark-sky zones) ──
# Real implementation would use VIIRS DNB raster.
# For hackathon: we use a simplified model based on population density proxy
# (distance from major cities correlates well enough for demo scoring).
_MAJOR_CITIES: list[tuple[float, float, int]] = [
    # lat, lon, bortle_class_within_20km
    (51.5, -0.12, 9),   # London
    (48.85, 2.35, 9),   # Paris
    (52.52, 13.4, 8),   # Berlin
    (40.71, -74.0, 9),  # NYC
    (34.05, -118.24, 8),# LA
    (55.75, 37.62, 9),  # Moscow
    (35.68, 139.69, 9), # Tokyo
    (55.86, -4.25, 7),  # Glasgow
    (53.48, -2.24, 8),  # Manchester
    (59.91, 10.75, 7),  # Oslo
    (60.17, 24.94, 7),  # Helsinki
    (64.14, -21.94, 4), # Reykjavik
    (69.65, 18.96, 2),  # Tromsø
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _estimate_bortle(lat: float, lon: float) -> int:
    """
    Estimate Bortle sky class (1=darkest, 9=inner city) for a coordinate.
    Uses nearest major city distance as a proxy.
    High latitudes with no nearby city default to class 3.
    """
    min_dist = float('inf')
    nearest_bortle = 3

    for clat, clon, bortle in _MAJOR_CITIES:
        d = _haversine_km(lat, lon, clat, clon)
        if d < min_dist:
            min_dist = d
            nearest_bortle = bortle

    if min_dist < 20:
        return nearest_bortle
    elif min_dist < 50:
        return max(1, nearest_bortle - 2)
    elif min_dist < 100:
        return max(1, nearest_bortle - 3)
    else:
        # Rural / remote — high latitude bonus
        base = 3 if lat > 55 else 4
        return base


def _bortle_to_score(bortle: int) -> float:
    """Convert Bortle class (1=best, 9=worst) to 0-100 score."""
    # 1→100, 2→88, 3→75, 4→62, 5→50, 6→37, 7→25, 8→12, 9→0
    return max(0.0, (9 - bortle) / 8 * 100)


def _lunar_score(lat: float, lon: float, dt: datetime) -> float:
    """
    0-100 score based on lunar illumination and altitude.
    Full moon above horizon = 0. New moon / below horizon = 100.
    """
    obs = ephem.Observer()
    obs.lat  = str(lat)
    obs.lon  = str(lon)
    obs.date = dt.strftime('%Y/%m/%d %H:%M:%S')

    moon = ephem.Moon(obs)
    illumination = moon.phase / 100.0  # 0-1
    altitude_deg = math.degrees(float(moon.alt))

    if altitude_deg < 0:
        # Moon is below horizon — no interference
        return 100.0

    # Moon above horizon: penalise by illumination and altitude
    altitude_factor = min(1.0, altitude_deg / 60.0)
    penalty = illumination * altitude_factor
    return max(0.0, (1.0 - penalty) * 100.0)


def _twilight_score(lat: float, lon: float, dt: datetime) -> float:
    """
    100 = astronomical night (sun > 18° below horizon)
    50  = nautical twilight
    0   = civil twilight or daytime
    """
    obs = ephem.Observer()
    obs.lat  = str(lat)
    obs.lon  = str(lon)
    obs.date = dt.strftime('%Y/%m/%d %H:%M:%S')

    sun = ephem.Sun(obs)
    sun_alt = math.degrees(float(sun.alt))

    if sun_alt < -18:
        return 100.0
    elif sun_alt < -12:
        return 75.0
    elif sun_alt < -6:
        return 40.0
    elif sun_alt < 0:
        return 10.0
    else:
        return 0.0


def _darkness_score(lat: float, lon: float, dt: datetime) -> float:
    """Combined darkness score: bortle + lunar + twilight."""
    bortle  = _bortle_to_score(_estimate_bortle(lat, lon))
    lunar   = _lunar_score(lat, lon, dt)
    twilight = _twilight_score(lat, lon, dt)

    # Twilight is the hard gate — if it's daytime, score is nearly 0
    if twilight < 5:
        return twilight

    return bortle * 0.40 + lunar * 0.30 + twilight * 0.30


def _aurora_score_for_location(lat: float, lon: float) -> float:
    """
    Interpolate OVATION probability at (lat, lon).
    Uses inverse-distance weighting over the 4 nearest grid cells.
    Returns 0-100.
    """
    ovation = store.state.ovation
    if not ovation or not ovation.cells:
        return 0.0

    # Normalise lon to 0-359
    norm_lon = lon % 360

    # Find 16 nearest cells for better interpolation
    candidates = sorted(
        ovation.cells,
        key=lambda c: (c.lat - lat)**2 + (_lon_dist(c.lon, norm_lon))**2
    )[:16]

    if not candidates:
        return 0.0

    total_weight = 0.0
    weighted_prob = 0.0
    for cell in candidates:
        dist = math.sqrt((cell.lat - lat)**2 + _lon_dist(cell.lon, norm_lon)**2)
        if dist < 1e-6:
            return float(cell.aurora)
        w = 1.0 / dist
        weighted_prob += w * cell.aurora
        total_weight += w

    return weighted_prob / total_weight if total_weight > 0 else 0.0


def _lon_dist(a: float, b: float) -> float:
    """Shortest angular distance between two longitudes (0-360)."""
    d = abs(a - b)
    return min(d, 360 - d)


async def _fetch_cloud_cover(lat: float, lon: float) -> float:
    """
    Fetch current hour cloud cover (%) from Open-Meteo.
    Returns 0-100. On failure returns 50 (neutral).
    """
    url = OPEN_METEO_URL.format(lat=round(lat, 4), lon=round(lon, 4))
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        times  = hourly.get("time", [])
        covers = hourly.get("cloudcover", [])

        if not times or not covers:
            return 50.0

        # Find closest hour to now
        now = datetime.now(timezone.utc)
        best_idx = 0
        best_diff = float('inf')
        for i, t in enumerate(times):
            try:
                dt = datetime.fromisoformat(t).replace(tzinfo=timezone.utc)
                diff = abs((dt - now).total_seconds())
                if diff < best_diff:
                    best_diff = diff
                    best_idx = i
            except Exception:
                continue

        cloud = covers[best_idx]
        return float(cloud) if cloud is not None else 50.0

    except Exception as exc:
        logger.warning("cloud_cover_fetch_failed", error=str(exc), lat=lat, lon=lon)
        return 50.0


async def compute_visibility_score(lat: float, lon: float) -> dict:
    """
    Main entry point. Returns a full breakdown dict with composite score.
    """
    now = datetime.now(timezone.utc)

    # Run cloud fetch concurrently with local calculations
    cloud_coro = _fetch_cloud_cover(lat, lon)
    cloud_cover_pct, aurora_prob = await asyncio.gather(
        cloud_coro,
        asyncio.to_thread(_aurora_score_for_location, lat, lon),
    )

    darkness   = _darkness_score(lat, lon, now)
    cloud_score = max(0.0, 100.0 - cloud_cover_pct)
    bortle_class = _estimate_bortle(lat, lon)
    lunar_score  = _lunar_score(lat, lon, now)
    twilight_score = _twilight_score(lat, lon, now)

    # Boost score based on Kp — high Kp means aurora may be visible
    # even if OVATION local probability is low
    kp_val = None
    if store.state.kp and store.state.kp.latest:
        kp_val = store.state.kp.latest.kp
    kp_boost = min(30.0, (kp_val / 9.0) * 30.0) if kp_val else 0.0

    # Use max of OVATION probability and Kp-derived estimate
    effective_aurora = max(aurora_prob, kp_boost)

    composite = (
        W_AURORA   * effective_aurora +
        W_DARKNESS * darkness         +
        W_CLOUD    * cloud_score
    )

    result = {
        "lat": lat,
        "lon": lon,
        "timestamp": now.isoformat(),
        "composite_score": round(composite, 1),
        "components": {
            "aurora_probability": round(aurora_prob, 1),
            "aurora_score":       round(aurora_prob, 1),
            "darkness_score":     round(darkness, 1),
            "cloud_score":        round(cloud_score, 1),
            "cloud_cover_pct":    round(cloud_cover_pct, 1),
        },
        "darkness_breakdown": {
            "bortle_class":    bortle_class,
            "bortle_score":    round(_bortle_to_score(bortle_class), 1),
            "lunar_score":     round(lunar_score, 1),
            "twilight_score":  round(twilight_score, 1),
        },
        "weights": {
            "aurora":   W_AURORA,
            "darkness": W_DARKNESS,
            "cloud":    W_CLOUD,
        },
        "recommendation": _recommendation(composite, aurora_prob, cloud_cover_pct, darkness),
        "photo_settings": _photo_settings(store.state.kp.latest.kp if store.state.kp and store.state.kp.latest else None),
    }

    logger.info("visibility_score_computed", lat=lat, lon=lon, score=composite)
    return result


def _recommendation(score: float, aurora: float, cloud: float, darkness: float) -> str:
    if score >= 75:
        return "Excellent conditions. Head out now."
    elif score >= 55:
        if cloud > 60:
            return "Good aurora activity but cloud cover limiting visibility. Monitor for breaks."
        return "Good conditions. Worth heading to a dark site."
    elif score >= 35:
        if aurora < 30:
            return "Low aurora activity currently. Watch for Bz to turn southward."
        return "Moderate conditions. Check cloud forecast for next 2 hours."
    else:
        if darkness < 20:
            return "Too much daylight or light pollution. Wait for astronomical night."
        return "Poor conditions. Aurora activity or sky transparency insufficient."


def _photo_settings(kp: Optional[float]) -> dict:
    """Suggest camera settings based on Kp index."""
    if kp is None:
        kp = 3.0

    if kp >= 7:
        return {"iso": 800,  "aperture": "f/2.0", "shutter": "4s",  "note": "Bright storm — short exposures preserve structure"}
    elif kp >= 5:
        return {"iso": 1600, "aperture": "f/2.0", "shutter": "8s",  "note": "Active display — balance detail vs motion blur"}
    elif kp >= 3:
        return {"iso": 3200, "aperture": "f/2.0", "shutter": "15s", "note": "Moderate activity — longer exposure needed"}
    else:
        return {"iso": 6400, "aperture": "f/2.0", "shutter": "25s", "note": "Low activity — max exposure, wide aperture essential"}
