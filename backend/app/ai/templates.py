"""Editable prompt templates and rubrics stored as local files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.settings import LOCAL_DIR, ensure_local_dirs

AI_DIR = LOCAL_DIR / "ai"
PROMPTS_DIR = AI_DIR / "prompts"
RUBRICS_DIR = AI_DIR / "rubrics"

DEFAULT_PROMPTS: dict[str, dict[str, Any]] = {
  "standup": {
    "version": 1,
    "feature": "standup",
    "allowed_sources": ["jira", "github"],
    "system": (
      "You are a PM standup assistant. Answer ONLY from the provided context chunks. "
      "If context is missing for yesterday/today/blocked/risks, say so explicitly. "
      "Do not invent tickets, PRs, or blockers from general knowledge."
    ),
    "user_template": (
      "Generate a standup using ONLY this context.\n\n"
      "CONTEXT:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown with sections: Yesterday, Today, Blocked, Risks."
    ),
  },
  "ask_product": {
    "version": 1,
    "feature": "ask_product",
    "allowed_sources": ["jira", "github", "knowledge"],
    "system": (
      "You answer product questions using ONLY the provided context. "
      "If the answer is not in the context, say: "
      "\"Not found in connected sources.\" Cite chunk numbers you used."
    ),
    "user_template": (
      "Question: {query}\n\nCONTEXT:\n{context}\n\nRUBRIC:\n{rubric}\n\n"
      "Answer with citations like [1], [2]."
    ),
  },
}

DEFAULT_RUBRICS: dict[str, dict[str, Any]] = {
  "standup": {
    "version": 1,
    "feature": "standup",
    "criteria": [
      "Yesterday covers completed work with concrete ticket/PR references when present",
      "Today is actionable and grounded in open issues or active PRs",
      "Blocked only lists items present in context",
      "Risks call out release/timeline threats only if evidence exists",
      "Never invent work that is not in context",
    ],
  },
  "ask_product": {
    "version": 1,
    "feature": "ask_product",
    "criteria": [
      "Answer only from retrieved chunks",
      "Cite sources",
      "Refuse clearly when evidence is missing",
      "Do not generalize from industry norms",
    ],
  },
}


def ensure_ai_files() -> None:
  ensure_local_dirs()
  PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
  RUBRICS_DIR.mkdir(parents=True, exist_ok=True)
  for feature, payload in DEFAULT_PROMPTS.items():
    path = PROMPTS_DIR / f"{feature}.json"
    if not path.exists():
      path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
  for feature, payload in DEFAULT_RUBRICS.items():
    path = RUBRICS_DIR / f"{feature}.json"
    if not path.exists():
      path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def list_prompts() -> list[dict[str, Any]]:
  ensure_ai_files()
  return [_read(path) for path in sorted(PROMPTS_DIR.glob("*.json"))]


def list_rubrics() -> list[dict[str, Any]]:
  ensure_ai_files()
  return [_read(path) for path in sorted(RUBRICS_DIR.glob("*.json"))]


def get_prompt(feature: str) -> dict[str, Any]:
  ensure_ai_files()
  path = PROMPTS_DIR / f"{feature}.json"
  if not path.exists():
    raise KeyError(f"Unknown prompt feature: {feature}")
  return _read(path)


def get_rubric(feature: str) -> dict[str, Any]:
  ensure_ai_files()
  path = RUBRICS_DIR / f"{feature}.json"
  if not path.exists():
    raise KeyError(f"Unknown rubric feature: {feature}")
  return _read(path)


def save_prompt(feature: str, payload: dict[str, Any]) -> dict[str, Any]:
  ensure_ai_files()
  current = get_prompt(feature)
  merged = {**current, **payload, "feature": feature}
  merged["version"] = int(current.get("version") or 1) + 1
  path = PROMPTS_DIR / f"{feature}.json"
  path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
  return merged


def save_rubric(feature: str, payload: dict[str, Any]) -> dict[str, Any]:
  ensure_ai_files()
  current = get_rubric(feature)
  merged = {**current, **payload, "feature": feature}
  merged["version"] = int(current.get("version") or 1) + 1
  path = RUBRICS_DIR / f"{feature}.json"
  path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
  return merged


def rubric_to_text(rubric: dict[str, Any]) -> str:
  criteria = rubric.get("criteria") or []
  return "\n".join(f"- {item}" for item in criteria)


def _read(path: Path) -> dict[str, Any]:
  return json.loads(path.read_text(encoding="utf-8"))
