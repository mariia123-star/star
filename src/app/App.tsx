import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import MainLayout from '@/layout/MainLayout'
import Dashboard from '@/pages/Dashboard'
import Documents from '@/pages/documents/Documents'
import TenderEstimate from '@/pages/documents/TenderEstimate'
import TenderTest from '@/pages/documents/TenderTest'
import Users from '@/pages/developer/Users'
import Rates from '@/pages/developer/Rates'
import Materials from '@/pages/developer/Materials'
import DatabaseDebug from '@/pages/developer/DatabaseDebug'
import AuditLogs from '@/pages/developer/AuditLogs'
import Projects from '@/pages/references/Projects'
import UnitsReference from '@/pages/references/UnitsReference'
import MaterialTypes from '@/pages/references/MaterialTypes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppMain() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
        }}
      >
        <App>
          <Router>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route
                  path="/documents/tender-estimate"
                  element={<TenderEstimate />}
                />
                <Route
                  path="/documents/tender-test"
                  element={<TenderTest />}
                />
                <Route path="/developer/users" element={<Users />} />
                <Route path="/developer/rates" element={<Rates />} />
                <Route path="/developer/materials" element={<Materials />} />
                <Route path="/developer/audit-logs" element={<AuditLogs />} />
                <Route path="/developer/database-debug" element={<DatabaseDebug />} />
                <Route path="/references/projects" element={<Projects />} />
                <Route path="/references/units" element={<UnitsReference />} />
                <Route
                  path="/references/material-types"
                  element={<MaterialTypes />}
                />
              </Routes>
            </MainLayout>
          </Router>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default AppMain
