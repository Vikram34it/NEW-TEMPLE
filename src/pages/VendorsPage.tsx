import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Badge, PageHeader, Field, Input, Textarea } from '../components/ui'
import { BulkUploadModal, type ImportColumn } from '../components/BulkUploadModal'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate } from '../utils/helpers'
import type { Vendor } from '../types'

const VENDOR_IMPORT_COLUMNS: ImportColumn[] = [
  { header: 'Company Name', key: 'companyName', required: true },
  { header: 'Contact Person', key: 'contactPerson' },
  { header: 'Phone', key: 'phone' },
  { header: 'Email', key: 'email' },
  { header: 'Address', key: 'address' },
  { header: 'Service Type', key: 'serviceType' },
  { header: 'GST Number', key: 'gstNumber' },
  { header: 'Bank Details', key: 'bankDetails' },
  { header: 'Notes', key: 'notes' },
]

export function VendorsPage() {
  const { vendors, expenses, pendingPayments, projects, can, deleteVendor, bulkAddVendors } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null)
  const [showBulk, setShowBulk] = useState(false)

  const handleBulkImport = (rows: Array<Record<string, unknown>>): string | null => {
    const items = rows.map((r) => ({
      companyName: (r.companyName as string) || 'Unknown',
      contactPerson: (r.contactPerson as string) || '',
      phone: (r.phone as string) || '',
      email: (r.email as string) || '',
      address: (r.address as string) || '',
      serviceType: (r.serviceType as string) || '',
      gstNumber: (r.gstNumber as string) || '',
      bankDetails: (r.bankDetails as string) || '',
      notes: (r.notes as string) || '',
    }))
    bulkAddVendors(items)
    return null
  }

  const vendorTotals = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number }>()
    expenses.forEach((e) => {
      if (!e.vendorName) return
      const cur = map.get(e.vendorName) || { paid: 0, pending: 0 }
      cur.paid += e.amount
      map.set(e.vendorName, cur)
    })
    pendingPayments.forEach((p) => {
      if (p.status === 'paid') return
      const cur = map.get(p.personOrVendor) || { paid: 0, pending: 0 }
      cur.pending += p.remainingAmount
      map.set(p.personOrVendor, cur)
    })
    return map
  }, [expenses, pendingPayments])

  const exportColumns = [
    { header: 'Vendor ID', accessor: (v: Vendor) => v.vendorID },
    { header: 'Company', accessor: (v: Vendor) => v.companyName },
    { header: 'Contact', accessor: (v: Vendor) => v.contactPerson },
    { header: 'Phone', accessor: (v: Vendor) => v.phone },
    { header: 'Service', accessor: (v: Vendor) => v.serviceType },
    { header: 'GST', accessor: (v: Vendor) => v.gstNumber },
  ]

  const columns: Column<Vendor>[] = [
    { header: 'Company', accessor: (v) => <span className="font-medium text-slate-700">{v.companyName}</span>, sortable: true, sortKey: 'companyName' },
    { header: 'Contact', accessor: (v) => v.contactPerson || '—' },
    { header: 'Phone', accessor: (v) => v.phone || '—' },
    { header: 'Service', accessor: (v) => <Badge color="blue">{v.serviceType}</Badge> },
    { header: 'Total Paid', accessor: (v) => <span className="font-semibold text-emerald-600">{formatCurrency(vendorTotals.get(v.companyName)?.paid || 0)}</span> },
    { header: 'Pending', accessor: (v) => <span className="font-semibold text-amber-600">{formatCurrency(vendorTotals.get(v.companyName)?.pending || 0)}</span> },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendors & Contractors"
        subtitle={`${vendors.length} vendors`}
        action={can('vendors:write') && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBulk(true)}><Upload size={16} /> Import CSV</Button>
            <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Vendor</Button>
          </div>
        )}
      />

      <DataTable
        columns={columns}
        data={vendors}
        searchable
        searchPlaceholder="Search vendors..."
        exportFilename={`vendors-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(v) => v.vendorID}
        actions={(v) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => setViewVendor(v)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="View"><Eye size={15} /></button>
            {can('vendors:write') && (
              <>
                <button onClick={() => setEditVendor(v)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm(`Delete vendor ${v.companyName}?`)) deleteVendor(v.vendorID) }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        )}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Vendor" wide>
        <VendorForm onDone={() => setShowAdd(false)} />
      </Modal>

      <BulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        title="Import Vendors"
        description="Upload a CSV of vendors. Use the template to match columns exactly. Only Company Name is required."
        columns={VENDOR_IMPORT_COLUMNS}
        onImport={handleBulkImport}
        onImported={() => setShowBulk(false)}
      />

      <Modal open={!!editVendor} onClose={() => setEditVendor(null)} title="Edit Vendor" wide>
        {editVendor && <VendorForm initial={editVendor} onDone={() => setEditVendor(null)} />}
      </Modal>

      <Modal open={!!viewVendor} onClose={() => setViewVendor(null)} title="Vendor Details" wide>
        {viewVendor && (
          <VendorDetail v={viewVendor} expenses={expenses.filter((e) => e.vendorName === viewVendor.companyName)} projects={projects} />
        )}
      </Modal>
    </div>
  )
}

function VendorForm({ initial, onDone }: { initial?: Partial<Vendor>; onDone: () => void }) {
  const { addVendor, updateVendor } = useApp()
  const [form, setForm] = useState<Partial<Vendor>>({ ...{
    companyName: '', contactPerson: '', phone: '', email: '', address: '', serviceType: '', gstNumber: '', bankDetails: '', notes: '',
  }, ...initial })
  const [error, setError] = useState('')

  const set = (k: keyof Vendor, v: never) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName?.trim()) return setError('Company name is required')
    if (initial?.vendorID) {
      updateVendor({ ...(form as Vendor), vendorID: initial.vendorID })
    } else {
      addVendor(form as Omit<Vendor, 'vendorID'>)
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Company/Business Name" required><Input value={form.companyName} onChange={(e) => set('companyName', e.target.value as never)} placeholder="Company name" required /></Field>
        <Field label="Contact Person"><Input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value as never)} placeholder="Contact person" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value as never)} placeholder="Phone" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value as never)} placeholder="Email" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Service Type"><Input value={form.serviceType} onChange={(e) => set('serviceType', e.target.value as never)} placeholder="e.g. Cement supplier, Contractor" /></Field>
        <Field label="GST Number (optional)"><Input value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value as never)} placeholder="GST number" /></Field>
      </div>
      <Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value as never)} placeholder="Address" /></Field>
      <Field label="Bank Details (optional)"><Input value={form.bankDetails} onChange={(e) => set('bankDetails', e.target.value as never)} placeholder="Bank details" /></Field>
      <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value as never)} placeholder="Notes" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit">{initial?.vendorID ? 'Save Changes' : 'Add Vendor'}</Button>
      </div>
    </form>
  )
}

function VendorDetail({ v, expenses, projects }: { v: Vendor; expenses: import('../types').Expense[]; projects: import('../types').Project[] }) {
  const totalPaid = expenses.reduce((s, e) => s + e.amount, 0)
  const relatedProjects = projects.filter((p) => p.contractor.toLowerCase() === v.companyName.toLowerCase())

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-bold text-slate-800">{v.companyName}</p>
        <p className="text-xs text-slate-400">{v.vendorID}</p>
        {v.serviceType && <Badge color="blue" >{v.serviceType}</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">Bills</p>
          <p className="text-lg font-bold text-slate-700">{expenses.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">Projects</p>
          <p className="text-lg font-bold text-amber-700">{relatedProjects.length}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Contact Person" value={v.contactPerson || '—'} />
        <Info label="Phone" value={v.phone || '—'} />
        <Info label="Email" value={v.email || '—'} />
        <Info label="GST" value={v.gstNumber || '—'} />
        <Info label="Address" value={v.address || '—'} />
        <Info label="Bank Details" value={v.bankDetails || '—'} />
      </dl>

      {expenses.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Expense History</p>
          <div className="space-y-2">
            {expenses.slice(0, 8).map((e) => (
              <div key={e.expenseID} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="text-slate-700">{formatDate(e.date)}</span>
                  <span className="text-slate-400 ml-2">{e.description}</span>
                </div>
                <span className="font-semibold text-slate-700">{formatCurrency(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
