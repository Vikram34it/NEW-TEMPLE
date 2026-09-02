import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, PageHeader, Field, Input, Select, Modal, Button } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate, todayStr } from '../utils/helpers'
import type { Transaction } from '../types'

export function TransactionsPage() {
  const { transactions, accounts, addTransaction, clearBankTransactions, user, can } = useApp()
  const [typeFilter, setTypeFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showRecord, setShowRecord] = useState(false)

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter && t.incomeOrExpense !== typeFilter) return false
      if (accountFilter && t.account !== accountFilter) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      return true
    })
  }, [transactions, typeFilter, accountFilter, dateFrom, dateTo])

  const income = filtered.filter((t) => t.incomeOrExpense === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = filtered.filter((t) => t.incomeOrExpense === 'expense').reduce((s, t) => s + t.amount, 0)

  const exportColumns = [
    { header: 'Date', accessor: (t: Transaction) => t.date },
    { header: 'Type', accessor: (t: Transaction) => t.incomeOrExpense },
    { header: 'Amount', accessor: (t: Transaction) => t.amount },
    { header: 'Account', accessor: (t: Transaction) => t.account },
    { header: 'Reference', accessor: (t: Transaction) => t.referenceID },
    { header: 'Description', accessor: (t: Transaction) => t.description },
    { header: 'Created By', accessor: (t: Transaction) => t.createdBy },
  ]

  const columns: Column<Transaction>[] = [
    { header: 'Date', accessor: (t) => formatDate(t.date), sortable: true, sortKey: 'date' },
    { header: 'Type', accessor: (t) => <Badge color={t.incomeOrExpense === 'income' ? 'green' : 'red'}>{t.incomeOrExpense}</Badge> },
    { header: 'Amount', accessor: (t) => (
      <span className={`font-semibold ${t.incomeOrExpense === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
        {t.incomeOrExpense === 'income' ? '+' : '−'} {formatCurrency(t.amount)}
      </span>
    ), sortable: true, sortKey: 'amount' },
    { header: 'Account', accessor: (t) => t.account },
    { header: 'Reference', accessor: (t) => t.referenceID },
    { header: 'Description', accessor: (t) => <span className="max-w-[220px] truncate block">{t.description}</span> },
    { header: 'Created By', accessor: (t) => t.createdBy },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        subtitle={`Income: ${formatCurrency(income)} • Expense: ${formatCurrency(expense)} • Net: ${formatCurrency(income - expense)}`}
        action={
          can('*') ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm('Remove all rows imported from a bank statement (BANK- references)? This cannot be undone.')) {
                    void clearBankTransactions()
                  }
                }}
              >
                <Trash2 size={15} /> Clear bank imports
              </Button>
              <Button onClick={() => setShowRecord(true)}><Plus size={16} /> Record Transaction</Button>
            </div>
          ) : undefined
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
        </Field>
        <Field label="Account">
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="">All</option>
            {accounts.map((a) => <option key={a.accountID} value={a.accountName}>{a.accountName}</option>)}
          </Select>
        </Field>
        <Field label="From"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchable
        searchPlaceholder="Search transactions..."
        exportFilename={`transactions-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(t) => t.transactionID}
      />

      <Modal
        open={showRecord}
        onClose={() => setShowRecord(false)}
        title="Record Transaction"
      >
        <RecordTransactionForm
          accounts={accounts}
          defaultCreatedBy={user?.name || ''}
          onClose={() => setShowRecord(false)}
          onDone={async (t) => {
            await addTransaction(t)
            setShowRecord(false)
          }}
        />
      </Modal>
    </div>
  )
}

function RecordTransactionForm({ accounts, defaultCreatedBy, onClose, onDone }: {
  accounts: Array<{ accountID: string; accountName: string }>
  defaultCreatedBy: string
  onClose: () => void
  onDone: (t: Omit<Transaction, 'transactionID'>) => Promise<void>
}) {
  const [form, setForm] = useState({
    date: todayStr(),
    incomeOrExpense: 'income' as 'income' | 'expense',
    amount: 0,
    account: '',
    referenceID: '',
    description: '',
    createdBy: defaultCreatedBy,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount) || 0
    if (amount <= 0) return setError('Amount must be greater than zero')
    if (!form.account) return setError('Select an account')
    if (!form.date) return setError('Date is required')
    setError('')
    setSaving(true)
    try {
      await onDone({
        date: form.date,
        type: form.incomeOrExpense,
        incomeOrExpense: form.incomeOrExpense,
        amount,
        account: form.account,
        referenceID: form.referenceID.trim(),
        description: form.description.trim(),
        createdBy: form.createdBy.trim() || defaultCreatedBy,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </Field>
        <Field label="Type" required>
          <Select value={form.incomeOrExpense} onChange={(e) => setForm({ ...form, incomeOrExpense: e.target.value as 'income' | 'expense' })}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)" required>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
        </Field>
        <Field label="Account" required>
          <Select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            <option value="">Select…</option>
            {accounts.map((a) => <option key={a.accountID} value={a.accountName}>{a.accountName}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Reference ID"><Input value={form.referenceID} onChange={(e) => setForm({ ...form, referenceID: e.target.value })} placeholder="e.g. bill / receipt number (optional)" /></Field>
      <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this for? (optional)" /></Field>
      <Field label="Created By"><Input value={form.createdBy} onChange={(e) => setForm({ ...form, createdBy: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Transaction'}</Button>
      </div>
    </form>
  )
}
