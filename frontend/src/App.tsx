import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage } from './pages/SettingsPage'

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="pm"
            element={
              <PlaceholderPage
                eyebrow="PM Tools"
                title="Product workflows"
                description="Standup, PRD checks, and change impact will live here once integrations and the AI layer are ready."
                upcoming={['Standup', 'PRD Checker', 'Change Impact']}
              />
            }
          />
          <Route
            path="qa"
            element={
              <PlaceholderPage
                eyebrow="QA Tools"
                title="Quality workflows"
                description="Regression, API QA, and release readiness will pull from the same integration layer."
                upcoming={['Regression', 'API QA', 'Visual QA', 'Smart Test Data', 'Release Readiness']}
              />
            }
          />
          <Route
            path="knowledge"
            element={
              <PlaceholderPage
                eyebrow="Knowledge"
                title="Ask My Product"
                description="Search across connected Jira, GitHub, docs, and PRDs. Temporary local cache first — no vector DB in v1."
                upcoming={['Source selection', 'Temporary index/cache', 'Natural-language answers']}
              />
            }
          />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
