import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { api, type KnowledgeDocument } from '../api/client'

export const KnowledgePage = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [tags, setTags] = useState('prd')
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState({ knowledge: true, jira: false, github: false })
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const data = await api.listDocuments()
    setDocuments(data.documents)
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const input = form.elements.namedItem('file') as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      setError('Choose a file first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.uploadDocument(file, tags)
      form.reset()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRetrieve = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const active = Object.entries(sources)
        .filter(([, on]) => on)
        .map(([key]) => key)
      const data = await api.retrieve(query, active)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieve failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">Knowledge</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Grounding library</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Upload PRDs and docs. Retrieval uses BM25 over chunks — no vector DB yet. Features only answer from
          what you connect or upload.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-[rgba(155,44,44,0.25)] bg-[rgba(155,44,44,0.08)] px-4 py-3 text-sm text-[var(--color-bad)]" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={(event) => void handleUpload(event)} className="space-y-3 rounded-xl border border-[var(--color-line)] bg-white/60 p-5">
        <h2 className="text-lg font-semibold">Upload document</h2>
        <input name="file" type="file" accept=".pdf,.docx,.md,.txt,.json" aria-label="Upload document" />
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Tags (comma-separated)</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Ingest'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--color-sea)] pl-4">
                <div>
                  <p className="font-medium">{doc.filename}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {doc.chunk_count} chunks · {doc.tags.join(', ') || 'untagged'}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-[var(--color-bad)]"
                  onClick={() =>
                    void api.deleteDocument(doc.id).then(load).catch((err) => setError(String(err)))
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(event) => void handleRetrieve(event)} className="space-y-4 rounded-xl border border-[var(--color-line)] bg-white/60 p-5">
        <h2 className="text-lg font-semibold">Test retrieval</h2>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="sr-only">Sources</legend>
          {(['knowledge', 'jira', 'github'] as const).map((key) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={sources[key]}
                onChange={(event) => setSources((prev) => ({ ...prev, [key]: event.target.checked }))}
              />
              {key}
            </label>
          ))}
        </fieldset>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What should retrieval find?"
          className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          aria-label="Retrieval query"
          required
        />
        <button type="submit" disabled={busy} className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white">
          Retrieve
        </button>
      </form>

      {result ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Chunks</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Used: {((result.used_sources as string[]) || []).join(', ') || 'none'} · Missing:{' '}
            {((result.missing_sources as string[]) || []).join(', ') || 'none'}
          </p>
          <div className="space-y-3">
            {((result.chunks as Array<Record<string, unknown>>) || []).map((chunk, index) => (
              <article key={String(chunk.id)} className="rounded-lg border border-[var(--color-line)] bg-white/70 p-4 text-sm">
                <p className="font-medium">
                  [{index + 1}] {String(chunk.title)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  {String(chunk.source_type)} · {String(chunk.source_label)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[var(--color-ink-muted)]">{String(chunk.text).slice(0, 500)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
