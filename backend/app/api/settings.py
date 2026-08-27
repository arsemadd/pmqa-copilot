from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.integration_config import get_jira_oauth_public, save_jira_oauth_config
from app.core.storage import load_app_settings, save_app_settings

router = APIRouter(prefix="/settings", tags=["settings"])


class AppSettingsUpdate(BaseModel):
  display_name: str | None = None
  theme: str | None = None
  selected_repos: list[str] | None = None
  preferences: dict[str, Any] | None = None


class JiraOAuthUpdate(BaseModel):
  client_id: str = Field(min_length=1)
  client_secret: str | None = None
  redirect_uri: str | None = None


@router.get("")
async def get_settings() -> dict[str, Any]:
  return load_app_settings()


@router.put("")
async def update_settings(body: AppSettingsUpdate) -> dict[str, Any]:
  payload = body.model_dump(exclude_none=True)
  return save_app_settings(payload)


@router.get("/jira-oauth")
async def jira_oauth_settings() -> dict[str, Any]:
  return get_jira_oauth_public()


@router.put("/jira-oauth")
async def update_jira_oauth(body: JiraOAuthUpdate) -> dict[str, Any]:
  return save_jira_oauth_config(
    client_id=body.client_id,
    client_secret=body.client_secret,
    redirect_uri=body.redirect_uri,
  )


class HealthResponse(BaseModel):
  status: str = "ok"
  app: str = "PMQA Copilot"


health_router = APIRouter(tags=["health"])


@health_router.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
  return HealthResponse()
