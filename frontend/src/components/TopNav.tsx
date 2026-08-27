import { NavLink } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/qa', label: 'QA Tools' },
  { to: '/integrations', label: 'Integrations' },
  { to: '/settings', label: 'Settings' },
]

const PM_GROUP: NavGroup = {
  label: 'PM Tools',
  items: [
    { to: '/pm', label: 'Overview', end: true },
    { to: '/pm/standup', label: 'Standup' },
  ],
}

const KNOWLEDGE_GROUP: NavGroup = {
  label: 'Knowledge',
  items: [
    { to: '/knowledge', label: 'Library', end: true },
    { to: '/knowledge/ask', label: 'Ask Product' },
  ],
}

type TopNavProps = {
  displayName: string
}

const NavDropdown = ({ group }: { group: NavGroup }) => {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        aria-haspopup="true"
        aria-label={`${group.label} menu`}
      >
        {group.label}
        <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-white py-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {group.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'block px-4 py-2 text-sm transition',
                isActive
                  ? 'bg-[var(--color-primary-soft)] font-medium text-[var(--color-primary)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export const TopNav = ({ displayName }: TopNavProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white">
      {/* Gradient accent line */}
      <div
        className="h-0.5 w-full"
        style={{
          background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 35%, #06b6d4 100%)',
        }}
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 md:px-6">
        {/* Logo */}
        <NavLink to="/" className="flex shrink-0 items-center gap-2" aria-label="PMQA Copilot home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-bold text-white">
            PQ
          </div>
          <span className="hidden text-sm font-semibold tracking-tight text-[var(--color-ink)] sm:block">
            PMQA Copilot
          </span>
        </NavLink>

        {/* Horizontal nav */}
        <nav className="flex flex-1 items-center gap-1" aria-label="Primary navigation">
          {MAIN_NAV.slice(0, 1).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'border border-[var(--color-ink)] bg-white text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}

          <NavDropdown group={PM_GROUP} />

          {MAIN_NAV.slice(1, 2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'border border-[var(--color-ink)] bg-white text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}

          <NavDropdown group={KNOWLEDGE_GROUP} />

          {MAIN_NAV.slice(2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'border border-[var(--color-ink)] bg-white text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User area */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full border border-[var(--color-primary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)] md:inline">
            Local
          </span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]"
            title={displayName}
            aria-label={`Signed in as ${displayName}`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
