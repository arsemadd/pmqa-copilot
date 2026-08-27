import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AuthMethod, IntegrationInfo } from '../types'

export const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await api.getIntegrations()
      setIntegrations(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const jiraStatus = searchParams.get('jira')
    const rawMessage = searchParams.get('message')
    if (jiraStatus === 'connected') {
      setMessage('Jira connected successfully.')
      setSearchParams({}, { replace: true })
      void load()
    } else if (jiraStatus === 'error') {
      setError(rawMessage ? decodeURIComponent(rawMessage) : 'Jira OAuth failed.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, load])

  const jira = useMemo(() => integrations.find((item) => item.id === 'jira'), [integrations])
  const github = useMemo(() => integrations.find((item) => item.id === 'github'), [integrations])

  const handleOAuthConnect = async (id: string) => {
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      const result = await api.startOAuth(id)
      window.location.href = result.authorization_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start OAuth')
      setBusyId(null)
    }
  }

  const handleDisconnect = async (id: string) => {
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      await api.disconnectIntegration(id)
      setMessage(`${id} disconnected. Local credentials removed.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleTest = async (id: string) => {
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      const result = await api.testIntegration(id)
      if (result.ok) {
        setMessage(result.message)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">System</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Integrations</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Connect accounts independently. Features only care that a valid connection exists — not which
          company or personal account you use.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-[rgba(31,122,77,0.25)] bg-[rgba(31,122,77,0.08)] px-4 py-3 text-sm text-[var(--color-ok)]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-[rgba(155,44,44,0.25)] bg-[rgba(155,44,44,0.08)] px-4 py-3 text-sm text-[var(--color-bad)]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading integrations…</p>
      ) : (
        <div className="space-y-6">
          {jira ? (
            <IntegrationCard
              integration={jira}
              busy={busyId === 'jira'}
              onOAuth={() => void handleOAuthConnect('jira')}
              onDisconnect={() => void handleDisconnect('jira')}
              onTest={() => void handleTest('jira')}
              onPatConnected={async () => {
                setMessage('Jira connected with Personal Access Token.')
                await load()
              }}
              onError={setError}
            />
          ) : null}
          {github ? (
            <IntegrationCard
              integration={github}
              busy={busyId === 'github'}
              onOAuth={() => void handleOAuthConnect('github')}
              onDisconnect={() => void handleDisconnect('github')}
              onTest={() => void handleTest('github')}
              onPatConnected={async () => {
                setMessage('GitHub connected with Personal Access Token.')
                await load()
              }}
              onError={setError}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

type IntegrationCardProps = {
  integration: IntegrationInfo
  busy: boolean
  onOAuth: () => void
  onDisconnect: () => void
  onTest: () => void
  onPatConnected: () => Promise<void>
  onError: (message: string) => void
}

const IntegrationCard = ({
  integration,
  busy,
  onOAuth,
  onDisconnect,
  onTest,
  onPatConnected,
  onError,
}: IntegrationCardProps) => {
  const connected = integration.status === 'connected'
  const [authMethod, setAuthMethod] = useState<AuthMethod>('oauth')
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handlePatSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await api.connectWithPat(integration.id, {
        token,
        email: email || undefined,
        base_url: baseUrl || undefined,
      })
      setShowConnectForm(false)
      setToken('')
      await onPatConnected()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'PAT connection failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="rounded-xl border border-[var(--color-line)] bg-white/60 p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{integration.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{integration.description}</p>
        </div>
        <StatusPill connected={connected} />
      </div>

      {connected ? (
        <div className="mt-5 space-y-2 text-sm">
          {integration.workspace_label ? (
            <p>
              <span className="text-[var(--color-ink-muted)]">Workspace: </span>
              {integration.workspace_label}
            </p>
          ) : null}
          {integration.account_label ? (
            <p>
              <span className="text-[var(--color-ink-muted)]">Account: </span>
              {integration.account_label}
            </p>
          ) : null}
          {integration.details?.auth_method ? (
            <p>
              <span className="text-[var(--color-ink-muted)]">Auth: </span>
              {String(integration.details.auth_method).toUpperCase()}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {connected ? (
          <>
            <button
              type="button"
              onClick={onTest}
              disabled={busy}
              className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-sea-bright)] disabled:opacity-50"
              aria-label={`Test ${integration.name} connection`}
            >
              Test connection
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={busy}
              className="rounded-md border border-[var(--color-bad)] px-4 py-2 text-sm font-medium text-[var(--color-bad)] hover:bg-[rgba(155,44,44,0.06)] disabled:opacity-50"
              aria-label={`Disconnect ${integration.name}`}
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={() => setShowConnectForm(true)}
              disabled={busy}
              className="rounded-md border border-[var(--color-ink)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-paper-2)] disabled:opacity-50"
              aria-label={`Change ${integration.name} account`}
            >
              Change account
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowConnectForm(true)}
            className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-sea-bright)]"
            aria-label={`Connect ${integration.name}`}
          >
            Connect {integration.name}
          </button>
        )}
      </div>

      {showConnectForm ? (
        <div className="mt-6 border-t border-[var(--color-line)] pt-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Authentication</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${integration.id}-auth`}
                checked={authMethod === 'oauth'}
                onChange={() => setAuthMethod('oauth')}
              />
              OAuth
              {integration.id === 'jira' && !integration.oauth_configured ? (
                <span className="text-xs text-[var(--color-warn)]">(configure .env first)</span>
              ) : null}
              {integration.id === 'github' ? (
                <span className="text-xs text-[var(--color-ink-muted)]">(coming next)</span>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${integration.id}-auth`}
                checked={authMethod === 'pat'}
                onChange={() => setAuthMethod('pat')}
              />
              Personal Access Token
            </label>
          </fieldset>

          {authMethod === 'oauth' ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOAuth}
                disabled={busy || (integration.id === 'jira' && !integration.oauth_configured)}
                className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Continue with OAuth
              </button>
              <button
                type="button"
                onClick={() => setShowConnectForm(false)}
                className="rounded-md px-4 py-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={(event) => void handlePatSubmit(event)}>
              {integration.id === 'jira' ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--color-ink-muted)]">Atlassian email</span>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
                      aria-label="Atlassian email"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--color-ink-muted)]">
                      Site URL (https://your-domain.atlassian.net)
                    </span>
                    <input
                      required
                      type="url"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
                      aria-label="Jira site URL"
                    />
                  </label>
                </>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--color-ink-muted)]">Personal Access Token</span>
                <input
                  required
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
                  aria-label={`${integration.name} personal access token`}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting ? 'Connecting…' : 'Save connection'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnectForm(false)}
                  className="rounded-md px-4 py-2 text-sm text-[var(--color-ink-muted)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </article>
  )
}

const StatusPill = ({ connected }: { connected: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
      connected
        ? 'bg-[rgba(31,122,77,0.12)] text-[var(--color-ok)]'
        : 'bg-[rgba(15,28,26,0.06)] text-[var(--color-ink-muted)]',
    ].join(' ')}
  >
    <span
      className={['h-2 w-2 rounded-full', connected ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-ink-muted)]'].join(' ')}
      aria-hidden
    />
    {connected ? 'Connected' : 'Not connected'}
  </span>
)
