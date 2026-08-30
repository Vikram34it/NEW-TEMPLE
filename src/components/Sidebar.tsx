import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  HandCoins,
  Receipt,
  Users,
  Store,
  HardHat,
  Clock,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Settings,
  LogOut,
  Building2 as TempleIcon,
  X,
  Megaphone,
  Mail,
  CalendarDays,
  HeartHandshake,
} from 'lucide-react'
import { NAV_SECTIONS } from '../navigation'
import { useApp } from '../context/AppContext'

const icons: Record<string, React.ReactNode> = {
  '/': <LayoutDashboard size={18} />,
  '/donations': <HandCoins size={18} />,
  '/expenses': <Receipt size={18} />,
  '/people': <Users size={18} />,
  '/vendors': <Store size={18} />,
  '/projects': <HardHat size={18} />,
  '/pending-payments': <Clock size={18} />,
  '/accounts': <Wallet size={18} />,
  '/transactions': <ArrowLeftRight size={18} />,
  '/reports': <BarChart3 size={18} />,
  '/settings': <Settings size={18} />,
  '/announcements': <Megaphone size={18} />,
  '/messages': <Mail size={18} />,
  '/events': <CalendarDays size={18} />,
  '/requests': <HeartHandshake size={18} />,
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout, can } = useApp()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static z-50 inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white">
            <TempleIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{useAppSafe().settings.templeName}</p>
            <p className="text-[11px] text-slate-400">Management System</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter((item) => item.roles.includes(user?.role as never) || can('*'))
            if (visible.length === 0) return null
            return (
              <div key={section.title}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {visible.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-orange-600 text-white font-medium'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      {icons[item.path]}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function useAppSafe() {
  return useApp()
}
