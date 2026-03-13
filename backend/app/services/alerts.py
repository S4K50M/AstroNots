"""
app/services/alerts.py

Alert manager — user-configurable thresholds + WebSocket broadcast.

Users can save locations with a visibility_threshold (0-100).
When that location's score exceeds the threshold, a push event fires
to all connected WebSocket clients subscribed to that location.

In-memory storage for hackathon. Replace with Redis/DB for production.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

from app.core.logging import logger
from app.services.noaa_poller import store


# ── Saved locations store ─────────────────────────────────────────────────────

_saved_locations: dict[str, dict] = {}
# key = location_id, value = {id, name, lat, lon, threshold, email?}


def save_location(location_id: str, name: str, lat: float, lon: float, threshold: float = 60.0) -> dict:
    loc = {
        "id":        location_id,
        "name":      name,
        "lat":       lat,
        "lon":       lon,
        "threshold": threshold,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _saved_locations[location_id] = loc
    logger.info("location_saved", id=location_id, name=name, threshold=threshold)
    return loc


def get_location(location_id: str) -> dict | None:
    return _saved_locations.get(location_id)


def list_locations() -> list[dict]:
    return list(_saved_locations.values())


def delete_location(location_id: str) -> bool:
    if location_id in _saved_locations:
        del _saved_locations[location_id]
        return True
    return False


# ── WebSocket connection manager ──────────────────────────────────────────────

class ConnectionManager:
    """Manages all active WebSocket connections."""

    def __init__(self) -> None:
        # socket_id → WebSocket
        self._connections: dict[str, WebSocket] = {}
        # socket_id → set of subscribed location_ids
        self._subscriptions: dict[str, set[str]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, socket_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections[socket_id] = ws
            self._subscriptions[socket_id] = set()
        logger.info("ws_connected", socket_id=socket_id, total=len(self._connections))

    async def disconnect(self, socket_id: str) -> None:
        async with self._lock:
            self._connections.pop(socket_id, None)
            self._subscriptions.pop(socket_id, None)
        logger.info("ws_disconnected", socket_id=socket_id)

    async def subscribe(self, socket_id: str, location_id: str) -> None:
        async with self._lock:
            if socket_id in self._subscriptions:
                self._subscriptions[socket_id].add(location_id)

    async def broadcast_to_subscribers(self, location_id: str, payload: dict) -> None:
        """Send payload to all sockets subscribed to this location."""
        message = json.dumps(payload)
        dead: list[str] = []

        for socket_id, subscriptions in self._subscriptions.items():
            if location_id in subscriptions or "ALL" in subscriptions:
                ws = self._connections.get(socket_id)
                if ws:
                    try:
                        await ws.send_text(message)
                    except Exception:
                        dead.append(socket_id)

        # Clean up dead connections
        for sid in dead:
            await self.disconnect(sid)

    async def broadcast_all(self, payload: dict) -> None:
        """Broadcast to every connected client."""
        message = json.dumps(payload)
        dead: list[str] = []
        for socket_id, ws in list(self._connections.items()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(socket_id)
        for sid in dead:
            await self.disconnect(sid)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


ws_manager = ConnectionManager()


# ── Alert event handler ───────────────────────────────────────────────────────

async def handle_noaa_alert(event: dict) -> None:
    """
    Registered as a callback with store.register_alert_callback().
    Broadcasts NOAA threshold events (Bz, speed, substorm) to all clients.
    """
    payload = {
        "type":      "SPACE_WEATHER_ALERT",
        "event":     event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary":   store.state.summary_dict(),
    }
    await ws_manager.broadcast_all(payload)
    logger.info("noaa_alert_broadcast", event_type=event.get("type"), clients=ws_manager.connection_count)


# Register with the poller store on module import
store.register_alert_callback(handle_noaa_alert)


# ── Visibility threshold checker ──────────────────────────────────────────────

async def check_location_thresholds() -> None:
    """
    Called periodically (every 5 min) to check all saved locations
    against their visibility score thresholds.
    """
    from app.services.visibility import compute_visibility_score

    for loc in list_locations():
        try:
            result = await compute_visibility_score(loc["lat"], loc["lon"])
            score  = result["composite_score"]
            threshold = loc["threshold"]

            if score >= threshold:
                payload = {
                    "type":        "VISIBILITY_THRESHOLD_MET",
                    "location_id": loc["id"],
                    "location_name": loc["name"],
                    "score":       score,
                    "threshold":   threshold,
                    "details":     result,
                    "timestamp":   datetime.now(timezone.utc).isoformat(),
                }
                await ws_manager.broadcast_to_subscribers(loc["id"], payload)
                logger.info(
                    "visibility_alert_fired",
                    location=loc["name"],
                    score=score,
                    threshold=threshold,
                )
        except Exception as exc:
            logger.warning("threshold_check_failed", location_id=loc["id"], error=str(exc))
