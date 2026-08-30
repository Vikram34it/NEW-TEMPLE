import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Phone, Mail, MapPin, HandCoins, Receipt, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Badge, PageHeader, Field, Input, Select, Textarea } from '../components/ui'
import { BulkUploadModal, type ImportColumn } from '../components/BulkUploadModal'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate } from '../utils/helpers'
import { PERSON_TYPES } from '../utils/constants'
import type { Person } from '../types'

const PERSON_IMPORT_COLUMNS: ImportColumn[] = [
  { header: 'Name', key: 'name', required: true },
  { header: 'Phone', key: 'phone' },
  { header: 'Email', key: 'email' },
  { header: 'Address', key: 'address' },
  { header: 'City', key: 'city' },
  { header: 'Role / Type', key: 'personType', type: 'stringArray' },
  { header: 'Join Date', key: 'joinDate', type: 'date' },
  { header: 'Status', key: 'status', options: ['active', 'inactive', 'Active', 'Inactive'] },
  { header: 'Notes', key: 'notes' },
]

export function PeoplePage() {
  const { people, donations, expenses, can, deletePerson, bulkAddPeople } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [viewPerson, setViewPerson] = useState<Person | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')

  const handleBulkImport = (rows: Array<Record<string, unknown>>): string | null => {
    const items = rows.map((r) => {
      const types = (r.personType as string[]) || []
      const cleanTypes = types.filter((t) => PERSON_TYPES.includes(t as never))
      if (cleanTypes.length === 0) cleanTypes.push('Donor')
      return {
        name: (r.name as string) || 'Unknown',
        phone: (r.phone as string) || '',
        email: (r.email as string) || '',
        address: (r.address as string) || '',
        city: (r.city as string) || '',
        personType: cleanTypes,
        joinDate: (r.joinDate as string) || new Date().toISOString().slice(0, 10),
        status: /inactive/i.test(String(r.status || 'active')) ? 'inactive' as const : 'active' as const,
        notes: (r.notes as string) || '',
      }
    })
    bulkAddPeople(items)
    return null
  }

  const filtered = useMemo(() => {
    if (!typeFilter) return people
    return people.filter((p) => p.personType.includes(typeFilter))
  }, [people, typeFilter])

  const exportColumns = [
    { header: 'ID', accessor: (p: Person) => p.personID },
    { header: 'Name', accessor: (p: Person) => p.name },
    { header: 'Phone', accessor: (p: Person) => p.phone },
    { header: 'Email', accessor: (p: Person) => p.email },
    { header: 'City', accessor: (p: Person) => p.city },
    { header: 'Type', accessor: (p: Person) => p.personType.join(', ') },
    { header: 'Status', accessor: (p: Person) => p.status },
  ]

  const columns: Column<Person>[] = [
    { header: 'Name', accessor: (p) => <span className="font-medium text-slate-700">{p.name}</span>, sortable: true, sortKey: 'name' },
    { header: 'Phone', accessor: (p) => p.phone || '—' },
    { header: 'City', accessor: (p) => p.city || '—' },
    { header: 'Type', accessor: (p) => (
      <div className="flex flex-wrap gap-1">
        {p.personType.map((t) => <Badge key={t} color={typeColor(t)}>{t}</Badge>)}
      </div>
    ) },
    { header: 'Joined', accessor: (p) => formatDate(p.joinDate) },
    { header: 'Status', accessor: (p) => <Badge color={p.status === 'active' ? 'green' : 'slate'}>{p.status}</Badge> },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="People"
        subtitle={`${people.length} people in the temple community`}
        action={can('people:write') && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBulk(true)}><Upload size={16} /> Import CSV</Button>
            <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Person</Button>
          </div>
        )}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-2">
        <Button variant={typeFilter === '' ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter('')}>All</Button>
        {PERSON_TYPES.map((t) => (
          <Button key={t} variant={typeFilter === t ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter(typeFilter === t ? '' : t)}>
            {t}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchable
        searchPlaceholder="Search by name or phone..."
        exportFilename={`people-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(p) => p.personID}
        actions={(p) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => setViewPerson(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="View Profile"><Eye size={15} /></button>
            {can('people:write') && (
              <>
                <button onClick={() => setEditPerson(p)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm(`Delete ${p.name}?`)) deletePerson(p.personID) }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        )}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Person" wide>
        <PersonForm onDone={() => setShowAdd(false)} />
      </Modal>

      <BulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        title="Import People"
        description="Upload a CSV of people. Use the template to match columns exactly. Separate multiple roles/types with a semicolon (e.g. Donor;Volunteer)."
        columns={PERSON_IMPORT_COLUMNS}
        onImport={handleBulkImport}
        onImported={() => setShowBulk(false)}
      />

      <Modal open={!!editPerson} onClose={() => setEditPerson(null)} title="Edit Person" wide>
        {editPerson && <PersonForm initial={editPerson} onDone={() => setEditPerson(null)} />}
      </Modal>

      <Modal open={!!viewPerson} onClose={() => setViewPerson(null)} title="Person Profile" wide>
        {viewPerson && <PersonProfile p={viewPerson} donations={donations} expenses={expenses} onClose={() => setViewPerson(null)} />}
      </Modal>
    </div>
  )
}

function typeColor(t: string) {
  const map: Record<string, string> = {
    Donor: 'green',
    Devotee: 'orange',
    Volunteer: 'blue',
    Employee: 'blue',
    'Construction Worker': 'amber',
    Contractor: 'amber',
    'Vendor Contact': 'slate',
    'Committee Member': 'violet' as string,
  }
  return (map[t] || 'slate') as 'green' | 'orange' | 'blue' | 'amber' | 'violet' | 'slate'
}

function PersonForm({ initial, onDone }: { initial?: Partial<Person>; onDone: () => void }) {
  const { addPerson, updatePerson } = useApp()
  const [form, setForm] = useState<Partial<Person>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    personType: [],
    joinDate: new Date().toISOString().slice(0, 10),
    status: 'active',
    notes: '',
    ...initial,
  })
  const [error, setError] = useState('')

  const set = (k: keyof Person, v: never) => setForm((f) => ({ ...f, [k]: v }))

  const toggleType = (t: string) => {
    const cur = form.personType || []
    setForm((f) => ({
      ...f,
      personType: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim()) return setError('Name is required')
    if ((form.personType || []).length === 0) return setError('Select at least one person type')
    if (initial?.personID) {
      updatePerson({ ...(form as Person), personID: initial.personID })
    } else {
      addPerson(form as Omit<Person, 'personID'>)
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full Name" required><Input value={form.name} onChange={(e) => set('name', e.target.value as never)} placeholder="Full name" required /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value as never)} placeholder="Phone" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value as never)} placeholder="Email" /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value as never)} placeholder="City" /></Field>
      </div>
      <Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value as never)} placeholder="Address" /></Field>

      <Field label="Role / Type" required>
        <div className="flex flex-wrap gap-2">
          {PERSON_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                (form.personType || []).includes(t)
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Join Date">
          <Input type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value as never)} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>

      <Field label="Notes">
        <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value as never)} placeholder="Notes" />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit">{initial?.personID ? 'Save Changes' : 'Add Person'}</Button>
      </div>
    </form>
  )
}

function PersonProfile({ p, donations, expenses, onClose }: {
  p: Person
  donations: import('../types').Donation[]
  expenses: import('../types').Expense[]
  onClose: () => void
}) {
  const personDonations = donations.filter((d) => d.donorName.toLowerCase() === p.name.toLowerCase() || d.donorID === p.personID)
  const totalDonated = personDonations.reduce((s, d) => s + d.amount, 0)
  const personExpenses = expenses.filter((e) => e.vendorName.toLowerCase() === p.name.toLowerCase())

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-lg uppercase">
            {p.name.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{p.name}</p>
            <p className="text-xs text-slate-400">{p.personID}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {p.personType.map((t) => <Badge key={t} color={typeColor(t)}>{t}</Badge>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Info icon={<Phone size={14} />} label="Phone" value={p.phone || '—'} />
        <Info icon={<Mail size={14} />} label="Email" value={p.email || '—'} />
        <Info icon={<MapPin size={14} />} label="City" value={p.city || '—'} />
        <Info label="Joined" value={formatDate(p.joinDate)} />
      </div>
      {p.address && <Info label="Address" value={p.address} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1"><HandCoins size={14} /> Total Donations</div>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalDonated)}</p>
          <p className="text-xs text-emerald-600">{personDonations.length} donations</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-orange-600 mb-1"><Receipt size={14} /> Payments Received</div>
          <p className="text-xl font-bold text-orange-700">{formatCurrency(personExpenses.reduce((s, e) => s + e.amount, 0))}</p>
          <p className="text-xs text-orange-600">{personExpenses.length} expenses</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Donation History</p>
        {personDonations.length === 0 ? (
          <p className="text-sm text-slate-400">No donations recorded for this person.</p>
        ) : (
          <div className="space-y-2">
            {personDonations.slice(0, 10).map((d) => (
              <div key={d.donationID} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="text-slate-700 font-medium">{formatDate(d.date)}</span>
                  <span className="text-slate-400 ml-2">{d.category}</span>
                </div>
                <span className="font-semibold text-emerald-600">{formatCurrency(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {p.notes && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Notes</p>
          <p className="text-sm text-slate-600">{p.notes}</p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      <div className="min-w-0">
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className="text-slate-700 font-medium truncate">{value}</dd>
      </div>
    </div>
  )
}
