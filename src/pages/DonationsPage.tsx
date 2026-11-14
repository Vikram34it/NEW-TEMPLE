import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, Upload, Link2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Badge, PageHeader, Field, Input, Select } from '../components/ui'
import { BulkUploadModal, type ImportColumn } from '../components/BulkUploadModal'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { DonationForm } from '../components/forms/DonationForm'
import { ReceiptModal } from '../components/ReceiptModal'
import { formatCurrency, formatDate, normalizePhone, parseDateInput } from '../utils/helpers'
import { DONATION_CATEGORIES, PAYMENT_METHODS } from '../utils/constants'
import type { Donation, Person } from '../types'

const buildImportColumns = (donorNames: string[]): ImportColumn[] => [
  { header: 'Date', key: 'date', required: true, type: 'date', example: '31-12-2026' },
  { header: 'Donor Name', key: 'donorName', required: true, options: donorNames.length ? donorNames : undefined, example: donorNames[0] || 'Radha Krishna Das' },
  { header: 'Amount', key: 'amount', required: true, type: 'number', example: '5000' },
  { header: 'Phone', key: 'phone', example: '9845012345' },
  { header: 'Email', key: 'email', example: 'donor@example.com' },
  { header: 'Address', key: 'address', example: '12 Main Road, Bengaluru' },
  { header: 'Category', key: 'category', options: [...DONATION_CATEGORIES], example: DONATION_CATEGORIES[0] },
  { header: 'Purpose', key: 'purpose', example: 'Temple construction' },
  { header: 'Payment Method', key: 'paymentMethod', options: [...PAYMENT_METHODS], example: PAYMENT_METHODS[0] },
  { header: 'Transaction Reference', key: 'transactionReference', example: 'UPI1234567890' },
  { header: 'Received By', key: 'receivedBy', example: 'Temple Administrator' },
  { header: 'PAN Number', key: 'panNumber', example: 'ABCDE1234F' },
  { header: 'Aadhaar Number', key: 'aadhaarNumber', example: '123456789012' },
  { header: '80G Needed', key: 'need80G', options: ['Yes', 'No'], example: 'Yes' },
  { header: 'Notes', key: 'notes', example: '' },
]

