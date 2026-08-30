import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, PageHeader, Field, Input, Select } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate } from '../utils/helpers'
import type { Transaction } from '../types'

export function TransactionsPage() {
  const { transactions, accounts } = useApp()
  const [typeFilter, setTypeFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
      <PageHeader title="Transactions" subtitle={`Income: ${formatCurrency(income)} • Expense: ${formatCurrency(expense)} • Net: ${formatCurrency(income - expense)}`} />

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
    </div>
  )
}
