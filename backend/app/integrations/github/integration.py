"""GitHub integration — PAT with repo selection; OAuth later."""

from __future__ import annotations

from typing import Any

import httpx

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

API = "https://api.github.com"
HEADERS_BASE = {
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
}


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
    if not data or not data.get("pat_token"):
      return IntegrationInfo(
        id=self.id,
        name=self.name,
        description=self.description,
        status=ConnectionStatus.NOT_CONNECTED,
        auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
        capabilities=self.get_capabilities(),
        oauth_configured=False,
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
      "GitHub OAuth comes next. Use Personal Access Token and select repositories."
    )

  async def handle_oauth_callback(self, code: str, state: str) -> IntegrationInfo:
    raise NotImplementedError("GitHub OAuth callback is not implemented yet.")

  async def connect_with_pat(self, token: str, **kwargs: Any) -> IntegrationInfo:
    if not token:
      raise ValueError("GitHub PAT is required.")

    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"{API}/user",
        headers={**HEADERS_BASE, "Authorization": f"Bearer {token}"},
      )
      if response.status_code >= 400:
        raise ValueError(f"GitHub PAT authentication failed ({response.status_code})")
      user = response.json()

    existing = load_connection(self.id) or {}
    selected_repos = kwargs.get("selected_repos")
    if selected_repos is None:
      selected_repos = existing.get("selected_repos") or []

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

    try:
      async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
          f"{API}/user",
          headers={**HEADERS_BASE, "Authorization": f"Bearer {data['pat_token']}"},
        )
        response.raise_for_status()
        user = response.json()
      return TestConnectionResult(
        ok=True,
        message="GitHub connection is healthy.",
        details={
          "login": user.get("login"),
          "selected_repos": data.get("selected_repos", []),
        },
      )
    except Exception as exc:
      return TestConnectionResult(ok=False, message=str(exc))

  def _headers(self) -> dict[str, str]:
    data = load_connection(self.id)
    if not data or not data.get("pat_token"):
      raise ValueError("GitHub is not connected.")
    return {**HEADERS_BASE, "Authorization": f"Bearer {data['pat_token']}"}

  def selected_repos(self) -> list[str]:
    data = load_connection(self.id) or {}
    return list(data.get("selected_repos") or [])

  async def update_selected_repos(self, repos: list[str]) -> IntegrationInfo:
    data = load_connection(self.id)
    if not data or not data.get("pat_token"):
      raise ValueError("GitHub is not connected.")
    data["selected_repos"] = repos
    save_connection(self.id, data)
    return self.get_info()

  async def get_repositories(self, *, max_results: int = 100) -> list[dict[str, Any]]:
    if not await self.authenticate():
      raise ValueError("GitHub is not connected.")

    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"{API}/user/repos",
        headers=self._headers(),
        params={
          "per_page": min(max_results, 100),
          "sort": "updated",
          "affiliation": "owner,collaborator,organization_member",
        },
      )
      response.raise_for_status()
      repos = response.json()

    selected = set(self.selected_repos())
    return [
      {
        "full_name": repo.get("full_name"),
        "name": repo.get("name"),
        "private": repo.get("private"),
        "html_url": repo.get("html_url"),
        "updated_at": repo.get("updated_at"),
        "default_branch": repo.get("default_branch"),
        "selected": repo.get("full_name") in selected,
      }
      for repo in repos
    ]

  async def get_pull_requests(
    self,
    *,
    state: str = "all",
    max_results: int = 30,
  ) -> list[dict[str, Any]]:
    repos = self.selected_repos()
    if not repos:
      raise ValueError("No GitHub repositories selected. Choose repos in Integrations.")

    results: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
      for repo in repos:
        response = await client.get(
          f"{API}/repos/{repo}/pulls",
          headers=self._headers(),
          params={"state": state, "per_page": min(max_results, 30), "sort": "updated"},
        )
        response.raise_for_status()
        for pr in response.json():
          results.append(
            {
              "repo": repo,
              "number": pr.get("number"),
              "title": pr.get("title"),
              "state": pr.get("state"),
              "user": (pr.get("user") or {}).get("login"),
              "merged_at": pr.get("merged_at"),
              "updated_at": pr.get("updated_at"),
              "html_url": pr.get("html_url"),
              "draft": pr.get("draft"),
            }
          )
    results.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    return results[:max_results]

  async def get_commits(self, *, max_results: int = 30) -> list[dict[str, Any]]:
    repos = self.selected_repos()
    if not repos:
      raise ValueError("No GitHub repositories selected. Choose repos in Integrations.")

    results: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
      for repo in repos:
        response = await client.get(
          f"{API}/repos/{repo}/commits",
          headers=self._headers(),
          params={"per_page": min(max_results, 30)},
        )
        response.raise_for_status()
        for commit in response.json():
          commit_data = commit.get("commit") or {}
          author = commit_data.get("author") or {}
          results.append(
            {
              "repo": repo,
              "sha": (commit.get("sha") or "")[:7],
              "message": (commit_data.get("message") or "").split("\n")[0],
              "author": author.get("name"),
              "date": author.get("date"),
              "html_url": commit.get("html_url"),
            }
          )
    results.sort(key=lambda item: item.get("date") or "", reverse=True)
    return results[:max_results]

  async def get_files_changed(self, *, pr_number: int, repo: str | None = None) -> list[dict[str, Any]]:
    target_repo = repo or (self.selected_repos()[0] if self.selected_repos() else None)
    if not target_repo:
      raise ValueError("Provide a repo or select repositories first.")

    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"{API}/repos/{target_repo}/pulls/{pr_number}/files",
        headers=self._headers(),
        params={"per_page": 100},
      )
      response.raise_for_status()
      files = response.json()

    return [
      {
        "repo": target_repo,
        "filename": item.get("filename"),
        "status": item.get("status"),
        "additions": item.get("additions"),
        "deletions": item.get("deletions"),
        "changes": item.get("changes"),
      }
      for item in files
    ]
