"""Jira / Atlassian OAuth 3LO + optional PAT adapter."""

from __future__ import annotations

import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.settings import get_settings
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

ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize"
ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
ATLASSIAN_ME_URL = "https://api.atlassian.com/me"

JIRA_SCOPES = [
  "read:jira-work",
  "read:jira-user",
  "read:sprint:jira-software",
  "read:board-scope:jira-software",
  "offline_access",
]


class JiraIntegration(Integration):
  id = "jira"
  name = "Jira"
  description = "Connect Atlassian Jira to pull issues, projects, and sprints."

  def get_capabilities(self) -> list[Capability]:
    return [
      Capability.GET_ISSUES,
      Capability.GET_PROJECTS,
      Capability.GET_SPRINTS,
    ]

  def _oauth_configured(self) -> bool:
    settings = get_settings()
    return bool(settings.jira_client_id and settings.jira_client_secret)

  def _is_connected(self, data: dict | None) -> bool:
    if not data:
      return False
    if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
      return bool(data.get("pat_token") and data.get("account_email") and data.get("site_url"))
    if data.get("auth_method") == AuthMethod.OAUTH.value:
      return bool(data.get("access_token") and data.get("cloud_id"))
    return False

  def get_info(self) -> IntegrationInfo:
    data = load_connection(self.id)
    oauth_configured = self._oauth_configured()

    if not self._is_connected(data):
      return IntegrationInfo(
        id=self.id,
        name=self.name,
        description=self.description,
        status=ConnectionStatus.NOT_CONNECTED,
        auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
        capabilities=self.get_capabilities(),
        oauth_configured=oauth_configured,
      )

    assert data is not None
    return IntegrationInfo(
      id=self.id,
      name=self.name,
      description=self.description,
      status=ConnectionStatus.CONNECTED,
      auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
      capabilities=self.get_capabilities(),
      account_label=data.get("account_email") or data.get("account_label"),
      workspace_label=data.get("site_url") or data.get("workspace_label"),
      details={
        "auth_method": data.get("auth_method"),
        "cloud_id": data.get("cloud_id"),
        "site_name": data.get("site_name"),
        "account_name": data.get("account_name"),
      },
      oauth_configured=oauth_configured,
    )

  async def start_oauth(self) -> AuthStartResponse:
    settings = get_settings()
    if not self._oauth_configured():
      raise ValueError(
        "Jira OAuth is not configured. Set JIRA_CLIENT_ID and JIRA_CLIENT_SECRET in .env"
      )

    state = secrets.token_urlsafe(24)
    pending = load_connection(self.id) or {}
    pending["oauth_state"] = state
    pending["oauth_started_at"] = time.time()
    # Keep existing tokens if reconnecting; state is ephemeral until callback
    save_connection(self.id, pending)

    params = {
      "audience": "api.atlassian.com",
      "client_id": settings.jira_client_id,
      "scope": " ".join(JIRA_SCOPES),
      "redirect_uri": settings.jira_redirect_uri,
      "state": state,
      "response_type": "code",
      "prompt": "consent",
    }
    url = f"{ATLASSIAN_AUTHORIZE_URL}?{urlencode(params)}"
    return AuthStartResponse(
      authorization_url=url,
      state=state,
      auth_method=AuthMethod.OAUTH,
    )

  async def handle_oauth_callback(self, code: str, state: str) -> IntegrationInfo:
    settings = get_settings()
    pending = load_connection(self.id) or {}
    expected = pending.get("oauth_state")
    if not expected or expected != state:
      raise ValueError("Invalid OAuth state. Restart the Jira connection flow.")

    async with httpx.AsyncClient(timeout=30.0) as client:
      token_response = await client.post(
        ATLASSIAN_TOKEN_URL,
        json={
          "grant_type": "authorization_code",
          "client_id": settings.jira_client_id,
          "client_secret": settings.jira_client_secret,
          "code": code,
          "redirect_uri": settings.jira_redirect_uri,
        },
      )
      token_response.raise_for_status()
      tokens = token_response.json()

      access_token = tokens["access_token"]
      headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

      resources_response = await client.get(ATLASSIAN_RESOURCES_URL, headers=headers)
      resources_response.raise_for_status()
      resources = resources_response.json()

      if not resources:
        raise ValueError("No accessible Atlassian sites found for this account.")

      site = resources[0]
      me_response = await client.get(ATLASSIAN_ME_URL, headers=headers)
      me = me_response.json() if me_response.status_code == 200 else {}

    payload = {
      "auth_method": AuthMethod.OAUTH.value,
      "access_token": access_token,
      "refresh_token": tokens.get("refresh_token"),
      "expires_at": time.time() + int(tokens.get("expires_in", 3600)) - 60,
      "token_type": tokens.get("token_type", "Bearer"),
      "scope": tokens.get("scope"),
      "cloud_id": site.get("id"),
      "site_url": site.get("url"),
      "site_name": site.get("name"),
      "account_email": me.get("email"),
      "account_name": me.get("name"),
      "account_label": me.get("email") or me.get("name"),
      "workspace_label": site.get("url"),
      "accessible_resources": [
        {"id": r.get("id"), "name": r.get("name"), "url": r.get("url")} for r in resources
      ],
    }
    save_connection(self.id, payload)
    return self.get_info()

  async def connect_with_pat(self, token: str, **kwargs: Any) -> IntegrationInfo:
    email = kwargs.get("email") or kwargs.get("account_email")
    base_url = (kwargs.get("base_url") or kwargs.get("site_url") or "").rstrip("/")
    if not token or not email or not base_url:
      raise ValueError("PAT connection requires token, email, and base_url (e.g. https://company.atlassian.net)")

    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"{base_url}/rest/api/3/myself",
        auth=(email, token),
        headers={"Accept": "application/json"},
      )
      if response.status_code >= 400:
        raise ValueError(f"Jira PAT authentication failed ({response.status_code})")
      me = response.json()

    payload = {
      "auth_method": AuthMethod.PERSONAL_ACCESS_TOKEN.value,
      "pat_token": token,
      "account_email": email,
      "account_name": me.get("displayName"),
      "account_label": email,
      "site_url": base_url,
      "workspace_label": base_url,
      "site_name": base_url.replace("https://", "").replace("http://", ""),
    }
    save_connection(self.id, payload)
    return self.get_info()

  async def disconnect(self) -> None:
    delete_connection(self.id)

  async def authenticate(self) -> bool:
    data = load_connection(self.id)
    if not data:
      return False
    if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
      return bool(data.get("pat_token") and data.get("account_email") and data.get("site_url"))
    if data.get("auth_method") == AuthMethod.OAUTH.value:
      if data.get("refresh_token") or data.get("access_token"):
        await self._ensure_fresh_oauth_token(data)
        return True
    return False

  async def test_connection(self) -> TestConnectionResult:
    data = load_connection(self.id)
    if not data:
      return TestConnectionResult(ok=False, message="Jira is not connected.")

    try:
      if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
        async with httpx.AsyncClient(timeout=30.0) as client:
          response = await client.get(
            f"{data['site_url']}/rest/api/3/myself",
            auth=(data["account_email"], data["pat_token"]),
            headers={"Accept": "application/json"},
          )
          response.raise_for_status()
          me = response.json()
        return TestConnectionResult(
          ok=True,
          message="Jira PAT connection is healthy.",
          details={"account": me.get("displayName"), "email": data.get("account_email")},
        )

      data = await self._ensure_fresh_oauth_token(data)
      cloud_id = data["cloud_id"]
      headers = {
        "Authorization": f"Bearer {data['access_token']}",
        "Accept": "application/json",
      }
      async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
          f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/myself",
          headers=headers,
        )
        response.raise_for_status()
        me = response.json()
      return TestConnectionResult(
        ok=True,
        message="Jira OAuth connection is healthy.",
        details={
          "account": me.get("displayName"),
          "email": data.get("account_email"),
          "site": data.get("site_url"),
        },
      )
    except Exception as exc:
      return TestConnectionResult(ok=False, message=str(exc))

  async def _ensure_fresh_oauth_token(self, data: dict[str, Any]) -> dict[str, Any]:
    expires_at = float(data.get("expires_at") or 0)
    if time.time() < expires_at and data.get("access_token"):
      return data

    refresh_token = data.get("refresh_token")
    if not refresh_token:
      raise ValueError("Jira access token expired and no refresh token is available. Reconnect.")

    settings = get_settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.post(
        ATLASSIAN_TOKEN_URL,
        json={
          "grant_type": "refresh_token",
          "client_id": settings.jira_client_id,
          "client_secret": settings.jira_client_secret,
          "refresh_token": refresh_token,
        },
      )
      response.raise_for_status()
      tokens = response.json()

    data["access_token"] = tokens["access_token"]
    if tokens.get("refresh_token"):
      data["refresh_token"] = tokens["refresh_token"]
    data["expires_at"] = time.time() + int(tokens.get("expires_in", 3600)) - 60
    save_connection(self.id, data)
    return data

  async def get_projects(self) -> list[dict[str, Any]]:
    """Standard integration surface used by features later."""
    if not await self.authenticate():
      raise ValueError("Jira is not connected.")

    data = load_connection(self.id)
    assert data is not None

    if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
      async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
          f"{data['site_url']}/rest/api/3/project/search",
          auth=(data["account_email"], data["pat_token"]),
          headers={"Accept": "application/json"},
          params={"maxResults": 50},
        )
        response.raise_for_status()
        body = response.json()
      return body.get("values", [])

    data = await self._ensure_fresh_oauth_token(data)
    headers = {
      "Authorization": f"Bearer {data['access_token']}",
      "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"https://api.atlassian.com/ex/jira/{data['cloud_id']}/rest/api/3/project/search",
        headers=headers,
        params={"maxResults": 50},
      )
      response.raise_for_status()
      body = response.json()
    return body.get("values", [])
