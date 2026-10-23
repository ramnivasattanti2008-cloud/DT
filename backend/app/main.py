"""
FastAPI Application Entrypoint for SERC-RCS Research Lab
"""

from contextlib import asynccontextmanager
import time
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.models.dataset import DatasetModel
from app.models.experiment import ExperimentModel
from app.api.routes_datasets import create_synthetic_benchmark, router as datasets_router
from app.api.routes_experiments import router as experiments_router
from app.api.routes_classifiers import router as classifiers_router
from app.api.routes_leakage import router as leakage_router
from app.api.routes_serc import router as serc_router
from app.api.routes_reports import router as reports_router
from app.api.routes_settings import router as settings_router
from app.ml.pipeline import run_protocol_a, run_protocol_b
import pandas as pd


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database tables on application startup."""
    init_db()
    db = SessionLocal()
    try:
        ds = db.query(DatasetModel).filter(DatasetModel.id == "ds_synthetic_benchmark_6000").first()
        if not ds:
            # Generate and register the 6,000 synthetic benchmark dataset
            create_synthetic_benchmark(seed=42, db=db)
    except Exception as e:
        print(f"Startup warning during dataset initialization: {e}")
        db.rollback()
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Scientific audit and machine learning platform for email spam filtering through the SERC-RCS rubric.",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local research environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(datasets_router)
app.include_router(experiments_router)
app.include_router(classifiers_router)
app.include_router(leakage_router)
app.include_router(serc_router)
app.include_router(reports_router)
app.include_router(settings_router)


@app.get("/api/health")
def health_check():
    """Health and readiness endpoint."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": time.time(),
        "database": "sqlite_connected",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Structured JSON error responses."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "detail": str(exc),
            "path": str(request.url),
        },
    )
