"""
app/services/routing.py

GPS Routing — Stretch Goal.

Finds the nearest point satisfying ALL three criteria:
  1. Aurora probability > 50%  (from OVATION)
  2. Cloud cover < 30%         (from Open-Meteo)
  3. Bortle class < 4          (light pollution)

Strategy:
  - Generate candidate waypoints in expanding rings from the user's location
  - Score each candidate with a lightweight version of the visibility engine
  - Return the best candidate with a navigable route object
"""
from __future__ import annotations

import asyncio
import math
from typing import Optional
import json
import os

import httpx

from app.core.logging import logger

from app.services.visibility import (
    _aurora_score_for_location,
    _estimate_bortle,
    _fetch_cloud_cover_cached,
)




# Criteria thresholds — dynamically adjusted based on Kp
from app.services.noaa_poller import store as _store

from datetime import datetime, timezone

# ── Premium Dark Sky Locations ────────────────────────────────────────────────
# A curated list of International Dark Sky Parks and famous aurora viewing spots.
# (Loaded from GeoJSON/JSON) ─────────────────────
_PREMIUM_DARK_SITES = []

def _load_dark_sky_parks():
    global _PREMIUM_DARK_SITES
    # Build the absolute path to app/data/dark_sky_parks.json
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "data", "dark_sky_parks.json")
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            _PREMIUM_DARK_SITES = json.load(f)
            from app.core.logging import logger
            logger.info("dark_sky_database_loaded", count=len(_PREMIUM_DARK_SITES))
    except Exception as e:
        from app.core.logging import logger
        logger.error("dark_sky_database_load_failed", error=str(e))
        _PREMIUM_DARK_SITES = []

# Load it immediately when the module is imported
_load_dark_sky_parks()
# ──────────────────────────────────────────────────────────────────────────────

def _approx_magnetic_latitude(lat: float, lon: float) -> float:
    """
    Approximates Geomagnetic Latitude using the Centered Dipole model.
    """
    import math
    # 2025 Approx Geomagnetic North Pole coordinates
    pole_lat = math.radians(80.65)
    pole_lon = math.radians(-72.68)
    
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    
    sin_mag_lat = (math.sin(lat_r) * math.sin(pole_lat) + 
                   math.cos(lat_r) * math.cos(pole_lat) * math.cos(lon_r - pole_lon))
    
    return math.degrees(math.asin(sin_mag_lat))

def _get_thresholds():
    kp = None
    if _store.state.kp and _store.state.kp.latest:
        kp = _store.state.kp.latest.kp
    # Lower aurora threshold when Kp is high (storm extends oval southward)
    if kp and kp >= 5:
        return 20.0, 50.0, 5   # aurora%, cloud%, bortle
    elif kp and kp >= 3:
        return 30.0, 40.0, 4
    else:
        return 50.0, 30.0, 4

MIN_AURORA_PROB  = 20.0   # % (dynamic)
MAX_CLOUD_COVER  = 50.0   # % (dynamic)
MAX_BORTLE       = 5      # (dynamic)


def _destination(lat: float, lon: float, bearing_deg: float, distance_km: float) -> tuple[float, float]:
    """Calculate lat/lon given start, bearing, and distance."""
    R = 6371.0
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    b_r   = math.radians(bearing_deg)
    d_r   = distance_km / R

    lat2 = math.asin(
        math.sin(lat_r) * math.cos(d_r) +
        math.cos(lat_r) * math.sin(d_r) * math.cos(b_r)
    )
    lon2 = lon_r + math.atan2(
        math.sin(b_r) * math.sin(d_r) * math.cos(lat_r),
        math.cos(d_r) - math.sin(lat_r) * math.sin(lat2)
    )
    return math.degrees(lat2), math.degrees(lon2)


def _generate_candidates(lat: float, lon: float) -> list[tuple[float, float, float]]:
    """
    Generate candidate locations in concentric rings.
    Also injects certified Dark Sky locations from the IDA database if nearby.
    Returns list of (lat, lon, distance_km).
    """
    candidates = []
    
    # --- Check IDA Dark Sky Database First ---
    from app.services.visibility import _haversine_km
    for site in _PREMIUM_DARK_SITES:
        plat = site["lat"]
        plon = site["lon"]
        dist = _haversine_km(lat, lon, plat, plon)
        if dist < 300:  # If a premium dark sky park is within a 300km drive
            candidates.append((plat, plon, dist))
    # -----------------------------------------

    # Standard 8 directions
    bearings  = [0, 45, 90, 135, 180, 225, 270, 315]
    distances = [20, 40, 70, 110, 160]

    for dist in distances:
        for bearing in bearings:
            clat, clon = _destination(lat, lon, bearing, dist)
            candidates.append((clat, clon, dist))

    # Extra northward candidates — aurora oval is always poleward
    for dist in [30, 60, 100, 150, 200, 250]:
        clat, clon = _destination(lat, lon, 0, dist)
        candidates.append((clat, clon, dist))

    return candidates


