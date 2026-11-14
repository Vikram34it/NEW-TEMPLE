import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HandCoins,
  Receipt,
  Landmark,
  Plus,
  Pin,
  Heart,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { StatCard, Card, CardHeader, Button, Modal, Badge } from '../components/ui'
import { formatCurrency, monthLabel, formatDateTime } from '../utils/helpers'
import { DonationForm } from '../components/forms/DonationForm'
import { ExpenseForm } from '../components/forms/ExpenseForm'

const labelFmt = (label: unknown) => monthLabel(String(label))

const PIE_COLORS = ['#f97316', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1']

export function DashboardPage() {
  const { dashboard, can, settings, announcements, events, people, donations, communications } = useApp()
  const [showDonation, setShowDonation] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  if (!dashboard) return null

  const today = new Date().toISOString().slice(0, 10)
  const topAnnouncements = announcements
    .filter((a) => !a.deleted && a.status !== 'archived' && (!a.expiresAt || a.expiresAt >= today))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.postedAt.localeCompare(a.postedAt)
    })
    .slice(0, 3)
  const upcomingEvents = events
    .filter((e) => e.status === 'upcoming' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 3)

  const actions = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {can('donations:write') && (
        <Button onClick={() => setShowDonation(true)}>
          <Plus size={16} /> Add Donation
        </Button>
      )}
      {can('expenses:write') && (
        <Button onClick={() => setShowExpense(true)} variant="secondary">
          <Plus size={16} /> Add Expense
        </Button>
      )}
      {can('people:write') && (
        <Link to="/people?new=1" className="inline-flex items-center gap-1.5 justify-center px-4 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
          <Plus size={16} /> Add Person
        </Link>
      )}
      {can('vendors:write') && (
        <Link to="/vendors?new=1" className="inline-flex items-center gap-1.5 justify-center px-4 py-2 text-sm font-medium rounded-lg bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
          <Plus size={16} /> Add Vendor
        </Link>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Page header with greeting + temple name */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">{settings.templeName}</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back — here's the temple's latest position.</p>
        </div>
      </div>

      {/* Quick Actions */}
      {actions}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Bank Balance" value={formatCurrency(dashboard.bankBalance)} icon={<Landmark size={20} />} color="blue" />
        <StatCard label="Total Donations" value={formatCurrency(dashboard.totalDonations)} icon={<HandCoins size={20} />} color="green" />
        <StatCard label="Total Expenses" value={formatCurrency(dashboard.totalExpenses)} icon={<Receipt size={20} />} color="red" />
      </div>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">Financial breakdown</summary>
        <div className="grid gap-5 border-t border-slate-100 p-4 md:grid-cols-3">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Bank activity</h2>
            <dl className="space-y-2 text-sm">
              <FinanceLine label="Credits (CR)" amount={dashboard.bankCredits} />
              <FinanceLine label="Debits (DR)" amount={dashboard.bankDebits} />
              <FinanceLine label="Net bank movement" amount={dashboard.bankCredits - dashboard.bankDebits} />
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Transactions</dt>
                <dd className="font-medium tabular-nums">{(dashboard.bankCreditCount + dashboard.bankDebitCount).toLocaleString('en-IN')}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Project funds</h2>
            <dl className="space-y-2 text-sm">
              <FinanceLine label="Construction received" amount={dashboard.constructionDonations} />
              <FinanceLine label="Construction spent" amount={dashboard.totalConstructionExpenses} />
              <FinanceLine label="Land purchase received" amount={dashboard.landDonations} />
              <FinanceLine label="Land purchase spent" amount={dashboard.landExpenses} />
            </dl>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Other balances and payments</h2>
            <dl className="space-y-2 text-sm">
              <FinanceLine label="Cash balance" amount={dashboard.cashBalance} />
              <FinanceLine label="Pending payments" amount={dashboard.pendingPayments} />
              <FinanceLine label="Fixed deposit placements" amount={dashboard.totalAssets} />
            </dl>
          </div>
        </div>
      </details>

      {/* Community & announcements */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Latest Announcements"
            subtitle="Temple notices"
            action={<Link to="/announcements" className="text-xs text-orange-600 hover:underline font-medium">View all</Link>}
          />
          <div className="p-4 space-y-3">
            {topAnnouncements.length === 0 && (
              <p className="text-sm text-slate-400">No announcements yet</p>
            )}
            {topAnnouncements.map((a) => (
              <Link key={a.announcementID} to="/announcements" className="block p-3 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 transition-colors">
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin size={13} className="text-orange-600 shrink-0" />}
                  <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{a.body}</p>
                <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(a.postedAt)}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming Events"
            subtitle="Next temple events"
            action={<Link to="/events" className="text-xs text-orange-600 hover:underline font-medium">View all</Link>}
          />
          <div className="p-4 space-y-3">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-slate-400">No upcoming events</p>
            )}
            {upcomingEvents.map((e) => (
              <Link key={e.eventID} to="/events" className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 transition-colors">
                <div className="w-9 shrink-0 rounded-lg bg-orange-50 text-orange-600 flex flex-col items-center justify-center px-2 py-1">
                  <span className="text-[10px] uppercase font-semibold leading-none">
                    {new Date(e.date + 'T00:00:00').toLocaleString('en', { month: 'short' })}
                  </span>
                  <span className="text-base font-bold leading-tight">{new Date(e.date + 'T00:00:00').getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {e.time || ''}{e.location ? ` · ${e.location}` : ''}
                  </p>
                </div>
                <Badge color="blue">{e.category || 'Other'}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Donor Care */}
      <Card>
        <CardHeader
          title="Donor Care"
          subtitle="Keep your supporters close"
          action={<Link to="/donor-care" className="text-xs text-orange-600 hover:underline font-medium">Open Donor Care</Link>}
        />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DonorCareStat
            label="Donors to Thank"
            count={countToThank(donations, communications, people)}
            detail="Recent donation, no thank-you yet"
            to="/donor-care"
          />
          <DonorCareStat
            label="Lapsed Donors"
            count={countLapsed(donations, today)}
            detail="No donation in 6+ months"
            to="/donor-care"
          />
          <DonorCareStat
            label="Occasions This Month"
            count={countOccasions(people)}
            detail="Birthdays & anniversaries"
            to="/donor-care"
          />
        </div>
      </Card>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Monthly Donations vs Expenses" subtitle="Income and spending trend" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={labelFmt} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Bar dataKey="donations" name="Donations" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Donations by Category" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.donationsByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {dashboard.donationsByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Expenses by Category" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {dashboard.expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Construction Budget vs Actual" subtitle="Estimated vs spent per project" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.constructionBudgets} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 100000}L`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Monthly trend line */}
      <Card>
        <CardHeader title="Monthly Financial Trend" subtitle="Net cash flow over time" />
        <div className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={labelFmt} />
              <Legend />
              <Line type="monotone" dataKey="donations" name="Donations" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Modal
        open={showDonation}
        onClose={() => setShowDonation(false)}
        title="Add Donation"
        wide
      >
        <DonationForm onDone={() => setShowDonation(false)} />
      </Modal>

      <Modal
        open={showExpense}
        onClose={() => setShowExpense(false)}
        title="Add Expense"
        wide
      >
        <ExpenseForm onDone={() => setShowExpense(false)} />
      </Modal>
    </div>
  )
}

function countToThank(
  donations: import('../types').Donation[],
  communications: import('../types').Communication[],
  people: import('../types').Person[]
): number {
  const donors = people.filter((p) => p.personType.includes('Donor'))
  const lastByKey = new Map<string, import('../types').Donation>()
  for (const d of donations) {
    const person = donors.find((p) => p.personID === d.donorID || p.name.toLowerCase() === String(d.donorName).toLowerCase())
    const key = person ? person.personID : `name:${String(d.donorName).toLowerCase()}`
    const prev = lastByKey.get(key)
    if (!prev || d.date > prev.date) lastByKey.set(key, d)
  }
  let count = 0
  for (const [key, last] of lastByKey) {
    const thanked = communications.some(
      (c) =>
        (c.personID === key || String(c.donorName).toLowerCase() === String(last.donorName).toLowerCase()) &&
        (c.type === 'Thank You' || c.type === 'Receipt') &&
        String(c.date).slice(0, 10) >= last.date
    )
    if (!thanked) count++
  }
  return count
}

function countLapsed(donations: import('../types').Donation[], today: string): number {
  const cutoff = new Date(today)
  cutoff.setMonth(cutoff.getMonth() - 6)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const last = new Map<string, string>()
  for (const d of donations) {
    const key = String(d.donorName).toLowerCase()
    const prev = last.get(key)
    if (!prev || d.date > prev) last.set(key, d.date)
  }
  return [...last.values()].filter((date) => date < cutoffStr).length
}

function countOccasions(people: import('../types').Person[]): number {
  const month = todayStr().slice(5, 7)
  return people.filter(
    (p) => (p.birthday && p.birthday.slice(5, 7) === month) || (p.anniversary && p.anniversary.slice(5, 7) === month)
  ).length
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function FinanceLine({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{formatCurrency(amount)}</dd>
    </div>
  )
}

function DonorCareStat({ label, count, detail, to }: { label: string; count: number; detail: string; to: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-orange-200 hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 hover:shadow-md transition-all duration-300">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Heart size={18} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 leading-none">{count}</p>
        <p className="text-xs font-medium text-slate-600 mt-1">{label}</p>
        <p className="text-[11px] text-slate-400">{detail}</p>
      </div>
    </Link>
  )
}
