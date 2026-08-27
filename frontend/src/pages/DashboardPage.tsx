import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../api/client'
import type { IntegrationInfo } from '../types'

type OutletContext = {
  displayName: string
}

export const DashboardPage = () => {
  const { displayName } = useOutletContext<OutletContext>()
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([])
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        await api.health()
        setBackendOk(true)
        const items = await api.getIntegrations()
        setIntegrations(items)
      } catch {
        setBackendOk(false)
      }
    }
    void load()
  }, [])

  const jira = integrations.find((item) => item.id === 'jira')
  const github = integrations.find((item) => item.id === 'github')
  const connectedCount = integrations.filter((item) => item.status === 'connected').length

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Good day, {displayName}</h1>
        <p className="page-subtitle">
          Connect your tools, then run PM and QA workflows against live Jira and GitHub data.
        </p>
      </header>

      <section aria-label="Connection summary" className="grid gap-4 md:grid-cols-3">
        <div className="card border-t-2 border-t-[var(--color-primary)]">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Backend</p>
          <p className="mt-2 text-2xl font-semibold">
            {backendOk === null ? 'Checking…' : backendOk ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="card border-t-2 border-t-[var(--color-accent-cyan)]">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Integrations</p>
          <p className="mt-2 text-2xl font-semibold">{connectedCount} connected</p>
        </div>
        <div className="card border-t-2 border-t-[var(--color-border)]">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">AI layer</p>
          <p className="mt-2 text-2xl font-semibold">Ready</p>
        </div>
      </section>

      <section aria-label="Integration status" className="grid gap-4 md:grid-cols-2">
        <article className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Jira</h2>
            <StatusDot connected={jira?.status === 'connected'} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            {jira?.status === 'connected'
              ? `${jira.workspace_label ?? 'Workspace'} · ${jira.account_label ?? 'Connected'}`
              : 'Not connected — OAuth or PAT.'}
          </p>
          <Link to="/integrations" className="btn-primary mt-5">
            Manage Jira
          </Link>
        </article>

        <article className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">GitHub</h2>
            <StatusDot connected={github?.status === 'connected'} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            {github?.status === 'connected'
              ? `Connected as ${github.account_label}`
              : 'Not connected — PAT + repo selection.'}
          </p>
          <Link to="/integrations" className="btn-secondary mt-5">
            Manage GitHub
          </Link>
        </article>
      </section>
    </div>
  )
}

const StatusDot = ({ connected }: { connected: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
      connected
        ? 'bg-emerald-50 text-[var(--color-ok)]'
        : 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]',
    ].join(' ')}
  >
    <span
      className={['h-2 w-2 rounded-full', connected ? 'bg-[var(--color-ok)]' : 'bg-gray-400'].join(' ')}
      aria-hidden
    />
    {connected ? 'Connected' : 'Not connected'}
  </span>
)
