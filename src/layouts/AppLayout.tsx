import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Header } from '../components/Header'
import { NAV_SECTIONS, homePathForRole } from '../navigation'
import { useApp } from '../context/AppContext'

export function AppLayout() {
  const { user, loading } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading temple data...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const homePath = homePathForRole(user.role)
  const path = location.pathname.replace(/\/+$/, '') || '/'
  if (homePath !== '/' && path !== homePath) {
    return <Navigate to={homePath} replace />
  }

  const page = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.path === path)
  if (page && !page.roles.includes(user.role)) return <Navigate to={homePath} replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className={`flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 ${user.role === 'donor' ? 'donor-portal-background' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, can } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (can('*')) return <>{children}</>
  // If the user has any of the required roles, allow access
  const hasAccess = roles.some((r) => r === user.role)
  if (!hasAccess) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }
  return <>{children}</>
}
