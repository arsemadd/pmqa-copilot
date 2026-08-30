# PMQA Copilot

Local AI-powered PM + QA command center. **This milestone** ships the app shell, local settings storage, an integration abstraction, and **Jira OAuth** (plus PAT fallback). AI features are intentionally not implemented yet.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Python + FastAPI |
| Storage | Encrypted local files under `local/` (no database) |
| Integrations | Pluggable adapters (`Jira` first, `GitHub` stub + PAT) |

## Project layout

```
pm-qa-copilot/
├── frontend/          # React app (sidebar + pages)
├── backend/           # FastAPI + integration layer
├── local/             # connections, cache, settings (gitignored secrets)
├── .env.example
└── README.md
```

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

Fill in Atlassian OAuth credentials for Jira (see below).

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://127.0.0.1:5173

## Jira OAuth setup (Atlassian 3LO)

1. Create an app at [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/).
2. Add an **OAuth 2.0 (3LO)** authorization grant.
3. Set callback URL to:

   `http://127.0.0.1:8000/api/integrations/jira/callback`

4. Add scopes in **Permissions** (must match what the app requests):
   - **Jira API** → Configure → `View Jira issue data` (`read:jira-work`)
   - Optional: `View user profiles`, Jira Software sprint/board scopes
   - `offline_access` needs no console toggle
5. Copy Client ID / Secret into `.env` as `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET`.
6. In the app: **Integrations → Jira → Connect → OAuth**.

**If Accept shows "Something went wrong"**: a scope is missing in Permissions, or you're not signed in as the app owner (development-mode apps). Use **Personal Access Token** instead for fastest local setup.

For local development you can also use **Personal Access Token** (email + site URL + token).

## Integrations model

Features never talk to Jira/GitHub directly. They go through adapters that implement a shared contract:

- `authenticate()` / `disconnect()` / `test_connection()`
- `get_capabilities()`
- standard data accessors (e.g. Jira `get_projects()`)

Switching accounts = Disconnect (wipes local credentials) → Connect again. Feature code does not change.

## What is stored locally

| Path | Contents |
| --- | --- |
| `local/connections/*.enc` | Encrypted tokens / PAT material |
| `local/settings/app.json` | Display name and preferences |
| `local/cache/` | Reserved for short-lived fetched data |

Encryption key prefers OS keychain (`keyring`); falls back to a machine-derived key, or `PMQA_SECRET_KEY` from `.env`.

## Navigation (v1)

- **Dashboard** — home / connection overview
- **PM Tools** — placeholders (Standup, PRD, Impact)
- **QA Tools** — placeholders (Regression, API QA, …)
- **Knowledge** — Ask My Product placeholder
- **Integrations** — connect / disconnect / test
- **Settings** — local preferences

## Next milestones

1. PRD Checker + Change Impact (PM)
2. Regression / API QA (QA)
3. Release Readiness dashboard
4. GitHub OAuth (PAT + repo selection works today)
5. Optional: swap BM25 for local embeddings