def _aurora_score_direct(lat: float, lon: float) -> float:
    """
    Direct OVATION lookup with wider search radius.
    Falls back to Kp-based estimate if OVATION returns 0.
    """
    from app.services.noaa_poller import store
    score = _aurora_score_for_location(lat, lon)

    # If OVATION returns near-zero, estimate from Kp + latitude
    if score < 5:
        kp = None
        if store.state.kp and store.state.kp.latest:
            kp = store.state.kp.latest.kp
        if kp:
            # --- NEW MAGNETIC LATITUDE MATH (PURE PYTHON) ---
            mag_lat = _approx_magnetic_latitude(lat, lon)
                
            # Auroral oval visibility latitude: roughly 67 - (kp * 2) degrees
            oval_lat = 67 - (kp * 2)
            
            # Compare distance using absolute MAGNETIC latitude
            dist_from_oval = abs(abs(mag_lat) - oval_lat)
            # ------------------------------------------------
            
            if dist_from_oval < 3:
                score = 80.0
            elif dist_from_oval < 6:
                score = 60.0
            elif dist_from_oval < 10:
                score = 40.0
            elif dist_from_oval < 15:
                score = 20.0

    return score


async def _score_candidate(lat: float, lon: float) -> dict:
    """Quick-score a candidate location."""
    aurora_prob = _aurora_score_direct(lat, lon)
    bortle = _estimate_bortle(lat, lon)

    # Only fetch cloud cover if the other criteria look promising
    if aurora_prob < MIN_AURORA_PROB or bortle >= MAX_BORTLE:
        return {
            "lat": lat, "lon": lon,
            "aurora_prob": round(aurora_prob, 1),
            "bortle": bortle,
            "cloud_cover": 999,
            "qualifies": False,
        }

    cloud = await _fetch_cloud_cover_cached(lat, lon)
    qualifies = (
        aurora_prob >= MIN_AURORA_PROB and
        cloud <= MAX_CLOUD_COVER and
        bortle < MAX_BORTLE
    )

    return {
        "lat": lat, "lon": lon,
        "aurora_prob": round(aurora_prob, 1),
        "bortle": bortle,
        "cloud_cover": round(cloud, 1),
        "qualifies": qualifies,
    }


def _build_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float, distance_km: float) -> dict:
    """
    Build a simple route object. In production this would call a routing API
    (e.g. OSRM or Google Directions). For the hackathon we return a direct
    bearing + distance with intermediate waypoints.
    """
    bearing = math.degrees(math.atan2(
        math.sin(math.radians(dest_lon - origin_lon)) * math.cos(math.radians(dest_lat)),
        math.cos(math.radians(origin_lat)) * math.sin(math.radians(dest_lat)) -
        math.sin(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) *
        math.cos(math.radians(dest_lon - origin_lon))
    )) % 360

    # Generate 4 intermediate waypoints along the great circle
    waypoints = []
    for frac in [0.25, 0.5, 0.75]:
        wlat, wlon = _destination(origin_lat, origin_lon, bearing, distance_km * frac)
        waypoints.append({"lat": round(wlat, 5), "lon": round(wlon, 5)})

    return {
        "origin":      {"lat": round(origin_lat, 5), "lon": round(origin_lon, 5)},
        "destination": {"lat": round(dest_lat, 5),   "lon": round(dest_lon, 5)},
        "distance_km": round(distance_km, 1),
        "bearing_deg": round(bearing, 1),
        "estimated_drive_min": round(distance_km / 80 * 60),  # assume 80 km/h rural
        "waypoints": waypoints,
        "google_maps_url": (
            f"https://www.google.com/maps/dir/{origin_lat},{origin_lon}/"
            f"{dest_lat},{dest_lon}"
        ),
    }


