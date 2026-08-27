"""Grounded AI runner — assemble context, apply template/rubric, refuse if empty."""

from __future__ import annotations

from typing import Any

from app.ai.logging import log_ai_call
from app.ai.providers.base import AIMessage
from app.ai.providers.factory import resolve_provider
from app.ai.templates import get_prompt, get_rubric, rubric_to_text
from app.context.service import assemble_context


async def run_grounded_feature(
  *,
  feature: str,
  query: str,
  sources: list[str] | None = None,
) -> dict[str, Any]:
  prompt = get_prompt(feature)
  rubric = get_rubric(feature)
  allowed = list(sources or prompt.get("allowed_sources") or [])

  if not allowed:
    return {
      "ok": False,
      "refused": True,
      "reason": "This feature has no allowed sources configured.",
      "answer": None,
      "citations": [],
    }

  bundle = await assemble_context(query=query, sources=allowed)

  # Core contract: no source, no answer
  if bundle.is_empty:
    reason = (
      "Not found in connected sources. "
      f"Missing/unavailable: {', '.join(bundle.missing_sources) or 'no matching context'}."
    )
    log_ai_call(
      {
        "feature": feature,
        "refused": True,
        "reason": reason,
        "prompt_version": prompt.get("version"),
        "rubric_version": rubric.get("version"),
        "sources_requested": allowed,
        "sources_used": bundle.used_sources,
        "chunk_ids": [],
      }
    )
    return {
      "ok": False,
      "refused": True,
      "reason": reason,
      "answer": None,
      "citations": [],
      "context": bundle.model_dump(),
    }

  # If a required live source is fully missing, refuse rather than guessing
  hard_missing = [item for item in bundle.missing_sources if "(" not in item]
  if set(allowed).issubset(set(hard_missing)):
    reason = f"Required sources are not connected: {', '.join(hard_missing)}."
    return {
      "ok": False,
      "refused": True,
      "reason": reason,
      "answer": None,
      "citations": [],
      "context": bundle.model_dump(),
    }

  provider = resolve_provider()
  user_prompt = str(prompt.get("user_template") or "{context}").format(
    context=bundle.to_prompt_block(),
    rubric=rubric_to_text(rubric),
    query=query,
  )
  messages = [
    AIMessage(role="system", content=str(prompt.get("system") or "")),
    AIMessage(role="user", content=user_prompt),
  ]
  completion = await provider.complete(messages)

  citations = [
    {
      "index": index,
      "id": chunk.id,
      "source_type": chunk.source_type.value,
      "source_label": chunk.source_label,
      "title": chunk.title,
    }
    for index, chunk in enumerate(bundle.chunks, start=1)
  ]

  log = log_ai_call(
    {
      "feature": feature,
      "refused": False,
      "prompt_version": prompt.get("version"),
      "rubric_version": rubric.get("version"),
      "sources_requested": allowed,
      "sources_used": bundle.used_sources,
      "chunk_ids": [chunk.id for chunk in bundle.chunks],
      "provider": completion.provider,
      "model": completion.model,
      "output": completion.text,
    }
  )

  return {
    "ok": True,
    "refused": False,
    "reason": None,
    "answer": completion.text,
    "citations": citations,
    "context": bundle.model_dump(),
    "meta": {
      "prompt_version": prompt.get("version"),
      "rubric_version": rubric.get("version"),
      "provider": completion.provider,
      "model": completion.model,
      "log_id": log["id"],
    },
  }
