import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AppLayout, RoleGuard } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MyDonationsPage } from './pages/MyDonationsPage'
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
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { MessagesPage } from './pages/MessagesPage'
import { EventsPage } from './pages/EventsPage'
import { RequestsPage } from './pages/RequestsPage'
import { DonorCarePage } from './pages/DonorCarePage'
import { BulkMessagingPage } from './pages/BulkMessagingPage'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route
              path="/my-donations"
              element={
                <RoleGuard roles={['donor']}>
                  <MyDonationsPage />
                </RoleGuard>
              }
            />
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
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/donor-care" element={<DonorCarePage />} />
            <Route
              path="/bulk-messaging"
              element={
                <RoleGuard roles={['admin', 'accountant', 'manager']}>
                  <BulkMessagingPage />
                </RoleGuard>
              }
            />
            <Route path="*" element={<HomeRoute />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}

// Staff land on the dashboard; donors are sent to their own-donations portal.
function HomeRoute() {
  const { user } = useApp()
  const isDonor = user?.role === 'donor'
  if (isDonor) return <Navigate to="/my-donations" replace />
  return <DashboardPage />
}
