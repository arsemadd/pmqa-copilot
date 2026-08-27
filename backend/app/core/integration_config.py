"""Integration OAuth config — .env plus local app settings."""

from __future__ import annotations

from app.core.settings import get_settings
from app.core.storage import load_app_settings


def get_jira_oauth_config() -> dict[str, str]:
  settings = get_settings()
  app = load_app_settings()
  jira = app.get("jira_oauth") or {}

  client_id = str(jira.get("client_id") or settings.jira_client_id or "").strip()
  client_secret = str(jira.get("client_secret") or settings.jira_client_secret or "").strip()
  redirect_uri = str(
    jira.get("redirect_uri") or settings.jira_redirect_uri or "http://127.0.0.1:8000/api/integrations/jira/callback"
  ).strip()

  return {
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uri": redirect_uri,
    "configured": bool(client_id and client_secret),
    "source": "local" if jira.get("client_id") else ("env" if settings.jira_client_id else "none"),
  }


def save_jira_oauth_config(*, client_id: str, client_secret: str | None = None, redirect_uri: str | None = None) -> dict:
  from app.core.storage import save_app_settings

  current = load_app_settings()
  existing = dict(current.get("jira_oauth") or {})
  payload = {
    **existing,
    "client_id": client_id.strip(),
  }
  if client_secret and client_secret.strip():
    payload["client_secret"] = client_secret.strip()
  if redirect_uri and redirect_uri.strip():
    payload["redirect_uri"] = redirect_uri.strip()
  save_app_settings({"jira_oauth": payload})
  return get_jira_oauth_public()


def get_jira_oauth_public() -> dict:
  config = get_jira_oauth_config()
  return {
    "configured": config["configured"],
    "client_id": config["client_id"][:8] + "…" if len(config["client_id"]) > 8 else config["client_id"],
    "client_id_set": bool(config["client_id"]),
    "client_secret_set": bool(config["client_secret"]),
    "redirect_uri": config["redirect_uri"],
    "source": config["source"],
  }
