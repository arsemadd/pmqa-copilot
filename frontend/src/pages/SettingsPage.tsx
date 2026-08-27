import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../api/client'

type OutletContext = {
  displayName: string
  setDisplayName: (name: string) => void
}

export const SettingsPage = () => {
  const { displayName, setDisplayName } = useOutletContext<OutletContext>()
  const [name, setName] = useState(displayName)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(displayName)
  }, [displayName])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    try {
      const updated = await api.updateSettings({ display_name: name.trim() || 'PM' })
      setDisplayName(updated.display_name ?? name)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">System</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Settings</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Preferences are stored locally on this machine. Credentials live in encrypted connection files
          (and OS keychain when available).
        </p>
      </header>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-w-lg space-y-4 rounded-xl border border-[var(--color-line)] bg-white/60 p-6"
      >
        <h2 className="text-lg font-semibold">Profile</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Display name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
            aria-label="Display name"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-sea-bright)]"
        >
          Save settings
        </button>
        {saved ? <p className="text-sm text-[var(--color-ok)]" role="status">Saved locally.</p> : null}
        {error ? <p className="text-sm text-[var(--color-bad)]" role="alert">{error}</p> : null}
      </form>

      <section className="max-w-lg space-y-3 rounded-xl border border-[var(--color-line)] bg-white/60 p-6">
        <h2 className="text-lg font-semibold">AI Provider</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          OpenAI / Claude / Ollama will be configurable here. Not implemented in this milestone.
        </p>
        <p className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-ink-muted)]" aria-hidden />
          Not configured
        </p>
      </section>

      <section className="max-w-lg space-y-2 text-sm text-[var(--color-ink-muted)]">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Local storage</h2>
        <p><code className="text-[var(--color-ink)]">local/connections/</code> — encrypted integration credentials</p>
        <p><code className="text-[var(--color-ink)]">local/settings/</code> — app preferences JSON</p>
        <p><code className="text-[var(--color-ink)]">local/cache/</code> — short-lived fetched data (future)</p>
      </section>
    </div>
  )
}
