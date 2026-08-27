import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

type JiraOAuthSetupProps = {
  onSaved: () => void
}

export const JiraOAuthSetup = ({ onSaved }: JiraOAuthSetupProps) => {
  const [status, setStatus] = useState<{
    configured: boolean
    client_id_set: boolean
    client_secret_set: boolean
    redirect_uri: string
  } | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('http://127.0.0.1:8000/api/integrations/jira/callback')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.getJiraOAuth().then((data) => {
      setStatus(data)
      setRedirectUri(data.redirect_uri)
    })
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.saveJiraOAuth({
        client_id: clientId,
        client_secret: clientSecret || undefined,
        redirect_uri: redirectUri,
      })
      const updated = await api.getJiraOAuth()
      setStatus(updated)
      setClientSecret('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OAuth config')
    } finally {
      setBusy(false)
    }
  }

  if (status?.configured) {
    return (
      <div className="rounded-lg border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)]/40 p-4 text-sm">
        <p className="font-medium text-[var(--color-primary)]">Jira OAuth configured</p>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          Redirect URI: <code className="text-xs">{status.redirect_uri}</code>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div>
        <h3 className="text-sm font-semibold">Jira OAuth setup</h3>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Create an OAuth 2.0 app at{' '}
          <a
            href="https://developer.atlassian.com/console/myapps/"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            developer.atlassian.com
          </a>
          . Set callback URL to the redirect URI below.
        </p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-ink-muted)]">Client ID</span>
        <input
          required
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          className="input-field"
          aria-label="Jira OAuth client ID"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-ink-muted)]">Client Secret</span>
        <input
          required={!status?.client_secret_set}
          type="password"
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          className="input-field"
          placeholder={status?.client_secret_set ? '•••• saved — leave blank to keep' : ''}
          aria-label="Jira OAuth client secret"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-ink-muted)]">Redirect URI (must match Atlassian app)</span>
        <input
          required
          value={redirectUri}
          onChange={(event) => setRedirectUri(event.target.value)}
          className="input-field"
          aria-label="Jira OAuth redirect URI"
        />
      </label>
      {error ? <p className="alert-error">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Saving…' : 'Save OAuth credentials'}
      </button>
    </form>
  )
}
