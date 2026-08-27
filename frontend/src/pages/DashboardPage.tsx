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
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
          PM / QA AI Command Center
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--color-ink)] md:text-6xl">
          Good day, {displayName}
        </h1>
        <p className="max-w-2xl text-base text-[var(--color-ink-muted)]">
          Connect your tools, then run PM and QA workflows against live Jira and GitHub data.
          AI features arrive in a later milestone.
        </p>
      </header>

      <section aria-label="Connection summary" className="grid gap-4 md:grid-cols-3">
        <div className="border-t-2 border-[var(--color-sea)] pt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">Backend</p>
          <p className="mt-2 text-2xl font-semibold">
            {backendOk === null ? 'Checking…' : backendOk ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="border-t-2 border-[var(--color-accent)] pt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">Integrations</p>
          <p className="mt-2 text-2xl font-semibold">{connectedCount} connected</p>
        </div>
        <div className="border-t-2 border-[var(--color-line)] pt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">AI layer</p>
          <p className="mt-2 text-2xl font-semibold">Coming next</p>
        </div>
      </section>

      <section aria-label="Integration status" className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-line)] bg-white/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Jira</h2>
            <StatusDot connected={jira?.status === 'connected'} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            {jira?.status === 'connected'
              ? `${jira.workspace_label ?? 'Workspace'} · ${jira.account_label ?? 'Connected account'}`
              : 'Not connected — connect via OAuth or PAT to pull issues and sprints.'}
          </p>
          <Link
            to="/integrations"
            className="mt-5 inline-flex rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-sea-bright)]"
          >
            Manage Jira
          </Link>
        </article>

        <article className="rounded-xl border border-[var(--color-line)] bg-white/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">GitHub</h2>
            <StatusDot connected={github?.status === 'connected'} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            {github?.status === 'connected'
              ? `Connected as ${github.account_label}`
              : 'Not connected — PAT is available now; OAuth comes next.'}
          </p>
          <Link
            to="/integrations"
            className="mt-5 inline-flex rounded-md border border-[var(--color-ink)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-paper-2)]"
          >
            Manage GitHub
          </Link>
        </article>
      </section>

      <section aria-label="Feature roadmap">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">What comes after connections</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            'Standup from Jira + GitHub activity',
            'PRD checker and change impact',
            'Regression recommendations from PRs',
            'Release readiness score',
            'Ask My Product across connected sources',
          ].map((item) => (
            <li
              key={item}
              className="border-l-2 border-[var(--color-sea-bright)] pl-4 text-sm text-[var(--color-ink-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const StatusDot = ({ connected }: { connected: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
      connected
        ? 'bg-[rgba(31,122,77,0.12)] text-[var(--color-ok)]'
        : 'bg-[rgba(15,28,26,0.06)] text-[var(--color-ink-muted)]',
    ].join(' ')}
  >
    <span
      className={[
        'h-2 w-2 rounded-full',
        connected ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-ink-muted)]',
      ].join(' ')}
      aria-hidden
    />
    {connected ? 'Connected' : 'Not connected'}
  </span>
)
