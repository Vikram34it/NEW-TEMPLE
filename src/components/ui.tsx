import type { ButtonHTMLAttributes, ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-100">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md'
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  }
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  }
  return (
    <button
      className={`inline-flex items-center gap-1.5 justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${props.className || ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 ${props.className || ''}`}
    />
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none ${props.className || ''}`}
    />
  )
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

const badgeColors: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
}

export function Badge({ color = 'slate', children }: { color?: keyof typeof badgeColors; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${badgeColors[color] || badgeColors.slate}`}>
      {children}
    </span>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function StatCard({ label, value, icon, color = 'orange', sub }: {
  label: string
  value: string
  icon: ReactNode
  color?: 'orange' | 'green' | 'red' | 'blue' | 'amber' | 'violet' | 'teal'
  sub?: string
}) {
  const colors: Record<string, { badge: string; glow: string }> = {
    orange: {
      badge: 'bg-orange-100 text-orange-600 ring-orange-200',
      glow: 'from-orange-50 to-amber-50 border-orange-100 hover:shadow-orange-100',
    },
    green: {
      badge: 'bg-emerald-100 text-emerald-600 ring-emerald-200',
      glow: 'from-emerald-50 to-teal-50 border-emerald-100 hover:shadow-emerald-100',
    },
    red: {
      badge: 'bg-red-100 text-red-600 ring-red-200',
      glow: 'from-red-50 to-rose-50 border-red-100 hover:shadow-red-100',
    },
    blue: {
      badge: 'bg-blue-100 text-blue-600 ring-blue-200',
      glow: 'from-blue-50 to-indigo-50 border-blue-100 hover:shadow-blue-100',
    },
    amber: {
      badge: 'bg-amber-100 text-amber-600 ring-amber-200',
      glow: 'from-amber-50 to-orange-50 border-amber-100 hover:shadow-amber-100',
    },
    violet: {
      badge: 'bg-violet-100 text-violet-600 ring-violet-200',
      glow: 'from-violet-50 to-purple-50 border-violet-100 hover:shadow-violet-100',
    },
    teal: {
      badge: 'bg-teal-100 text-teal-600 ring-teal-200',
      glow: 'from-teal-50 to-emerald-50 border-teal-100 hover:shadow-teal-100',
    },
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-gradient-to-br border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${colors[color].glow}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 truncate">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
        </div>
        <div className={`shrink-0 p-2.5 rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 ${colors[color].badge}`}>
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/40 blur-2xl" />
    </div>
  )
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-slate-400 text-sm">{title}</p>
      {subtitle && <p className="text-xs text-slate-300 mt-1">{subtitle}</p>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