async def find_dark_sky_route(
    lat: float, 
    lon: float,
    min_aurora_threshold: Optional[float] = None,
    max_cloud_threshold: Optional[float] = None,
    max_bortle_threshold: Optional[int] = None
) -> dict:
    """
    Main entry point for GPS routing stretch goal.

    Returns either:
      { "found": True,  "site": {...}, "route": {...} }
      { "found": False, "reason": "...", "best_candidate": {...} }
    """
    # Validate inputs
    if not (-90 <= lat <= 90):
        return {
            "found": False,
            "reason": f"Invalid latitude: {lat}",
            "error": "INVALID_INPUT"
        }
    if not (-180 <= lon <= 180):
        return {
            "found": False,
            "reason": f"Invalid longitude: {lon}",
            "error": "INVALID_INPUT"
        }
    
    # Check if we have OVATION data
    from app.services.noaa_poller import store as _store
    if not _store.state.ovation or not _store.state.ovation.cells:
        return {
            "found": False,
            "reason": "OVATION aurora data not yet available. Try again in 30 seconds.",
            "error": "DATA_NOT_READY"
        }
    
    candidates = _generate_candidates(lat, lon)

    # Score all candidates concurrently (with semaphore to avoid hammering APIs)
    sem = asyncio.Semaphore(5)

    async def rate_limited(clat, clon):
        async with sem:
            return await _score_candidate(clat, clon)

    results = await asyncio.gather(*[
        rate_limited(clat, clon) for clat, clon, _ in candidates
    ])

    # Tag with distance
    for i, (clat, clon, dist) in enumerate(candidates):
        results[i]["distance_km"] = dist

    # Use user-provided thresholds or fall back to smart defaults
    if min_aurora_threshold is None or max_cloud_threshold is None or max_bortle_threshold is None:
    # Get smart defaults based on current Kp
        default_aurora, default_cloud, default_bortle = _get_thresholds()
        MIN_AURORA_PROB = min_aurora_threshold if min_aurora_threshold is not None else default_aurora
        MAX_CLOUD_COVER = max_cloud_threshold if max_cloud_threshold is not None else default_cloud
        MAX_BORTLE = max_bortle_threshold if max_bortle_threshold is not None else default_bortle
    else:
        MIN_AURORA_PROB = min_aurora_threshold
        MAX_CLOUD_COVER = max_cloud_threshold
        MAX_BORTLE = max_bortle_threshold
    # Re-evaluate with dynamic thresholds
    for r in results:
        r["qualifies"] = (
            r["aurora_prob"] >= MIN_AURORA_PROB and
            r.get("cloud_cover", 999) <= MAX_CLOUD_COVER and
            r["bortle"] < MAX_BORTLE
        )
    qualifying = [r for r in results if r["qualifies"]]

    if qualifying:
        # Pick nearest qualifying site
        best = min(qualifying, key=lambda r: r["distance_km"])
        route = _build_route(lat, lon, best["lat"], best["lon"], best["distance_km"])
        logger.info(
            "dark_sky_route_found",
            distance_km=best["distance_km"],
            aurora=best["aurora_prob"],
            bortle=best["bortle"],
            cloud=best["cloud_cover"],
        )
        return {
            "found": True,
            "site": {
                "lat": best["lat"],
                "lon": best["lon"],
                "aurora_probability": best["aurora_prob"],
                "bortle_class": best["bortle"],
                "cloud_cover_pct": best["cloud_cover"],
            },
            "route": route,
            "criteria": {
                "min_aurora_prob": MIN_AURORA_PROB,
                "max_cloud_cover": MAX_CLOUD_COVER,
                "max_bortle":      MAX_BORTLE,
            },
        }

    # No qualifying site found — return the best partial match
    best_partial = max(results, key=lambda r: (
        r["aurora_prob"] * 0.5 +
        max(0, 100 - r.get("cloud_cover", 100)) * 0.3 +
        max(0, (MAX_BORTLE - r["bortle"]) * 10)
    ))
    reason = "No location within 160 km meets all three criteria simultaneously"
    if all(r["aurora_prob"] < MIN_AURORA_PROB for r in results):
        reason = "Aurora activity too low across the entire region"
    elif all(r.get("cloud_cover", 100) > MAX_CLOUD_COVER for r in results if r["aurora_prob"] >= MIN_AURORA_PROB):
        reason = "Cloud cover blocking aurora across the entire viewing zone"

    logger.info("dark_sky_route_not_found", reason=reason)
    return {
        "found": False,
        "reason": reason,
        "best_candidate": best_partial,
        "criteria": {
            "min_aurora_prob": MIN_AURORA_PROB,
            "max_cloud_cover": MAX_CLOUD_COVER,
            "max_bortle":      MAX_BORTLE,
        },
    }
