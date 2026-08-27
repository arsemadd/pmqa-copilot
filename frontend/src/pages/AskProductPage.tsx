import type { FormEvent } from 'react'
import { useState } from 'react'
import { api, type GroundedResult } from '../api/client'
import { GroundedResultView } from './StandupPage'

const SOURCE_OPTIONS = [
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'knowledge', label: 'Product docs / PRDs' },
]

export const AskProductPage = () => {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(['knowledge', 'jira', 'github'])
  const [result, setResult] = useState<GroundedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected.length) {
      setError('Select at least one source.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await api.askProduct(query, selected)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">Knowledge</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Ask My Product</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Answers only from toggled sources. If nothing matches, you get an explicit refusal — not a generic guess.
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 rounded-xl border border-[var(--color-line)] bg-white/60 p-5">
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="mb-2 w-full text-sm font-semibold">Sources for this question</legend>
          {SOURCE_OPTIONS.map((option) => (
            <label key={option.id} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={(event) => {
                  setSelected((prev) =>
                    event.target.checked
                      ? [...prev, option.id]
                      : prev.filter((item) => item !== option.id),
                  )
                }}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={4}
          required
          className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          placeholder="Why can't a receptionist edit the primary doctor?"
          aria-label="Product question"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Searching…' : 'Ask'}
        </button>
      </form>

      {error ? <p className="text-sm text-[var(--color-bad)]">{error}</p> : null}
      {result ? <GroundedResultView result={result} /> : null}
    </div>
  )
}
