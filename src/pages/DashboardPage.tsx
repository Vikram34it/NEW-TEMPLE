import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HandCoins,
  Receipt,
  Wallet,
  Landmark,
  HardHat,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
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
import { StatCard, Card, CardHeader, Button, Modal } from '../components/ui'
import { formatCurrency, monthLabel } from '../utils/helpers'
import { DonationForm } from '../components/forms/DonationForm'
import { ExpenseForm } from '../components/forms/ExpenseForm'

const labelFmt = (label: unknown) => monthLabel(String(label))

const PIE_COLORS = ['#f97316', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1']

export function DashboardPage() {
  const { dashboard, can, settings } = useApp()
  const [showDonation, setShowDonation] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  if (!dashboard) return null

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
        <Link to="/people?new=1" className="inline-flex items-center gap-1.5 justify-center px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
          <Plus size={16} /> Add Person
        </Link>
      )}
      {can('vendors:write') && (
        <Link to="/vendors?new=1" className="inline-flex items-center gap-1.5 justify-center px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
          <Plus size={16} /> Add Vendor
        </Link>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{settings.templeName}</p>
        </div>
      </div>

      {/* Quick Actions */}
      {actions}

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Donations" value={formatCurrency(dashboard.totalDonations)} icon={<HandCoins size={20} />} color="green" />
        <StatCard label="Total Expenses" value={formatCurrency(dashboard.totalExpenses)} icon={<Receipt size={20} />} color="red" />
        <StatCard label="Cash Balance" value={formatCurrency(dashboard.cashBalance)} icon={<Wallet size={20} />} color="orange" />
        <StatCard label="Bank Balance" value={formatCurrency(dashboard.bankBalance)} icon={<Landmark size={20} />} color="blue" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Construction Expenses" value={formatCurrency(dashboard.totalConstructionExpenses)} icon={<HardHat size={20} />} color="amber" />
        <StatCard label="Pending Payments" value={formatCurrency(dashboard.pendingPayments)} icon={<Clock size={20} />} color="violet" />
        <StatCard label="This Month Donations" value={formatCurrency(dashboard.thisMonthDonations)} icon={<TrendingUp size={20} />} color="green" sub="Current month" />
        <StatCard label="This Month Expenses" value={formatCurrency(dashboard.thisMonthExpenses)} icon={<TrendingDown size={20} />} color="red" sub="Current month" />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Monthly Donations vs Expenses" subtitle="Income and spending trend" />
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={labelFmt} />
                <Legend />
                <Bar dataKey="donations" name="Donations" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
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
