import type { AppSettings, IntegrationInfo, TestConnectionResult } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

const handleResponse = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      detail = body.detail ?? detail
    } catch {
      // ignore parse errors
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return response.json() as Promise<T>
}

export const api = {
  getIntegrations: () =>
    fetch(`${API_BASE}/api/integrations`).then((r) => handleResponse<IntegrationInfo[]>(r)),

  getIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}`).then((r) => handleResponse<IntegrationInfo>(r)),

  startOAuth: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/oauth/start`, { method: 'POST' }).then((r) =>
      handleResponse<{ authorization_url: string; state: string; auth_method: string }>(r),
    ),

  connectWithPat: (
    id: string,
    payload: { token: string; email?: string; base_url?: string; selected_repos?: string[] },
  ) =>
    fetch(`${API_BASE}/api/integrations/${id}/pat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<IntegrationInfo>(r)),

  testIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/test`, { method: 'POST' }).then((r) =>
      handleResponse<TestConnectionResult>(r),
    ),

  disconnectIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/disconnect`, { method: 'POST' }).then((r) =>
      handleResponse<IntegrationInfo>(r),
    ),

  getSettings: () =>
    fetch(`${API_BASE}/api/settings`).then((r) => handleResponse<AppSettings>(r)),

  updateSettings: (payload: AppSettings) =>
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<AppSettings>(r)),

  health: () =>
    fetch(`${API_BASE}/api/health`).then((r) => handleResponse<{ status: string; app: string }>(r)),
}
