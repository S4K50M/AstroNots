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


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(debug=settings.DEBUG)
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


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
