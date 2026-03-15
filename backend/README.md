# Aurora Intelligence Platform - Backend Services

This repository contains the backend services for the Aurora Intelligence Platform. It is built using FastAPI and Python, and provides real-time space weather data polling and aggregation from NOAA SWPC.

## Features

- Real-time polling of NOAA SWPC endpoints (Magnetic Field, Plasma, OVATION grid, Kp index, Alerts).
- Composite visibility score calculation combining Aurora probability, light pollution (Bortle scale), and cloud cover.
- GPS Routing service to find the optimal dark sky location for Aurora viewing based on custom thresholds.
- WebSocket streaming for real-time space weather alerts and threshold notifications.
- In-memory data store for high-performance retrieval and DSCOVR to ACE satellite failover capabilities.

## Setup Instructions

Ensure you have Python 3.10+ installed.

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### macOS / Linux (Bash)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once the server is running, the interactive Swagger documentation is available at:
`http://localhost:8000/docs`

### Major Space Weather Endpoints

- `GET /api/space-weather/status` - Aggregated status containing Bz, solar wind speed, Kp, and alert flags.
- `GET /api/space-weather/mag` - IMF / Bz readings.
- `GET /api/space-weather/plasma` - Solar wind plasma measurements (speed, density, temperature).
- `GET /api/space-weather/ovation` - OVATION 360x181 auroral probability grid.
- `GET /api/space-weather/kp` - Planetary K-index readings.
- `GET /api/space-weather/noaa-alerts` - Active NOAA space weather alerts.

### Visibility & Routing Endpoints

- `GET /api/forecast` - 3-day Kp forecast.
- `GET /api/visibility` - Compute composite visibility score for a given latitude/longitude.
- `POST /api/visibility/batch` - Compute visibility scores for multiple locations concurrently.
- `GET /api/routing` - Find a GPS route to the nearest dark-sky aurora viewing site based on given criteria and thresholds.

### Location Management

- `POST /api/locations` - Save a location with a visibility threshold for alerts.
- `GET /api/locations` - List all saved locations.
- `DELETE /api/locations/{location_id}` - Delete a saved location.

### System Endpoints

- `GET /health` or `GET /api/health` - Comprehensive system health checks including data freshness.
- `GET /api/stats` - Statistical analysis of recent space weather data (e.g., averages, standard deviations).
- `GET /api/metrics` - Application operational metrics (cache size, active websockets).

### WebSockets

- `WS /ws/{client_id}` - Real-time event stream. Subscribe to specific locations to receive space weather alerts and visibility threshold notifications.
