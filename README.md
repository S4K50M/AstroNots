# Aurora Intelligence Platform

> Hyper-local aurora forecasting for astrophotographers — Orion Astrathon 2026

## Quick Start (WSL2 / Linux / Mac)

### 1. Clone & enter the project
```bash
git clone https://github.com/YOUR_TEAM/aurora-platform.git
cd aurora-platform
```

### 2. Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
API live at → http://localhost:8000  
Swagger docs → http://localhost:8000/docs

### 3. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Website live at → http://localhost:5173

---

## Project Structure

```
aurora-platform/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI entrypoint + lifespan
│   │   ├── core/
│   │   │   ├── config.py             # All settings (env vars)
│   │   │   └── logging.py            # Structured JSON logging
│   │   ├── models/
│   │   │   └── noaa.py               # Pydantic models, dual-schema parser
│   │   ├── services/
│   │   │   ├── noaa_poller.py        # Async NOAA polling + failover
│   │   │   ├── visibility.py         # 0-100 score engine
│   │   │   ├── routing.py            # GPS dark-sky routing (stretch)
│   │   │   └── alerts.py             # WebSocket manager + thresholds
│   │   └── routers/
│   │       └── api.py                # All REST + WebSocket endpoints
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Sticky nav with live status
│   │   │   ├── AlertBanner.jsx       # Bz/speed/substorm banners
│   │   │   ├── AuroraMap.jsx         # Leaflet + OVATION overlay
│   │   │   ├── SolarCharts.jsx       # Bz + speed sparklines
│   │   │   ├── MetricsPanel.jsx      # Live metrics + Kp gauge
│   │   │   ├── VisibilityPanel.jsx   # Score ring + photo advisor
│   │   │   └── RoutingPanel.jsx      # Dark sky GPS routing
│   │   ├── hooks/
│   │   │   ├── useSpaceWeather.js    # Polling hook (all endpoints)
│   │   │   └── useWebSocket.js       # Real-time WS connection
│   │   ├── pages/
│   │   │   └── Dashboard.jsx         # Main page — wires everything
│   │   └── services/
│   │       └── api.js                # Axios API layer
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
├── .gitattributes
└── README.md
```

---

## Team Branches

```bash
# Always start from dev
git checkout dev && git pull origin dev

# Your feature branch
git checkout -b feat/your-name/feature-name

# Save work
git add . && git commit -m "feat: describe what you built"
git push origin feat/your-name/feature-name

# Open PR → dev on GitHub
```

### Who owns what
| Person | Module |
|---|---|
| Person 1 | Backend — poller, visibility score, routing |
| Person 2 | Backend — alerts, WebSocket, API endpoints |
| Person 3 | Frontend — map, charts, dashboard layout |
| Person 4 | Frontend — visibility panel, routing panel, mobile |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/space-weather/status` | Summary: Bz, speed, Kp, alert flags |
| GET | `/api/space-weather/mag` | IMF/Bz — 24h readings |
| GET | `/api/space-weather/plasma` | Solar wind speed/density |
| GET | `/api/space-weather/ovation` | 360×181 aurora probability grid |
| GET | `/api/space-weather/kp` | Kp index |
| GET | `/api/space-weather/noaa-alerts` | Active NOAA alerts |
| GET | `/api/visibility?lat=&lon=` | Composite visibility score |
| GET | `/api/routing?lat=&lon=` | GPS route to nearest dark sky site |
| POST | `/api/locations` | Save a location with alert threshold |
| GET | `/api/locations` | List saved locations |
| DELETE | `/api/locations/{id}` | Delete saved location |
| WS | `/ws/{client_id}` | Real-time alert stream |

---

## Scoring Alignment

| Dimension | What we built |
|---|---|
| Technical Depth (20pts) | Live NOAA pipeline, dual-schema parser, DSCOVR→ACE failover, Bz/speed/substorm thresholds |
| Visualization (20pts) | Leaflet + OVATION canvas overlay, day/night terminator, live recharts sparklines |
| Visibility Score (20pts) | 0-100 composite: OVATION interpolation + Open-Meteo cloud + ephem darkness |
| UX & Field Use (20pts) | Dark mode throughout, mobile responsive, WebSocket live alerts, sub-3s load |
| Innovation (20pts) | GPS routing stretch goal, substorm early warning, photography settings advisor |
