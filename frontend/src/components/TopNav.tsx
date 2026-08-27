import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  BookOpen,
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  CircleHelp,
  Plug,
  Settings,
  Sparkles,
  Sun,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { toolsGroupLabel } from '../constants/app'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type NavGroup = {
  label: string
  icon: LucideIcon
  items: NavItem[]
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/qa', label: 'QA Tools', icon: FlaskConical },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const buildPmGroup = (displayName: string): NavGroup => ({
  label: toolsGroupLabel(displayName),
  icon: Wrench,
  items: [
    { to: '/pm', label: 'Overview', icon: Wrench, end: true },
    { to: '/pm/standup', label: 'Standup', icon: Sun },
  ],
})

const KNOWLEDGE_GROUP: NavGroup = {
  label: 'Knowledge',
  icon: BookOpen,
  items: [
    { to: '/knowledge', label: 'Library', icon: BookOpen, end: true },
    { to: '/knowledge/ask', label: 'Ask Product', icon: CircleHelp },
  ],
}

type TopNavProps = {
  displayName: string
}

const navLinkClass = (isActive: boolean) =>
  [
    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] hover:shadow-sm',
  ].join(' ')

const NavDropdown = ({ group }: { group: NavGroup }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const GroupIcon = group.icon

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleToggle = () => setOpen((prev) => !prev)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className={[
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
          open
            ? 'bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
            : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] hover:shadow-sm',
        ].join(' ')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${group.label} menu`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <GroupIcon className="h-4 w-4 opacity-70" aria-hidden />
        <span className="hidden sm:inline">{group.label}</span>
        <ChevronDown
          className={['h-4 w-4 opacity-50 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[100] min-w-[200px] rounded-xl border border-[var(--color-border)] bg-white py-1.5 shadow-xl shadow-violet-100/30"
          role="menu"
        >
          {group.items.map((item) => {
            const ItemIcon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'mx-1.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-violet-50 font-medium text-violet-700'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                  ].join(' ')
                }
              >
                <ItemIcon className="h-4 w-4 opacity-70" aria-hidden />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export const TopNav = ({ displayName }: TopNavProps) => {
  const pmGroup = buildPmGroup(displayName)

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-xl">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400"
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 md:gap-6 md:px-6">
        <NavLink
          to="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="PMQA Copilot home"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-300/40 transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-white animate-pulse-soft" aria-hidden />
          </div>
          <span className="hidden text-sm font-bold tracking-tight text-[var(--color-ink)] sm:block">
            PMQA <span className="font-normal text-violet-600">Copilot</span>
          </span>
        </NavLink>

        <nav className="flex min-w-0 flex-1 items-center" aria-label="Primary navigation">
          <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-visible pb-0.5">
            {MAIN_NAV.slice(0, 1).map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navLinkClass(isActive)}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              )
            })}

            <NavDropdown group={pmGroup} />

            {MAIN_NAV.slice(1, 2).map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navLinkClass(isActive)}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              )
            })}

            <NavDropdown group={KNOWLEDGE_GROUP} />

            {MAIN_NAV.slice(2).map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navLinkClass(isActive)}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse-soft" aria-hidden />
            Local
          </span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-md ring-2 ring-violet-100 transition-transform hover:scale-105"
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
