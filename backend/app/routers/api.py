"""
app/routers/api.py  —  all REST + WebSocket routes

Endpoints:
  GET  /api/space-weather/status
  GET  /api/space-weather/mag
  GET  /api/space-weather/plasma
  GET  /api/space-weather/ovation
  GET  /api/space-weather/kp
  GET  /api/space-weather/alerts

  GET  /api/visibility?lat=&lon=
  GET  /api/routing?lat=&lon=

  POST /api/locations
  GET  /api/locations
  DELETE /api/locations/{id}

  WS   /ws/{client_id}
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.services.noaa_poller import store
from app.services.visibility import compute_visibility_score
from app.services.routing import find_dark_sky_route
from app.services.alerts import ws_manager, save_location, get_location, list_locations, delete_location

import asyncio
from datetime import datetime, timezone
from typing import Optional

router = APIRouter()


# ── Space weather ─────────────────────────────────────────────────────────────

@router.get("/api/space-weather/status")
async def get_status():
    state = store.state
    return {
        "ok": True,
        "summary": state.summary_dict(),
        "alerts_active": state.any_alert_active,
        "using_ace_failover": state.mag.source == "ACE" if state.mag else False,
        "connected_clients": ws_manager.connection_count,
    }


@router.get("/api/space-weather/mag")
async def get_mag():
    mag = store.state.mag
    if not mag:
        raise HTTPException(503, "Mag data not yet available")
    return {
        "source":        mag.source,
        "fetched_at":    mag.fetched_at.isoformat(),
        "data_gap":      mag.data_gap,
        "parse_errors":  mag.parse_errors,
        "reading_count": len(mag.readings),
        "latest":        mag.latest.model_dump() if mag.latest else None,
        "recent":        [r.model_dump() for r in mag.readings[-120:]],
    }


@router.get("/api/space-weather/plasma")
async def get_plasma():
    plasma = store.state.plasma
    if not plasma:
        raise HTTPException(503, "Plasma data not yet available")
    return {
        "source":        plasma.source,
        "fetched_at":    plasma.fetched_at.isoformat(),
        "data_gap":      plasma.data_gap,
        "parse_errors":  plasma.parse_errors,
        "reading_count": len(plasma.readings),
        "latest":        plasma.latest.model_dump() if plasma.latest else None,
        "recent":        [r.model_dump() for r in plasma.readings[-120:]],
    }


@router.get("/api/space-weather/ovation")
async def get_ovation():
    ovation = store.state.ovation
    if not ovation:
        raise HTTPException(503, "OVATION data not yet available")
    return {
        "observation_time": ovation.observation_time.isoformat() if ovation.observation_time else None,
        "forecast_time":    ovation.forecast_time.isoformat() if ovation.forecast_time else None,
        "fetched_at":       ovation.fetched_at.isoformat(),
        "data_gap":         ovation.data_gap,
        "cell_count":       len(ovation.cells),
        "cells":            [c.model_dump() for c in ovation.cells],
    }


@router.get("/api/space-weather/kp")
async def get_kp():
    kp = store.state.kp
    if not kp:
        raise HTTPException(503, "Kp data not yet available")
    return {
        "fetched_at": kp.fetched_at.isoformat(),
        "data_gap":   kp.data_gap,
        "latest":     kp.latest.model_dump() if kp.latest else None,
        "recent":     [r.model_dump() for r in kp.readings[-8:]],
    }


@router.get("/api/space-weather/noaa-alerts")
async def get_noaa_alerts():
    alerts = store.state.alerts
    if not alerts:
        raise HTTPException(503, "Alerts data not yet available")
    return {
        "fetched_at": alerts.fetched_at.isoformat(),
        "data_gap":   alerts.data_gap,
        "count":      len(alerts.alerts),
        "alerts":     [a.model_dump() for a in alerts.alerts],
    }


# ── Visibility score ──────────────────────────────────────────────────────────

@router.get("/api/forecast")
async def get_forecast():
    """3-day Kp forecast from NOAA."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json")
            raw = r.json()
        header = raw[0]
        rows = []
        for item in raw[1:]:
            d = dict(zip(header, item))
            rows.append({
                "time_tag": d.get("time_tag"),
                "kp": float(d["kp"]) if d.get("kp") else None,
                "observed": d.get("observed") == "observed",
                "noaa_scale": d.get("noaa_scale"),
            })
        return {"forecast": rows, "count": len(rows)}
    except Exception as e:
        return {"forecast": [], "count": 0, "error": str(e)}


