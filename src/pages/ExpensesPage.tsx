import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Badge, PageHeader, Field, Input, Select } from '../components/ui'
import { BulkUploadModal, type ImportColumn } from '../components/BulkUploadModal'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { ExpenseForm } from '../components/forms/ExpenseForm'
import { formatCurrency, formatDate } from '../utils/helpers'
import { CONSTRUCTION_EXPENSE_CATEGORIES, OPERATIONS_EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants'
import type { Expense } from '../types'

const ALL_CATEGORIES = [...CONSTRUCTION_EXPENSE_CATEGORIES, ...OPERATIONS_EXPENSE_CATEGORIES]

const EXPENSE_IMPORT_COLUMNS: ImportColumn[] = [
  { header: 'Date', key: 'date', required: true, type: 'date' },
  { header: 'Category', key: 'category', options: [...ALL_CATEGORIES] },
  { header: 'Description', key: 'description', required: true },
  { header: 'Amount', key: 'amount', required: true, type: 'number' },
  { header: 'Payment Method', key: 'paymentMethod', options: [...PAYMENT_METHODS] },
  { header: 'Vendor Name', key: 'vendorName' },
  { header: 'Bill Number', key: 'billNumber' },
  { header: 'Transaction Reference', key: 'transactionReference' },
  { header: 'Project Name', key: 'projectName' },
  { header: 'Approved By', key: 'approvedBy' },
  { header: 'Paid By', key: 'paidBy' },
  { header: 'Notes', key: 'notes' },
]

export function ExpensesPage() {
  const { expenses, projects, can, softDeleteExpense, bulkAddExpenses } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [viewExpense, setViewExpense] = useState<Expense | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handleBulkImport = async (rows: Array<Record<string, unknown>>): Promise<string | null> => {
    const items = rows.map((r) => ({
      date: r.date as string,
      category: (r.category as string) || 'Maintenance',
      description: (r.description as string) || '',
      amount: Number(r.amount) || 0,
      paymentMethod: (r.paymentMethod as string) || 'Cash',
      vendorID: (r.vendorID as string) || '',
      vendorName: (r.vendorName as string) || '',
      billNumber: (r.billNumber as string) || '',
      transactionReference: (r.transactionReference as string) || '',
      projectID: (r.projectID as string) || '',
      projectName: (r.projectName as string) || '',
      approvedBy: (r.approvedBy as string) || '',
      paidBy: (r.paidBy as string) || '',
      notes: (r.notes as string) || '',
    }))
    try {
      await bulkAddExpenses(items)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to import expenses'
    }
  }

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false
      if (projectFilter && e.projectName !== projectFilter) return false
      if (methodFilter && e.paymentMethod !== methodFilter) return false
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      return true
    })
  }, [expenses, categoryFilter, projectFilter, methodFilter, dateFrom, dateTo])

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const handleDelete = (e: Expense) => {
    if (confirm(`Mark expense ${e.expenseID} as cancelled?`)) {
      void softDeleteExpense(e.expenseID).catch(() => {})
    }
  }

  const exportColumns = [
    { header: 'Date', accessor: (e: Expense) => e.date },
    { header: 'Category', accessor: (e: Expense) => e.category },
    { header: 'Description', accessor: (e: Expense) => e.description },
    { header: 'Amount', accessor: (e: Expense) => e.amount },
    { header: 'Method', accessor: (e: Expense) => e.paymentMethod },
    { header: 'Vendor', accessor: (e: Expense) => e.vendorName },
    { header: 'Bill No', accessor: (e: Expense) => e.billNumber },
    { header: 'Project', accessor: (e: Expense) => e.projectName },
  ]

  const columns: Column<Expense>[] = [
    { header: 'Date', accessor: (e) => formatDate(e.date), sortable: true, sortKey: 'date' },
    { header: 'Category', accessor: (e) => <Badge color={isConstruction(e.category) ? 'orange' : 'blue'}>{e.category}</Badge>, sortable: true, sortKey: 'category' },
    { header: 'Description', accessor: (e) => <span className="max-w-[200px] truncate block">{e.description}</span> },
    { header: 'Amount', accessor: (e) => <span className="font-semibold text-red-600">{formatCurrency(e.amount)}</span>, sortable: true, sortKey: 'amount' },
    { header: 'Method', accessor: (e) => e.paymentMethod },
    { header: 'Vendor', accessor: (e) => e.vendorName || '—' },
    { header: 'Project', accessor: (e) => e.projectName || '—' },
    { header: 'Paid By', accessor: (e) => e.paidBy },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        subtitle={`Total (filtered): ${formatCurrency(total)} • ${filtered.length} records`}
        action={can('expenses:write') && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBulk(true)}><Upload size={16} /> Import CSV</Button>
            <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Expense</Button>
          </div>
        )}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Field label="Category">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All</option>
            {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Project">
          <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All</option>
            {projects.map((p) => <option key={p.projectID} value={p.projectName}>{p.projectName}</option>)}
          </Select>
        </Field>
        <Field label="Payment Method">
          <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">All</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button variant="secondary" size="md" className="w-full" onClick={() => { setCategoryFilter(''); setProjectFilter(''); setMethodFilter(''); setDateFrom(''); setDateTo('') }}>
            Reset
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchable
        searchPlaceholder="Search expenses..."
        exportFilename={`expenses-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(e) => e.expenseID}
        actions={(e) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => setViewExpense(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="View"><Eye size={15} /></button>
            {can('expenses:write') && (
              <>
                <button onClick={() => setEditExpense(e)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(e)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        )}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense" wide>
        <ExpenseForm onDone={() => setShowAdd(false)} />
      </Modal>

      <BulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        title="Import Expenses"
        description="Upload a CSV of expenses. Use the template to match columns exactly. Date should be YYYY-MM-DD and Amount a number."
        columns={EXPENSE_IMPORT_COLUMNS}
        onImport={handleBulkImport}
        onImported={() => setShowBulk(false)}
      />

      <Modal open={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense" wide>
        {editExpense && <ExpenseForm initial={editExpense} onDone={() => setEditExpense(null)} />}
      </Modal>

      <Modal open={!!viewExpense} onClose={() => setViewExpense(null)} title="Expense Details">
        {viewExpense && <ExpenseDetail e={viewExpense} />}
      </Modal>
    </div>
  )
}

function isConstruction(cat: string) {
  return CONSTRUCTION_EXPENSE_CATEGORIES.includes(cat as never)
}

function ExpenseDetail({ e }: { e: Expense }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-800 text-lg font-bold">{e.description}</p>
          <p className="text-xs text-slate-400">Expense ID: {e.expenseID}</p>
        </div>
        <Badge color={isConstruction(e.category) ? 'orange' : 'blue'}>{e.category}</Badge>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 text-center">
        <p className="text-xs text-slate-500">Expense Amount</p>
        <p className="text-2xl font-bold text-red-600">{formatCurrency(e.amount)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Date" value={formatDate(e.date)} />
        <Info label="Payment Method" value={e.paymentMethod} />
        <Info label="Vendor" value={e.vendorName || '—'} />
        <Info label="Bill Number" value={e.billNumber || '—'} />
        <Info label="Transaction Ref" value={e.transactionReference || '—'} />
        <Info label="Project" value={e.projectName || '—'} />
        <Info label="Approved By" value={e.approvedBy || '—'} />
        <Info label="Paid By" value={e.paidBy || '—'} />
      </dl>
      {e.notes && <p className="text-sm text-slate-600">{e.notes}</p>}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-700 font-medium">{value}</dd>
    </div>
  )
}
