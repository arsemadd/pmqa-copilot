import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { api } from '../api/client'
import { TopNav } from './TopNav'

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
        // optional on first boot
      }
    }
    void load()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav displayName={displayName} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Outlet context={{ displayName, setDisplayName }} />
        </div>
      </main>
    </div>
  )
}
