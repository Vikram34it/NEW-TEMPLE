import { Menu, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, settings, unreadMessages } = useApp()
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const unread = unreadMessages.length

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <Menu size={20} />
        </button>
        <div>
          <p className="hidden sm:block text-sm text-slate-500">{today}</p>
          <p className="sm:hidden text-sm font-medium text-slate-700">{settings.templeName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/messages"
          className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          title={unread > 0 ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'Messages'}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-700">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold uppercase text-sm">
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  )
}
