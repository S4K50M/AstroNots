# Aurora Platform — Backend

FastAPI + Python. Polls NOAA SWPC in real time.

Setup 
(WSL / Mac / Linux)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
(Windows)
'''bash
cd backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
'''


API docs → http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/space-weather/status` | Bz, speed, Kp, alert flags |
| GET | `/api/space-weather/mag` | IMF/Bz last 24h |
| GET | `/api/space-weather/plasma` | Solar wind speed last 24h |
| GET | `/api/space-weather/ovation` | OVATION 360×181 grid |
| GET | `/api/space-weather/kp` | Kp index |
| GET | `/api/space-weather/alerts` | Active NOAA alerts |
