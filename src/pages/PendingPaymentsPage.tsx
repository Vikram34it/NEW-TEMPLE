import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Badge, PageHeader, Field, Input, Select } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate } from '../utils/helpers'
import { PAYMENT_STATUSES } from '../utils/constants'
import type { PendingPayment } from '../types'

const statusColor: Record<string, string> = {
  pending: 'amber',
  'partially-paid': 'blue',
  paid: 'green',
  overdue: 'red',
}

export function PendingPaymentsPage() {
  const { pendingPayments, projects, vendors, people, can } = useApp()
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = statusFilter ? pendingPayments.filter((p) => p.status === statusFilter) : pendingPayments
  const totalDue = filtered.reduce((s, p) => s + p.remainingAmount, 0)

  const exportColumns = [
    { header: 'ID', accessor: (p: PendingPayment) => p.paymentID },
    { header: 'Vendor/Person', accessor: (p: PendingPayment) => p.personOrVendor },
    { header: 'Amount Due', accessor: (p: PendingPayment) => p.amountDue },
    { header: 'Amount Paid', accessor: (p: PendingPayment) => p.amountPaid },
    { header: 'Remaining', accessor: (p: PendingPayment) => p.remainingAmount },
    { header: 'Due Date', accessor: (p: PendingPayment) => p.dueDate },
    { header: 'Status', accessor: (p: PendingPayment) => p.status },
  ]

  const columns: Column<PendingPayment>[] = [
    { header: 'Vendor/Person', accessor: (p) => <span className="font-medium text-slate-700">{p.personOrVendor}</span>, sortable: true, sortKey: 'personOrVendor' },
    { header: 'Amount Due', accessor: (p) => formatCurrency(p.amountDue), sortable: true, sortKey: 'amountDue' },
    { header: 'Amount Paid', accessor: (p) => formatCurrency(p.amountPaid) },
    { header: 'Remaining', accessor: (p) => <span className="font-semibold text-amber-600">{formatCurrency(p.remainingAmount)}</span>, sortable: true, sortKey: 'remainingAmount' },
    { header: 'Due Date', accessor: (p) => formatDate(p.dueDate) },
    { header: 'Project', accessor: (p) => p.project || '—' },
    { header: 'Status', accessor: (p) => <Badge color={statusColor[p.status] as never}>{p.status.replace('-', ' ')}</Badge> },
  ]

  const [editPayment, setEditPayment] = useState<PendingPayment | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pending Payments"
        subtitle={`Total outstanding: ${formatCurrency(totalDue)}`}
        action={can('*') && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Record Payment</Button>}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-2">
        <Button variant={statusFilter === '' ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter('')}>All</Button>
        {PAYMENT_STATUSES.map((s) => (
          <Button key={s} variant={statusFilter === s.toLowerCase().replace(/ /g, '-') ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter(statusFilter === s.toLowerCase().replace(/ /g, '-') ? '' : s.toLowerCase().replace(/ /g, '-'))}>
            {s}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchable
        searchPlaceholder="Search payments..."
        exportFilename={`pending-payments-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(p) => p.paymentID}
        actions={(p) => can('*') && (
          <button onClick={() => setEditPayment(p)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
        )}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Payment" wide>
        <PaymentForm
          vendors={vendors.map((v) => v.companyName)}
          peopleNames={people.filter((pp) => pp.personType.includes('Contractor') || pp.personType.includes('Employment') || pp.personType.includes('Vendor Contact')).map((p) => p.name)}
          projects={projects}
          onDone={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!editPayment} onClose={() => setEditPayment(null)} title="Edit Payment" wide>
        {editPayment && <PaymentForm initial={editPayment} vendors={vendors.map((v) => v.companyName)} peopleNames={people.map((p) => p.name)} projects={projects} onDone={() => setEditPayment(null)} />}
      </Modal>
    </div>
  )
}

function PaymentForm({ initial, vendors, peopleNames, projects, onDone }: {
  initial?: Partial<PendingPayment>
  vendors: string[]
  peopleNames: string[]
  projects: { projectID: string; projectName: string }[]
  onDone: () => void
}) {
  const { addPendingPayment, updatePendingPayment } = useApp()
  const [form, setForm] = useState<Partial<PendingPayment>>({ ...{
    date: new Date().toISOString().slice(0, 10), personOrVendor: '', amountDue: 0, amountPaid: 0, remainingAmount: 0,
    dueDate: new Date().toISOString().slice(0, 10), project: '', status: 'pending', notes: '',
  }, ...initial })

  const set = (k: keyof PendingPayment, v: never) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'amountDue' || k === 'amountPaid') {
        next.remainingAmount = Math.max(0, (next.amountDue || 0) - (next.amountPaid || 0))
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (initial?.paymentID) {
      updatePendingPayment({ ...(form as PendingPayment), paymentID: initial.paymentID })
    } else {
      addPendingPayment(form as Omit<PendingPayment, 'paymentID'>)
    }
    onDone()
  }

  const allNames = [...new Set([...vendors, ...peopleNames])]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Person / Vendor" required>
          <Select value={form.personOrVendor} onChange={(e) => set('personOrVendor', e.target.value as never)}>
            <option value="">Select person or vendor</option>
            {allNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Field label="Project">
          <Select value={form.project} onChange={(e) => set('project', e.target.value as never)}>
            <option value="">None</option>
            {projects.map((p) => <option key={p.projectID} value={p.projectName}>{p.projectName}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Amount Due (₹)" required>
          <Input type="number" min="0" value={form.amountDue || ''} onChange={(e) => set('amountDue', Number(e.target.value) as never)} required />
        </Field>
        <Field label="Amount Paid (₹)">
          <Input type="number" min="0" value={form.amountPaid || ''} onChange={(e) => set('amountPaid', Number(e.target.value) as never)} />
        </Field>
        <Field label="Remaining (auto)">
          <Input type="number" value={form.remainingAmount || 0} disabled className="bg-slate-50" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value as never)} /></Field>
        <Field label="Due Date" required><Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value as never)} required /></Field>
      </div>
      <Field label="Status">
        <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s.toLowerCase().replace(/ /g, '-')}>{s}</option>)}
        </Select>
      </Field>
      <Field label="Notes"><Input value={form.notes} onChange={(e) => set('notes', e.target.value as never)} placeholder="Notes" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit">{initial?.paymentID ? 'Save Changes' : 'Record Payment'}</Button>
      </div>
    </form>
  )
}
