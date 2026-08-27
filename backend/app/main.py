from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.settings import health_router
from app.core.settings import ensure_local_dirs, get_settings


def create_app() -> FastAPI:
  ensure_local_dirs()
  settings = get_settings()

  app = FastAPI(
    title="PMQA Copilot",
    description="Local PM + QA command center — integrations first, AI later.",
    version="0.1.0",
  )

  app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
  )

  app.include_router(health_router)
  app.include_router(api_router)
  return app


app = create_app()
