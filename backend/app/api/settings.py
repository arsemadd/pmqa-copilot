from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.storage import load_app_settings, save_app_settings

router = APIRouter(prefix="/settings", tags=["settings"])


class AppSettingsUpdate(BaseModel):
  display_name: str | None = None
  theme: str | None = None
  selected_repos: list[str] | None = None
  preferences: dict[str, Any] | None = None


@router.get("")
async def get_settings() -> dict[str, Any]:
  return load_app_settings()


@router.put("")
async def update_settings(body: AppSettingsUpdate) -> dict[str, Any]:
  payload = body.model_dump(exclude_none=True)
  return save_app_settings(payload)


class HealthResponse(BaseModel):
  status: str = "ok"
  app: str = "PMQA Copilot"


health_router = APIRouter(tags=["health"])


@health_router.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
  return HealthResponse()
