import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { DonationsPage } from './pages/DonationsPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { PeoplePage } from './pages/PeoplePage'
import { VendorsPage } from './pages/VendorsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { PendingPaymentsPage } from './pages/PendingPaymentsPage'
import { AccountsPage } from './pages/AccountsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/donations" element={<DonationsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/pending-payments" element={<PendingPaymentsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