@router.get("/api/visibility")
async def get_visibility(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Compute composite visibility score for any lat/lon."""
    result = await compute_visibility_score(lat, lon)
    return result


# ── Dark sky routing (stretch goal) ──────────────────────────────────────────

@router.get("/api/routing")
async def get_routing(
    lat: float = Query(..., ge=-90, le=90, description="Your latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Your longitude"),
    min_aurora: Optional[float] = Query(None, ge=0, le=100, description="Minimum aurora probability (0-100). Default: auto based on Kp"),
    max_clouds: Optional[float] = Query(None, ge=0, le=100, description="Maximum cloud cover (0-100%). Default: 50%"),
    max_bortle: Optional[int] = Query(None, ge=1, le=9, description="Maximum Bortle class (1-9). Default: 5"),
):
    """
    Find GPS route to nearest dark-sky aurora viewing site.
    
    Criteria thresholds can be customized:
    - min_aurora: Lower this if you're willing to chase fainter aurora (default: auto based on Kp)
    - max_clouds: Raise this if you're okay with some clouds (default: 50%)
    - max_bortle: Raise this if light pollution is acceptable (default: 5)
    
    Examples:
    - Strict: min_aurora=70&max_clouds=20&max_bortle=3
    - Relaxed: min_aurora=30&max_clouds=70&max_bortle=6
    - Auto: Don't specify parameters (uses smart defaults)
    """
    result = await find_dark_sky_route(
        lat, 
        lon,
        min_aurora_threshold=min_aurora,
        max_cloud_threshold=max_clouds,
        max_bortle_threshold=max_bortle
    )
    return result


# ── Saved locations ───────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str           = Field(..., min_length=1, max_length=100)
    lat:  float         = Field(..., ge=-90, le=90)
    lon:  float         = Field(..., ge=-180, le=180)
    threshold: float    = Field(60.0, ge=0, le=100)


@router.post("/api/locations", status_code=201)
async def create_location(body: LocationCreate):
    loc_id = str(uuid.uuid4())[:8]
    loc = save_location(loc_id, body.name, body.lat, body.lon, body.threshold)
    return loc


@router.get("/api/locations")
async def get_locations():
    return {"locations": list_locations()}


@router.delete("/api/locations/{location_id}")
async def remove_location(location_id: str):
    if not delete_location(location_id):
        raise HTTPException(404, "Location not found")
    return {"deleted": location_id}


@router.get("/api/health")
async def health_check():
    """
    Comprehensive health check endpoint.
    Returns service status and data freshness.
    """
    state = store.state
    now = datetime.now(timezone.utc)
    
    def time_since(dt):
        if not dt:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = now - dt
        return delta.total_seconds()
    
    mag_latest_age = time_since(state.mag.latest.timestamp) if state.mag and state.mag.latest else None
    plasma_latest_age = time_since(state.plasma.latest.timestamp) if state.plasma and state.plasma.latest else None
    
    return {
        "status": "healthy" if not state.mag.data_gap else "degraded",
        "timestamp": now.isoformat(),
        "uptime_seconds": (now - state.last_updated).total_seconds() if state.last_updated else 0,
        "data_sources": {
            "mag": {
                "available": state.mag is not None,
                "data_gap": state.mag.data_gap if state.mag else True,
                "source": state.mag.source if state.mag else None,
                "latest_reading_age_seconds": mag_latest_age,
                "readings_count": len(state.mag.readings) if state.mag else 0,
            },
            "plasma": {
                "available": state.plasma is not None,
                "data_gap": state.plasma.data_gap if state.plasma else True,
                "latest_reading_age_seconds": plasma_latest_age,
                "readings_count": len(state.plasma.readings) if state.plasma else 0,
            },
            "ovation": {
                "available": state.ovation is not None,
                "data_gap": state.ovation.data_gap if state.ovation else True,
                "cell_count": len(state.ovation.cells) if state.ovation else 0,
            },
            "kp": {
                "available": state.kp is not None,
                "current_value": state.kp.latest.kp if state.kp and state.kp.latest else None,
            },
        },
        "alerts": {
            "bz_active": state.bz_alert_active,
            "speed_active": state.speed_alert_active,
            "any_active": state.any_alert_active,
        },
        "websocket_clients": ws_manager.connection_count,
    }


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Real-time event stream.

    Client messages (JSON):
      { "action": "subscribe", "location_id": "abc123" }
      { "action": "subscribe", "location_id": "ALL" }    ← all alerts
      { "action": "ping" }

    Server messages:
      { "type": "SPACE_WEATHER_ALERT",    "event": {...} }
      { "type": "VISIBILITY_THRESHOLD_MET", "location_id": "...", ... }
      { "type": "PONG" }
      { "type": "WELCOME", "client_id": "..." }
    """
    await ws_manager.connect(client_id, websocket)

    try:
        # Send welcome with current state
        import json
        await websocket.send_text(json.dumps({
            "type":      "WELCOME",
            "client_id": client_id,
            "summary":   store.state.summary_dict(),
        }))

        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "subscribe":
                loc_id = data.get("location_id", "ALL")
                await ws_manager.subscribe(client_id, loc_id)
                await websocket.send_json({"type": "SUBSCRIBED", "location_id": loc_id})

            elif action == "ping":
                await websocket.send_json({"type": "PONG"})

            elif action == "get_status":
                await websocket.send_json({
                    "type":    "STATUS",
                    "summary": store.state.summary_dict(),
                })

    except WebSocketDisconnect:
        await ws_manager.disconnect(client_id)
    except Exception as exc:
        from app.core.logging import logger
        logger.warning("ws_error", client_id=client_id, error=str(exc))
        await ws_manager.disconnect(client_id)


from typing import List

class LocationBatch(BaseModel):
    locations: List[dict] = Field(..., max_items=50)  # Limit to 50 locations


@router.post("/api/visibility/batch")
async def get_visibility_batch(body: LocationBatch):
    """
    Compute visibility scores for multiple locations in one request.
    Useful for map overlays or comparing multiple sites.
    
    Example request:
    {
      "locations": [
        {"lat": 65.0, "lon": -18.0, "name": "Reykjavik"},
        {"lat": 69.6, "lon": 18.9, "name": "Tromsø"}
      ]
    }
    """
    results = []
    
    # Process in parallel with semaphore to limit concurrency
    sem = asyncio.Semaphore(10)
    
    async def score_location(loc):
        async with sem:
            try:
                result = await compute_visibility_score(loc["lat"], loc["lon"])
                result["name"] = loc.get("name", f"{loc['lat']}, {loc['lon']}")
                return result
            except Exception as e:
                return {
                    "lat": loc["lat"],
                    "lon": loc["lon"],
                    "name": loc.get("name"),
                    "error": str(e),
                    "composite_score": 0
                }
    
    results = await asyncio.gather(*[score_location(loc) for loc in body.locations])
    
    return {
        "count": len(results),
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }        

@router.get("/api/stats")
async def get_statistics():
    """
    Return statistical analysis of recent space weather data.
    Useful for showing trends and anomalies.
    """
    state = store.state
    
    if not state.mag or not state.mag.readings:
        raise HTTPException(503, "Not enough data for statistics")
    
    # Calculate Bz statistics over last 2 hours
    recent_mag = [r for r in state.mag.readings if r.bz_gsm is not None][-120:]
    bz_values = [r.bz_gsm for r in recent_mag]
    
    # Calculate speed statistics
    recent_plasma = []
    if state.plasma and state.plasma.readings:
        recent_plasma = [r for r in state.plasma.readings if r.speed is not None][-120:]
    speed_values = [r.speed for r in recent_plasma]
    
    import statistics
    
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bz_stats": {
            "current": bz_values[-1] if bz_values else None,
            "mean_2h": round(statistics.mean(bz_values), 2) if bz_values else None,
            "min_2h": round(min(bz_values), 2) if bz_values else None,
            "max_2h": round(max(bz_values), 2) if bz_values else None,
            "stdev_2h": round(statistics.stdev(bz_values), 2) if len(bz_values) > 1 else None,
            "alert_threshold": state.mag.latest.bz_alert_threshold if state.mag.latest else -7.0,
            "below_threshold_count": sum(1 for v in bz_values if v < -7.0),
        },
        "speed_stats": {
            "current": speed_values[-1] if speed_values else None,
            "mean_2h": round(statistics.mean(speed_values), 1) if speed_values else None,
            "max_2h": round(max(speed_values), 1) if speed_values else None,
        },
        "kp": {
            "current": state.kp.latest.kp if state.kp and state.kp.latest else None,
        },
        "data_quality": {
            "mag_readings": len(recent_mag),
            "plasma_readings": len(recent_plasma),
            "mag_gap": state.mag.data_gap,
            "plasma_gap": state.plasma.data_gap if state.plasma else True,
        }
    }

# Simple in-memory metrics
_request_counts = {}
_request_durations = {}

@router.get("/api/metrics")
async def get_metrics():
    """
    Simple metrics endpoint for monitoring.
    In production, use Prometheus or similar.
    """
    return {
        "uptime": (datetime.now(timezone.utc) - store.state.last_updated).total_seconds()
            if store.state.last_updated else 0,
        "websocket_connections": ws_manager.connection_count,
        "data_freshness": {
            "mag_readings": len(store.state.mag.readings) if store.state.mag else 0,
            "plasma_readings": len(store.state.plasma.readings) if store.state.plasma else 0,
            "ovation_cells": len(store.state.ovation.cells) if store.state.ovation else 0,
        },
        "cache_size": len(getattr(_fetch_cloud_cover_cached, '_cache', {})),
    }