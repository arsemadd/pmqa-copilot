import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { api } from '../api/client'
import { Sidebar } from './Sidebar'

export const AppLayout = () => {
  const [displayName, setDisplayName] = useState('PM')

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.getSettings()
        if (settings.display_name) {
          setDisplayName(settings.display_name)
        }
      } catch {
        // Settings are optional on first boot
      }
    }
    void load()
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar displayName={displayName} />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
          <Outlet context={{ displayName, setDisplayName }} />
        </div>
      </main>
    </div>
  )
}
