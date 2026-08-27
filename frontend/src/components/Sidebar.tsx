import { NavLink } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  group?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/pm', label: 'PM Tools', group: 'Work' },
  { to: '/qa', label: 'QA Tools', group: 'Work' },
  { to: '/knowledge', label: 'Knowledge', group: 'Work' },
  { to: '/integrations', label: 'Integrations', group: 'System' },
  { to: '/settings', label: 'Settings', group: 'System' },
]

type SidebarProps = {
  displayName: string
}

export const Sidebar = ({ displayName }: SidebarProps) => {
  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-r border-[var(--color-line)] bg-[rgba(15,28,26,0.96)] text-[var(--color-paper)]"
      aria-label="Primary navigation"
    >
      <div className="border-b border-white/10 px-5 py-6">
        <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-paper)]">
          PMQA
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--color-sea-bright)]">
          Copilot
        </p>
        <p className="mt-4 text-sm text-white/55">Command center for {displayName}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="App sections">
        {NAV_ITEMS.map((item, index) => {
          const showGroup =
            item.group && (index === 0 || NAV_ITEMS[index - 1]?.group !== item.group)

          return (
            <div key={item.to}>
              {showGroup ? (
                <p className="mb-2 mt-4 px-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
                  {item.group}
                </p>
              ) : null}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'block rounded-md px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--color-sea)] text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
                aria-label={item.label}
              >
                {item.label}
              </NavLink>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
        Local app · No cloud database
      </div>
    </aside>
  )
}
