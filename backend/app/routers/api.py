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
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Find GPS route to nearest dark-sky aurora viewing site."""
    result = await find_dark_sky_route(lat, lon)
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
