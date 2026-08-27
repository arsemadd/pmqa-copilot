import { BrowserRouter, Navigate, Route, Routes, useOutletContext } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AskProductPage } from './pages/AskProductPage'
import { DashboardPage } from './pages/DashboardPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage } from './pages/SettingsPage'
import { StandupPage } from './pages/StandupPage'
import { toolsGroupLabel } from './constants/app'

type OutletContext = {
  displayName: string
}

const PmOverviewPage = () => {
  const { displayName } = useOutletContext<OutletContext>()
  return (
    <PlaceholderPage
      eyebrow={toolsGroupLabel(displayName)}
      title="Product workflows"
      description="Standup is live. PRD Checker and Change Impact come next."
      upcoming={['Standup (ready)', 'PRD Checker', 'Change Impact']}
    />
  )
}

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pm" element={<PmOverviewPage />} />
          <Route path="pm/standup" element={<StandupPage />} />
          <Route
            path="qa"
            element={
              <PlaceholderPage
                eyebrow="QA Tools"
                title="Quality workflows"
                description="Regression, API QA, and release readiness will consume the same grounded AI layer."
                upcoming={['Regression', 'API QA', 'Visual QA', 'Smart Test Data', 'Release Readiness']}
              />
            }
          />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="knowledge/ask" element={<AskProductPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
