import { useMemo, useState } from 'react'
import { CalendarDays, CalendarRange, User, HardHat, Receipt, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, CardHeader, Button, Badge, Field, Input, PageHeader } from '../components/ui'
import { formatCurrency, downloadCSV } from '../utils/helpers'
import type { Donation } from '../types'

type ReportType = 'daily' | 'monthly' | 'donor' | 'construction' | 'expense'

export function ReportsPage() {
  const [type, setType] = useState<ReportType>('daily')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const reportTypes: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: 'daily', label: 'Daily', icon: <CalendarDays size={16} /> },
    { key: 'monthly', label: 'Monthly', icon: <CalendarRange size={16} /> },
    { key: 'donor', label: 'Donor', icon: <User size={16} /> },
    { key: 'construction', label: 'Construction', icon: <HardHat size={16} /> },
    { key: 'expense', label: 'Expense', icon: <Receipt size={16} /> },
  ]

  const effectiveFrom = type === 'daily' ? date : from
  const effectiveTo = type === 'daily' ? date : to

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Financial and construction reporting" />

      <div className="flex flex-wrap gap-2">
        {reportTypes.map((rt) => (
          <Button key={rt.key} variant={type === rt.key ? 'primary' : 'secondary'} onClick={() => setType(rt.key)}>
            {rt.icon} {rt.label}
          </Button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {type === 'daily' ? (
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        ) : (
          <>
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </>
        )}
      </div>

      {type === 'daily' && <DailyReport date={date} />}
      {type === 'monthly' && <MonthlyReport from={effectiveFrom} to={effectiveTo} />}
      {type === 'donor' && <DonorReport from={effectiveFrom} to={effectiveTo} />}
      {type === 'construction' && <ConstructionReport />}
      {type === 'expense' && <ExpenseReport from={effectiveFrom} to={effectiveTo} />}
    </div>
  )
}

function DailyReport({ date }: { date: string }) {
  const { donations, expenses } = useApp()
  const dayDonations = donations.filter((d) => d.date === date)
  const dayExpenses = expenses.filter((e) => e.date === date)
  const totalIn = dayDonations.reduce((s, d) => s + d.amount, 0)
  const totalOut = dayExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-5">
        <p className="text-sm text-slate-500">Daily Donations</p>
        <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(totalIn)}</p>
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {dayDonations.map((d) => (
            <Row key={d.donationID} label={d.donorName} sub={d.category} value={formatCurrency(d.amount)} color="text-emerald-600" />
          ))}
          {dayDonations.length === 0 && <p className="text-sm text-slate-400">No donations on this date.</p>}
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-slate-500">Daily Expenses</p>
        <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totalOut)}</p>
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {dayExpenses.map((e) => (
            <Row key={e.expenseID} label={e.description} sub={e.category} value={formatCurrency(e.amount)} color="text-red-600" />
          ))}
          {dayExpenses.length === 0 && <p className="text-sm text-slate-400">No expenses on this date.</p>}
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-slate-500">Net Balance for the Day</p>
        <p className={`text-3xl font-bold mt-1 ${totalIn - totalOut >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
          {formatCurrency(totalIn - totalOut)}
        </p>
        <div className="mt-4 bg-slate-50 rounded-lg p-3 text-sm space-y-1">
          <p className="flex justify-between"><span className="text-slate-500">Donations</span><span className="text-emerald-600 font-medium">{formatCurrency(totalIn)}</span></p>
          <p className="flex justify-between"><span className="text-slate-500">Expenses</span><span className="text-red-600 font-medium">{formatCurrency(totalOut)}</span></p>
          <div className="border-t border-slate-200 my-1" />
          <p className="flex justify-between font-medium"><span className="text-slate-700">Day balance</span><span>{formatCurrency(totalIn - totalOut)}</span></p>
        </div>
      </Card>
    </div>
  )
}

function MonthlyReport({ from, to }: { from: string; to: string }) {
  const { donations, expenses } = useApp()
  const { ds, es } = dateFilter(donations, expenses, from, to)
  const totalIn = ds.reduce((s, d) => s + d.amount, 0)
  const totalOut = es.reduce((s, e) => s + e.amount, 0)

  const byCat = useMemo(() => {
    const map = new Map<string, number>()
    es.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [es])

  const exportRows = [
    ['Report', 'Monthly'], ['From', from || 'All'], ['To', to || 'All'], [],
    ['Total Income', totalIn], ['Total Expenses', totalOut], ['Net Balance', totalIn - totalOut], [],
    ['Category', 'Amount'],
    ...byCat.map(([c, a]) => [c, a]),
  ]

  return (
    <Card>
      <CardHeader title="Monthly Report" subtitle={`${from || 'Start'} → ${to || 'End'}`} action={<Button variant="secondary" size="sm" onClick={() => downloadCSV('monthly-report.csv', ['Field', 'Value'], exportRows)}><Download size={14} /> Export</Button>} />
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Total Income</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalIn)}</p>
          <p className="text-xs text-slate-400">{ds.length} transactions</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalOut)}</p>
          <p className="text-xs text-slate-400">{es.length} transactions</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Net Balance</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalIn - totalOut)}</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <p className="text-sm font-semibold text-slate-700 mb-2">Category-wise Spending</p>
        <div className="space-y-2">
          {byCat.map(([cat, amt]) => (
            <div key={cat}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{cat}</span>
                <span className="font-medium">{formatCurrency(amt)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${byCat[0] ? (amt / byCat[0][1]) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
          {byCat.length === 0 && <p className="text-sm text-slate-400">No data for this range.</p>}
        </div>
      </div>
    </Card>
  )
}

function DonorReport({ from, to }: { from: string; to: string }) {
  const { donations } = useApp()
  const filtered = donations.filter((d) => (!from || d.date >= from) && (!to || d.date <= to))

  const donors = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>()
    filtered.forEach((d) => {
      const cur = map.get(d.donorName) || { name: d.donorName, count: 0, total: 0 }
      cur.count += 1
      cur.total += d.amount
      map.set(d.donorName, cur)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [filtered])

  const exportRows = [
    ['Donor', 'Number of Donations', 'Total Contribution'],
    ...donors.map((d) => [d.name, d.count, d.total]),
  ]

  return (
    <Card>
      <CardHeader title="Donor Report" subtitle={`${donors.length} donors`} action={<Button variant="secondary" size="sm" onClick={() => downloadCSV('donor-report.csv', ['Donor', 'Donations', 'Total'], exportRows)}><Download size={14} /> Export</Button>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold text-slate-500">
              <th className="px-5 py-2.5">Donor</th>
              <th className="px-5 py-2.5">Donations</th>
              <th className="px-5 py-2.5">Total Contribution</th>
              <th className="px-5 py-2.5">Share</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((d) => {
              const share = donors.reduce((s, x) => s + x.total, 0) ? (d.total / donors.reduce((s, x) => s + x.total, 0)) * 100 : 0
              return (
                <tr key={d.name} className="border-b border-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{d.name}</td>
                  <td className="px-5 py-3 text-slate-600">{d.count}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-600">{formatCurrency(d.total)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-slate-100 rounded-full w-24 overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${share}%` }} /></div>
                      <span className="text-xs text-slate-400">{share.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {donors.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No donors in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ConstructionReport() {
  const { projects } = useApp()
  const totalBudget = projects.reduce((s, p) => s + p.estimatedBudget, 0)
  const totalActual = projects.reduce((s, p) => s + p.actualExpense, 0)

  const exportRows = [
    ['Project', 'Budget', 'Actual', 'Remaining', 'Status'],
    ...projects.map((p) => [p.projectName, p.estimatedBudget, p.actualExpense, p.estimatedBudget - p.actualExpense, p.status]),
  ]

  return (
    <Card>
      <CardHeader title="Construction Report" subtitle="Budget vs actual per project" action={<Button variant="secondary" size="sm" onClick={() => downloadCSV('construction-report.csv', ['Project', 'Budget', 'Actual', 'Remaining', 'Status'], exportRows)}><Download size={14} /> Export</Button>} />
      <div className="p-5 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Total Budget</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Total Actual</p>
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalActual)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">Remaining</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalBudget - totalActual)}</p>
        </div>
      </div>
      <div className="px-5 pb-5 space-y-4">
        {projects.map((p) => {
          const pct = p.estimatedBudget > 0 ? (p.actualExpense / p.estimatedBudget) * 100 : 0
          return (
            <div key={p.projectID}>
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{p.projectName}</span>
                  <Badge color={p.status === 'completed' ? 'green' : p.status === 'in-progress' ? 'blue' : 'slate'}>{p.status}</Badge>
                </div>
                <span className="text-slate-500">{formatCurrency(p.actualExpense)} / {formatCurrency(p.estimatedBudget)}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ExpenseReport({ from, to }: { from: string; to: string }) {
  const { expenses } = useApp()
  const filtered = expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to))

  const byCat = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  const byVendor = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((e) => { if (e.vendorName) map.set(e.vendorName, (map.get(e.vendorName) || 0) + e.amount) })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader title="Category-wise Expenses" subtitle={`${filtered.length} expenses in range`} action={<Button variant="secondary" size="sm" onClick={() => downloadCSV('expense-report.csv', ['Category', 'Amount'], byCat.map(([c, a]) => [c, a]))}><Download size={14} /> Export</Button>} />
        <div className="p-5 space-y-3">
          {byCat.map(([cat, amt]) => (
            <div key={cat} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{cat}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 bg-slate-100 rounded-full w-32 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${byCat[0] ? (amt / byCat[0][1]) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-red-600 w-20 text-right">{formatCurrency(amt)}</span>
              </div>
            </div>
          ))}
          {byCat.length === 0 && <p className="text-sm text-slate-400">No data.</p>}
        </div>
      </Card>
      <Card>
        <CardHeader title="Vendor-wise Expenses" />
        <div className="p-5 space-y-3">
          {byVendor.map(([vendor, amt]) => (
            <div key={vendor} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{vendor}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 bg-slate-100 rounded-full w-32 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${byVendor[0] ? (amt / byVendor[0][1]) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-20 text-right">{formatCurrency(amt)}</span>
              </div>
            </div>
          ))}
          {byVendor.length === 0 && <p className="text-sm text-slate-400">No vendor expenses.</p>}
        </div>
      </Card>
    </div>
  )
}

function dateFilter(donations: Donation[], expenses: import('../types').Expense[], from: string, to: string) {
  const ds = donations.filter((d) => (!from || d.date >= from) && (!to || d.date <= to))
  const es = expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
  return { ds, es }
}

function Row({ label, sub, value, color }: { label: string; sub: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <div>
        <p className="text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