export function DonationsPage() {
  const { donations, can, softDeleteDonation, bulkAddDonations, settings, people, updateDonation, linkDonorReceipts } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editDonation, setEditDonation] = useState<Donation | null>(null)
  const [viewDonation, setViewDonation] = useState<Donation | null>(null)
  const [receiptDonation, setReceiptDonation] = useState<Donation | null>(null)
  const [selectedIDs, setSelectedIDs] = useState<string[]>([])
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false)
  const [linkDonation, setLinkDonation] = useState<Donation | null>(null)
  const [linkFilter, setLinkFilter] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const donorProfiles = useMemo(() => new Map(
    people.map((person) => [person.personID, person]),
  ), [people])

  const donorNames = useMemo(() => {
    const names = new Set<string>()
    people.forEach((p) => { if (p.personType.includes('Donor') || p.name) names.add(p.name) })
    donations.forEach((d) => { if (d.donorName) names.add(d.donorName) })
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [people, donations])

  const importColumns = useMemo(() => buildImportColumns(donorNames), [donorNames])

  const handleBulkImport = async (rows: Array<Record<string, unknown>>): Promise<string | null> => {
    const items = rows.map((r) => ({
      date: parseDateInput(String(r.date || '')) || new Date().toISOString().slice(0, 10),
      donorID: (r.donorID as string) || '',
      donorName: (r.donorName as string) || 'Unknown',
      phone: (r.phone as string) || '',
      email: (r.email as string) || '',
      address: (r.address as string) || '',
      amount: Number(r.amount) || 0,
      category: (r.category as string) || 'General Donation',
      purpose: (r.purpose as string) || '',
      paymentMethod: (r.paymentMethod as string) || 'Cash',
      transactionReference: (r.transactionReference as string) || '',
      receivedBy: (r.receivedBy as string) || '',
      receiptNumber: '',
      panNumber: (r.panNumber as string) || undefined,
      aadhaarNumber: (r.aadhaarNumber as string) || undefined,
      need80G: /^(yes|true)$/i.test(String(r.need80G || '')),
      notes: (r.notes as string) || '',
    }))
    try {
      await bulkAddDonations(items)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to import donations'
    }
  }

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      if (linkFilter && donorProfiles.has(d.donorID) !== (linkFilter === 'linked')) return false
      if (categoryFilter && d.category !== categoryFilter) return false
      if (methodFilter && d.paymentMethod !== methodFilter) return false
      if (dateFrom && d.date < dateFrom) return false
      if (dateTo && d.date > dateTo) return false
      return true
    })
  }, [donations, donorProfiles, linkFilter, categoryFilter, methodFilter, dateFrom, dateTo])

  const total = filtered.reduce((s, d) => s + d.amount, 0)

  const handleDelete = (d: Donation) => {
    if (confirm(`Mark donation ${d.donationID} as cancelled?`)) {
      void softDeleteDonation(d.donationID).catch(() => {})
    }
  }

  const exportColumns = [
    { header: 'Date', accessor: (d: Donation) => d.date },
    { header: 'Donor', accessor: (d: Donation) => d.donorName },
    { header: 'Amount', accessor: (d: Donation) => d.amount },
    { header: 'Category', accessor: (d: Donation) => d.category },
    { header: 'Method', accessor: (d: Donation) => d.paymentMethod },
    { header: 'Ref', accessor: (d: Donation) => d.transactionReference },
    { header: 'Receipt', accessor: (d: Donation) => d.receiptNumber },
    { header: 'PAN', accessor: (d: Donation) => d.panNumber || '' },
    { header: '80G', accessor: (d: Donation) => (d.need80G ? 'Yes' : 'No') },
    { header: 'Received By', accessor: (d: Donation) => d.receivedBy },
  ]

  const selectedReceipts = donations.filter((d) => selectedIDs.includes(d.donationID) && !d.deleted && !d.donorID && !d.installmentPlanID)
  const columns: Column<Donation>[] = [
    ...(can('donations:write') ? [{
      header: 'Select',
      accessor: (d: Donation) => !d.deleted && !d.donorID && !d.installmentPlanID && (
        <input type="checkbox" aria-label={'Select receipt ' + (d.receiptNumber || d.donationID)}
          checked={selectedIDs.includes(d.donationID)} onChange={(event) => {
            const checked = event.target.checked
            setSelectedIDs((ids) => checked ? [...ids, d.donationID] : ids.filter((id) => id !== d.donationID))
          }} />
      ),
    }] : []),
    { header: 'Date', accessor: (d) => formatDate(d.date), sortable: true, sortKey: 'date', exportValue: (d) => d.date },
    { header: 'Donor', accessor: (d) => <span className="font-medium text-slate-700">{d.donorName}</span>, sortable: true, sortKey: 'donorName' },
    { header: 'Phone', accessor: (d) => d.phone || '—' },
    { header: 'Amount', accessor: (d) => <span className="font-semibold text-emerald-600">{formatCurrency(d.amount)}</span>, sortable: true, sortKey: 'amount', exportValue: (d) => d.amount },
    { header: 'Category', accessor: (d) => <Badge color="blue">{d.category}</Badge>, sortable: true, sortKey: 'category' },
    { header: 'Method', accessor: (d) => d.paymentMethod },
    { header: 'Receipt', accessor: (d) => d.receiptNumber },
    { header: 'PAN', accessor: (d) => d.panNumber || '—' },
    { header: '80G', accessor: (d) => (d.need80G ? <Badge color="green">Yes</Badge> : 'No') },
    { header: 'Received By', accessor: (d) => d.receivedBy },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Donations"
        subtitle={`Total (filtered): ${formatCurrency(total)} • ${filtered.length} records`}
        action={
          can('donations:write') && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowBulk(true)}><Upload size={16} /> Import CSV</Button>
              <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Donation</Button>
            </div>
          )
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Field label="Donor link">
          <Select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)}>
            <option value="">All donations</option>
            <option value="unlinked">Unlinked</option>
            <option value="linked">Linked</option>
          </Select>
        </Field>
        <Field label="Category">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All</option>
            {DONATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <Button variant="secondary" size="md" className="w-full" onClick={() => { setLinkFilter(''); setCategoryFilter(''); setMethodFilter(''); setDateFrom(''); setDateTo('') }}>
            Reset
          </Button>
        </div>
      </div>

      <DataTable
        toolbar={can('donations:write') && selectedReceipts.length > 0 && (
          <>
            <Button size="sm" onClick={() => setBulkLinkOpen(true)}>Link selected ({selectedReceipts.length})</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIDs([])}>Clear selection</Button>
          </>
        )}
        columns={columns}
        data={filtered}
        searchable
        searchPlaceholder="Search donations..."
        exportFilename={`donations-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(d) => d.donationID}
        actions={(d) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => setViewDonation(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="View"><Eye size={15} /></button>
            {can('donations:write') && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setLinkDonation(d)}>
                  <Link2 size={14} /> {donorProfiles.has(d.donorID) ? 'Change donor' : 'Link donor'}
                </Button>
                <button onClick={() => setEditDonation(d)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        )}
      />

      <Modal open={bulkLinkOpen} onClose={() => setBulkLinkOpen(false)} title="Link selected donations" wide>
        {bulkLinkOpen && (
          <LinkDonorForm receipts={selectedReceipts} people={people} allowAnyPerson onSave={async (person) => {
            await linkDonorReceipts(selectedReceipts.map((d) => ({ donationID: d.donationID, donorID: person.personID })), true)
            setSelectedIDs([])
            setBulkLinkOpen(false)
          }} />
        )}
      </Modal>
      <Modal open={!!linkDonation} onClose={() => setLinkDonation(null)} title="Link donation to donor">
        {linkDonation && (
          <LinkDonorForm
            key={linkDonation.donationID}
            receipts={[linkDonation]}
            people={people}
            onSave={async (person) => {
              await updateDonation({
                donationID: linkDonation.donationID,
                donorID: person.personID,
                donorName: person.name,
                phone: String(person.phone || ''),
                email: person.email || '',
              })
              setLinkDonation(null)
            }}
          />
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Donation" wide>
        <DonationForm onDone={() => setShowAdd(false)} />
      </Modal>

      <BulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        title="Import Donations"
        description={`Upload a CSV of donations, then match the columns below. Date can be dd-mm-yyyy or yyyy-mm-dd. For dropdown columns (Donor Name, Category, Payment Method, 80G), use one of the listed values — the uploaded donor names are already on the list; paste a new one in the Donor Name column to add it.`}
        columns={importColumns}
        onImport={handleBulkImport}
        onImported={() => setShowBulk(false)}
      />

      <Modal open={!!editDonation} onClose={() => setEditDonation(null)} title="Edit Donation" wide>
        {editDonation && <DonationForm key={editDonation.donationID} initial={editDonation} onDone={() => setEditDonation(null)} />}
      </Modal>

      <Modal open={!!viewDonation} onClose={() => setViewDonation(null)} title="Donation Details">
        {viewDonation && (
          <DonationDetail
            d={viewDonation}
            onReceipt={() => {
              setReceiptDonation(viewDonation)
              setViewDonation(null)
            }}
          />
        )}
      </Modal>

      {receiptDonation && (
        <ReceiptModal donation={receiptDonation} settings={settings} onClose={() => setReceiptDonation(null)} />
      )}
    </div>
  )
}

function DonationDetail({ d, onReceipt }: { d: Donation; onReceipt: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-lg font-bold text-slate-800">{d.donorName}</p>
          <p className="text-xs text-slate-400">Donor ID: {d.donorID || '—'}</p>
        </div>
        <Badge color="green">{d.category}</Badge>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 text-center">
        <p className="text-xs text-slate-500">Donation Amount</p>
        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(d.amount)}</p>
        <p className="text-xs text-slate-400 mt-1">Receipt: {d.receiptNumber}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Date" value={formatDate(d.date)} />
        <Info label="Payment Method" value={d.paymentMethod} />
        <Info label="Transaction Ref" value={d.transactionReference || '—'} />
        <Info label="Received By" value={d.receivedBy} />
        <Info label="Phone" value={d.phone || '—'} />
        <Info label="Email" value={d.email || '—'} />
        <Info label="Purpose" value={d.purpose || '—'} />
        <Info label="Address" value={d.address || '—'} />
      </dl>
      {d.notes && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-600">{d.notes}</p>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={onReceipt}>Print Receipt</Button>
      </div>
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


function LinkDonorForm({ receipts, people, onSave, allowAnyPerson = false }: {
  receipts: Donation[]
  allowAnyPerson?: boolean
  people: Person[]
  onSave: (person: Person) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Person | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const donors = people.filter((person) => allowAnyPerson || person.personType.includes('Donor'))
  const donation = receipts.length === 1 ? receipts[0] : undefined
  const phoneOf = (value: unknown) => normalizePhone(String(value || ''))
  const recordedPhone = phoneOf(donation?.phone)
  const recordedName = String(donation?.donorName || '').trim().toLowerCase()
  const search = query.trim().toLowerCase()
  const phoneSearch = search && /^[+0-9 ()-]+$/.test(search) ? phoneOf(search) : ''
  const matches = donors.filter((person) => !search
    || person.name.toLowerCase().includes(search)
    || String(person.email || '').toLowerCase().includes(search)
    || (phoneSearch && phoneOf(person.phone).includes(phoneSearch)))
  const rank = (person: Person) => {
    if (recordedPhone && phoneOf(person.phone) === recordedPhone) return 0
    return person.name.trim().toLowerCase() === recordedName ? 1 : 2
  }
  matches.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))

  return (
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault()
      if (!selected || !receipts.length) return
      setError('')
      setSaving(true)
      try {
        await onSave(selected)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not link this donation.')
      } finally {
        setSaving(false)
      }
    }}>
      <p className="text-sm font-medium">{receipts.length} selected · {formatCurrency(receipts.reduce((sum, receipt) => sum + receipt.amount, 0))}</p>
      <ul className="max-h-28 overflow-auto text-sm text-slate-700">
        {receipts.map((receipt) => <li key={receipt.donationID}>{receipt.receiptNumber || receipt.donationID} · {receipt.donorName} · {formatDate(receipt.date)} · {formatCurrency(receipt.amount)}</li>)}
      </ul>
      <Field label={allowAnyPerson ? 'Find a person or donor' : 'Find a donor'} hint="Verify the donor’s mobile number before linking. The link can make this donation visible in My Donations.">
        <Input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder="Search name, mobile number or email" disabled={saving} />
      </Field>
      <fieldset className="max-h-64 space-y-2 overflow-auto" disabled={saving}>
        <legend className="sr-only">Donor profiles</legend>
        {matches.slice(0, 20).map((person) => (
          <label key={person.personID} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-2 text-sm">
            <input type="radio" name="donor" className="mt-1" checked={selected?.personID === person.personID} onChange={() => setSelected(person)} />
            <span>
              <strong>{person.name}</strong>
              <span className="block text-slate-600">{[person.phone, person.email].filter(Boolean).join(' · ') || 'No contact details'}</span>
              {rank(person) === 0 && <span className="text-xs text-slate-600">Matches the donation’s mobile number</span>}
              {rank(person) === 1 && <span className="text-xs text-slate-600">Matches the recorded name</span>}
            </span>
          </label>
        ))}
        {!matches.length && <p className="text-sm text-slate-600">No matching donor profiles. Try a different search or add the donor under <Link to="/people" className="underline">People</Link>.</p>}
      </fieldset>
      {matches.length > 20 && <p className="text-xs text-slate-600">Showing the first 20 matches. Search to narrow the list.</p>}
      {selected && <p className="text-sm text-slate-700">Selected: {selected.name}{selected.phone ? ' · ' + selected.phone : ' · No mobile number on profile'}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={!selected || !receipts.length || saving}>{saving ? 'Linking…' : receipts.length === 1 ? 'Link donation' : 'Link donations'}</Button>
    </form>
  )
}
