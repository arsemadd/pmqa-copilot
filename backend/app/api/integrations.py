from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.core.settings import get_settings
from app.integrations.base import AuthMethod, IntegrationInfo, TestConnectionResult
from app.integrations.registry import registry

router = APIRouter(prefix="/integrations", tags=["integrations"])


class PatConnectRequest(BaseModel):
  token: str = Field(min_length=1)
  email: str | None = None
  base_url: str | None = None
  selected_repos: list[str] = Field(default_factory=list)


@router.get("", response_model=list[IntegrationInfo])
async def list_integrations() -> list[IntegrationInfo]:
  return registry.list_info()


@router.get("/jira/callback")
async def jira_oauth_callback(code: str | None = None, state: str | None = None, error: str | None = None):
  settings = get_settings()
  frontend = settings.pmqa_frontend_url.rstrip("/")

  if error:
    return RedirectResponse(f"{frontend}/integrations?jira=error&message={quote(error)}")
  if not code or not state:
    return RedirectResponse(f"{frontend}/integrations?jira=error&message=missing_code")

  try:
    await registry.get("jira").handle_oauth_callback(code, state)
  except Exception as exc:
    return RedirectResponse(f"{frontend}/integrations?jira=error&message={quote(str(exc))}")

  return RedirectResponse(f"{frontend}/integrations?jira=connected")


@router.get("/{integration_id}", response_model=IntegrationInfo)
async def get_integration(integration_id: str) -> IntegrationInfo:
  try:
    return registry.get(integration_id).get_info()
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{integration_id}/oauth/start")
async def start_oauth(integration_id: str) -> dict:
  try:
    integration = registry.get(integration_id)
    result = await integration.start_oauth()
    return result.model_dump()
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except NotImplementedError as exc:
    raise HTTPException(status_code=501, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{integration_id}/pat", response_model=IntegrationInfo)
async def connect_with_pat(integration_id: str, body: PatConnectRequest) -> IntegrationInfo:
  try:
    integration = registry.get(integration_id)
    return await integration.connect_with_pat(
      body.token,
      email=body.email,
      base_url=body.base_url,
      selected_repos=body.selected_repos,
    )
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{integration_id}/test", response_model=TestConnectionResult)
async def test_integration(integration_id: str) -> TestConnectionResult:
  try:
    return await registry.get(integration_id).test_connection()
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{integration_id}/disconnect", response_model=IntegrationInfo)
async def disconnect_integration(integration_id: str) -> IntegrationInfo:
  try:
    integration = registry.get(integration_id)
    await integration.disconnect()
    return integration.get_info()
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{integration_id}/projects")
async def get_projects(integration_id: str) -> dict:
  if integration_id != "jira":
    raise HTTPException(status_code=501, detail="Projects endpoint is only available for Jira in v1.")
  try:
    jira = registry.get("jira")
    projects = await jira.get_projects()  # type: ignore[attr-defined]
    return {"projects": projects}
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/auth-methods")
async def auth_methods() -> dict[str, list[str]]:
  return {
    "methods": [AuthMethod.OAUTH.value, AuthMethod.PERSONAL_ACCESS_TOKEN.value],
  }
