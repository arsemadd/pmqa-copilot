"""GitHub integration stub — connect/disconnect surface ready, OAuth next."""

from __future__ import annotations

from typing import Any

from app.core.storage import delete_connection, load_connection, save_connection
from app.integrations.base import (
  AuthMethod,
  AuthStartResponse,
  Capability,
  ConnectionStatus,
  Integration,
  IntegrationInfo,
  TestConnectionResult,
)


class GitHubIntegration(Integration):
  id = "github"
  name = "GitHub"
  description = "Connect GitHub repositories for PRs, commits, and changed files."

  def get_capabilities(self) -> list[Capability]:
    return [
      Capability.GET_PULL_REQUESTS,
      Capability.GET_COMMITS,
      Capability.GET_FILES_CHANGED,
      Capability.GET_REPOSITORIES,
    ]

  def get_info(self) -> IntegrationInfo:
    data = load_connection(self.id)
    if not data:
      return IntegrationInfo(
        id=self.id,
        name=self.name,
        description=self.description,
        status=ConnectionStatus.NOT_CONNECTED,
        auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
        capabilities=self.get_capabilities(),
        oauth_configured=False,
        details={"coming_soon": True},
      )

    return IntegrationInfo(
      id=self.id,
      name=self.name,
      description=self.description,
      status=ConnectionStatus.CONNECTED,
      auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
      capabilities=self.get_capabilities(),
      account_label=data.get("account_login"),
      workspace_label="GitHub",
      details={
        "auth_method": data.get("auth_method"),
        "selected_repos": data.get("selected_repos", []),
      },
      oauth_configured=False,
    )

  async def start_oauth(self) -> AuthStartResponse:
    raise NotImplementedError(
      "GitHub OAuth will be implemented next. Use Personal Access Token for now, or wait for the GitHub milestone."
    )

  async def handle_oauth_callback(self, code: str, state: str) -> IntegrationInfo:
    raise NotImplementedError("GitHub OAuth callback is not implemented yet.")

  async def connect_with_pat(self, token: str, **kwargs: Any) -> IntegrationInfo:
    if not token:
      raise ValueError("GitHub PAT is required.")

    import httpx

    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        "https://api.github.com/user",
        headers={
          "Authorization": f"Bearer {token}",
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      )
      if response.status_code >= 400:
        raise ValueError(f"GitHub PAT authentication failed ({response.status_code})")
      user = response.json()

    selected_repos = kwargs.get("selected_repos") or []
    payload = {
      "auth_method": AuthMethod.PERSONAL_ACCESS_TOKEN.value,
      "pat_token": token,
      "account_login": user.get("login"),
      "account_label": user.get("login"),
      "account_name": user.get("name"),
      "selected_repos": selected_repos,
    }
    save_connection(self.id, payload)
    return self.get_info()

  async def disconnect(self) -> None:
    delete_connection(self.id)

  async def authenticate(self) -> bool:
    data = load_connection(self.id)
    return bool(data and data.get("pat_token"))

  async def test_connection(self) -> TestConnectionResult:
    data = load_connection(self.id)
    if not data:
      return TestConnectionResult(ok=False, message="GitHub is not connected.")

    import httpx

    try:
      async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
          "https://api.github.com/user",
          headers={
            "Authorization": f"Bearer {data['pat_token']}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        )
        response.raise_for_status()
        user = response.json()
      return TestConnectionResult(
        ok=True,
        message="GitHub connection is healthy.",
        details={"login": user.get("login")},
      )
    except Exception as exc:
      return TestConnectionResult(ok=False, message=str(exc))
