from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.core.settings import get_settings
from app.integrations.base import AuthMethod, IntegrationInfo, TestConnectionResult
from app.integrations.registry import GIT_HOSTING_IDS, registry

router = APIRouter(prefix="/integrations", tags=["integrations"])


def _require_git_hosting(integration_id: str):
  if integration_id not in GIT_HOSTING_IDS:
    raise HTTPException(
      status_code=501,
      detail="Repositories endpoint is only available for GitHub and GitLab.",
    )
  return registry.get(integration_id)


class PatConnectRequest(BaseModel):
  token: str = Field(min_length=1)
  email: str | None = None
  base_url: str | None = None
  selected_repos: list[str] = Field(default_factory=list)


class SelectedReposRequest(BaseModel):
  selected_repos: list[str]


@router.get("", response_model=list[IntegrationInfo])
async def list_integrations() -> list[IntegrationInfo]:
  return registry.list_info()


@router.get("/auth-methods")
async def auth_methods() -> dict[str, list[str]]:
  return {
    "methods": [AuthMethod.OAUTH.value, AuthMethod.PERSONAL_ACCESS_TOKEN.value],
  }


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
    raise HTTPException(status_code=501, detail="Projects endpoint is only available for Jira.")
  try:
    projects = await registry.get("jira").get_projects()  # type: ignore[attr-defined]
    return {"projects": projects}
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{integration_id}/issues")
async def get_issues(integration_id: str, jql: str | None = None, max_results: int = 50) -> dict:
  if integration_id == "jira":
    try:
      issues = await registry.get("jira").get_issues(jql=jql, max_results=max_results)  # type: ignore[attr-defined]
      return {"issues": issues}
    except KeyError as exc:
      raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
      raise HTTPException(status_code=400, detail=str(exc)) from exc

  if integration_id == "gitlab":
    try:
      issues = await registry.get("gitlab").get_issues(max_results=max_results)  # type: ignore[attr-defined]
      return {"issues": issues}
    except KeyError as exc:
      raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
      raise HTTPException(status_code=400, detail=str(exc)) from exc

  raise HTTPException(status_code=501, detail="Issues endpoint is only available for Jira and GitLab.")


@router.get("/{integration_id}/sprints")
async def get_sprints(integration_id: str) -> dict:
  if integration_id != "jira":
    raise HTTPException(status_code=501, detail="Sprints endpoint is only available for Jira.")
  try:
    sprints = await registry.get("jira").get_sprints()  # type: ignore[attr-defined]
    return {"sprints": sprints}
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{integration_id}/repositories")
async def get_repositories(integration_id: str) -> dict:
  try:
    integration = _require_git_hosting(integration_id)
    repos = await integration.get_repositories()  # type: ignore[attr-defined]
    return {"repositories": repos}
  except HTTPException:
    raise
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{integration_id}/repositories", response_model=IntegrationInfo)
async def update_repositories(integration_id: str, body: SelectedReposRequest) -> IntegrationInfo:
  try:
    integration = _require_git_hosting(integration_id)
    return await integration.update_selected_repos(body.selected_repos)  # type: ignore[attr-defined]
  except HTTPException:
    raise
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{integration_id}/pull-requests")
async def get_pull_requests(integration_id: str, state: str = "all", max_results: int = 30) -> dict:
  try:
    integration = _require_git_hosting(integration_id)
    prs = await integration.get_pull_requests(state=state, max_results=max_results)  # type: ignore[attr-defined]
    return {"pull_requests": prs}
  except HTTPException:
    raise
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{integration_id}/commits")
async def get_commits(integration_id: str, max_results: int = 30) -> dict:
  try:
    integration = _require_git_hosting(integration_id)
    commits = await integration.get_commits(max_results=max_results)  # type: ignore[attr-defined]
    return {"commits": commits}
  except HTTPException:
    raise
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
