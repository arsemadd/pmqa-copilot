type PlaceholderPageProps = {
  title: string
  eyebrow: string
  description: string
  upcoming: string[]
}

export const PlaceholderPage = ({ title, eyebrow, description, upcoming }: PlaceholderPageProps) => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">{eyebrow}</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">{title}</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">{description}</p>
      </header>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
          Planned in this group
        </h2>
        <ul className="mt-4 space-y-3">
          {upcoming.map((item) => (
            <li
              key={item}
              className="border-l-2 border-[var(--color-sea)] pl-4 text-[var(--color-ink)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
