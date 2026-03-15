"""app/main.py"""
from contextlib import asynccontextmanager
from apscheduler.triggers.interval import IntervalTrigger

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging, logger
from app.routers.api import router
from app.services.noaa_poller import poller
from app.services.alerts import check_location_thresholds

from fastapi import Request
import time


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging(debug=settings.DEBUG)
    logger.info("validating_configuration")
    
    # Validate critical configuration
    assert settings.BZ_ALERT_THRESHOLD < 0, "BZ_ALERT_THRESHOLD must be negative"
    assert settings.SOLAR_WIND_SPEED_THRESHOLD > 0, "SOLAR_WIND_SPEED_THRESHOLD must be positive"
    assert settings.MAG_POLL_INTERVAL >= 30, "MAG_POLL_INTERVAL should be >= 30 seconds"
    
    logger.info("startup", app=settings.APP_NAME, version=settings.APP_VERSION)

    # Start NOAA poller
    await poller.start()

    # Add location threshold checker job (every 5 min)
    poller._scheduler.add_job(
        check_location_thresholds,
        trigger=IntervalTrigger(seconds=300),
        id="threshold_checker",
        replace_existing=True,
        max_instances=1,
    )

    yield

    await poller.stop()
    logger.info("shutdown_complete")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests with timing"""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    logger.info(
        "api_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2)
    )
    
    return response

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
