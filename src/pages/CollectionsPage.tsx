import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { DataTable, type Column } from '../components/DataTable'
import { Button, Card, Field, Input, Modal, PageHeader, Select } from '../components/ui'
import { CONFIG } from '../config/apiConfig'
import { useApp } from '../context/AppContext'
import { dataService } from '../services/apiService'
import type { CollectionDetails, CollectionDonor, CollectionEntry, CollectionPlan } from '../types'
import { formatCurrency, formatDate, formatDateTime, todayStr } from '../utils/helpers'

const sevas = ['Yudhisthra', 'Bhima', 'Arjuna', 'Nakula', 'Sahadeva']
const purposes = ['General Donation', 'Land Purchase', 'Temple Construction', 'Seva', 'Other']
const methods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque']
const amountPattern = /^[0-9]+$/

function emptyCollection(): CollectionDetails {
  return {
    donorID: '', name: '', phone: '', email: '', address: '', office: '', mailing: 'Residence',
    pan: '', aadhaar: '', gotram: '', prayer1: '', prayerDate1: '', prayer2: '', prayerDate2: '', referrals: '',
    seva: '', category: 'General Donation', kind: 'one-time',
    planID: '', date: todayStr(), method: 'Cash', reference: '', item: '', unit: '', delivery: 'Promised', site: '',
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'The request failed. Try again.'
}

function summary(details: CollectionDetails) {
  return details.kind === 'materials'
    ? [details.quantity, details.unit, details.item, '·', details.delivery].join(' ')
    : formatCurrency(Number(details.amount)) + ' · ' + details.method + (details.kind === 'installment' ? ' · Installment' : '')
}

export function CollectionsPage() {
  if (CONFIG.useMockData) return <PageHeader title="Collections" subtitle="Connect the Apps Script backend to record collections." />
  return <LiveCollectionsPage />
}

const statusColors: Record<CollectionEntry['status'], string> = {
  'Pending review': 'bg-amber-50 text-amber-900',
  'Needs correction': 'bg-rose-50 text-rose-900',
  Approved: 'bg-emerald-50 text-emerald-900',
  Rejected: 'bg-slate-100 text-slate-700',
}

function CollectionTable({ rows, admin = false, actions }: {
  rows: CollectionEntry[]
  admin?: boolean
  actions: (row: CollectionEntry) => ReactNode
}) {
  const columns: Column<CollectionEntry>[] = [
    { header: 'Collection date', accessor: ({ details, id }) => (
      <><div>{formatDate(details.date)}</div><div className="text-xs text-slate-500">{id.slice(0, 12)}</div></>
    ), className: 'whitespace-nowrap' },
    { header: 'Donor', accessor: ({ details }) => <span className="font-medium">{details.name}</span> },
    { header: 'Purpose / Seva', accessor: ({ details }) => (
      <><div>{details.category || '—'}</div><div className="text-xs text-slate-500">{details.seva}</div></>
    ) },
    { header: 'Amount / Materials', accessor: ({ details }) => (
      details.kind === 'materials'
        ? <><div>{details.quantity} {details.unit} {details.item}</div><div className="text-xs text-slate-500">{details.delivery}</div></>
        : <><div className="whitespace-nowrap font-medium tabular-nums">{formatCurrency(Number(details.amount))}</div>
          <div className="text-xs text-slate-500">{details.kind === 'installment' ? 'Installment' : 'One-time'} · {details.method}</div>
          {details.committedAmount && <div className="text-xs text-slate-500">{formatCurrency(Number(details.committedAmount))} pledged</div>}</>
    ) },
    { header: 'Reference', accessor: ({ details, donationID }) => (
      <><div className="break-all">{details.reference || '—'}</div>{donationID && <div className="text-xs text-slate-500">{donationID}</div>}</>
    ) },
    { header: 'Status', accessor: (row) => (
      <><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${statusColors[row.status]}`}>{row.status}</span>
        {row.handover && <div className="mt-1 text-xs text-slate-500">Handed over to {row.handover.account}</div>}
        {row.status === 'Approved' && row.details.kind !== 'materials' && row.details.method === 'Cash' && !row.handover && (
          <div className="mt-1 text-xs text-slate-500">Awaiting handover</div>
        )}</>
    ) },
    { header: 'Review note', accessor: ({ note }) => note ? <span className="line-clamp-2 min-w-24 max-w-52 break-words">{note}</span> : '—' },
  ]
  if (admin) columns.splice(2, 0, { header: 'Collector', accessor: 'collector' })

  return <DataTable columns={columns} data={rows} rowKey={(row) => row.id} actions={actions}
    toolbar={<p className="text-xs text-slate-500">{rows.length} {rows.length === 1 ? 'submission' : 'submissions'}</p>} />
}

function LiveCollectionsPage() {
  const { user } = useApp()
  const [rows, setRows] = useState<CollectionEntry[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CollectionEntry | null>(null)
  const [filter, setFilter] = useState<CollectionEntry['status'] | 'all'>('all')
  const [selected, setSelected] = useState<CollectionEntry | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await dataService.getCollections(true))
    } catch (err) {
      const message = errorText(err)
      setError(message === 'Permission denied'
        ? 'The server denied access to Collections. Ask your admin to check the Collector role and Apps Script deployment.'
        : message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const statuses = [
    { label: 'Pending review', status: 'Pending review', color: 'bg-amber-50 text-amber-900' },
    { label: 'Needs correction', status: 'Needs correction', color: 'bg-rose-50 text-rose-900' },
    { label: 'Approved', status: 'Approved', color: 'bg-emerald-50 text-emerald-900' },
  ] as const
  const filtered = filter === 'all' ? rows : rows.filter((row) => row.status === filter)

  function openCollection(entry: CollectionEntry | null = null) {
    setMessage('')
    setEditing(entry)
    setFormOpen(true)
    requestAnimationFrame(() => document.getElementById('collection-entry')?.scrollIntoView({ block: 'start' }))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl bg-orange-950 p-5 text-white sm:p-7">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="mt-1 text-sm text-orange-100">Hare Krishna, {user?.name}. Record donations and materials from your visits.</p>
        <Button className="mt-5 w-full sm:w-auto" disabled={formOpen} onClick={() => openCollection()}>
          <Plus size={18} /> New collection
        </Button>
      </section>

      {message && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800" role="status">{message}</p>}

      {formOpen && (
        <div id="collection-entry" className="mx-auto max-w-3xl scroll-mt-4">
          <CollectionForm entry={editing} representative={user?.name || ''} onCancel={() => setFormOpen(false)} onSaved={async (id) => {
            setFormOpen(false)
            setMessage('Submitted for approval · ' + id.slice(0, 12))
            setFilter('all')
            await load()
          }} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Filter collections by status">
        {statuses.map(({ label, status, color }) => (
          <button key={status} type="button" aria-pressed={filter === status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-4 ${color} ${filter === status ? 'ring-2 ring-current' : ''}`}>
            <span className="block text-xl font-semibold tabular-nums">
              {loading || error ? '—' : rows.filter((row) => row.status === status).length}
            </span>
            <span className="block text-xs font-medium sm:text-sm">{label}</span>
          </button>
        ))}
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{filter === 'all' ? 'My Collections' : filter}</h2>
          <Button variant="secondary" disabled={loading} onClick={load}>Refresh</Button>
        </div>
        {filter !== 'all' && <button type="button" className="text-sm font-medium text-orange-700" onClick={() => setFilter('all')}>Show all statuses</button>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="text-sm text-slate-500">Loading collections…</p>}
        {!loading && !filtered.length && !error && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            {filter === 'all' ? (
              <>
                <p className="font-medium text-slate-800">No collections submitted yet</p>
                <p className="mt-1">Start by finding or enrolling the donor.</p>
                {!formOpen && <Button className="mt-3 w-full sm:w-auto" onClick={() => openCollection()}>
                  <Plus size={18} /> Record your first collection
                </Button>}
              </>
            ) : <p>No collections with this status.</p>}
          </div>
        )}
        {filtered.length > 0 && <CollectionTable key={filter} rows={filtered} actions={(row) => (
          <Button variant="secondary" onClick={() => setSelected(row)}>View</Button>
        )} />}
      </Card>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Collection details" wide>
        {selected && (
          <div className="space-y-4">
            <CollectionRecordDetails row={selected} />
            {selected.status === 'Needs correction' && <Button disabled={formOpen} onClick={() => {
              openCollection(selected)
              setSelected(null)
            }}>Correct submission</Button>}
          </div>
        )}
      </Modal>
    </div>
  )
}

function CollectionForm({ entry, representative, onCancel, onSaved }: {
  entry: CollectionEntry | null
  representative: string
  onCancel: () => void
  onSaved: (id: string) => Promise<void>
}) {
  const [data, setData] = useState<CollectionDetails>(() => {
    if (!entry) return emptyCollection()
    const details = { ...entry.details }
    if (!details.donorID) { details.aadhaar = ''; details.pan = '' }
    return details
  })
  const [id] = useState(() => entry?.id || 'COL-' + crypto.randomUUID())
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollectionDonor[]>([])
  const [plans, setPlans] = useState<CollectionPlan[]>([])
  const [enrolling, setEnrolling] = useState(Boolean(entry && !entry.details.donorID))
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const donorSelected = Boolean(data.donorID)
  const plan = plans.find((item) => item.id === data.planID)

  useEffect(() => {
    setPlans([])
    if (!data.donorID) return
    let current = true
    dataService.getCollectionPlans(data.donorID).then((items) => {
      if (current) setPlans(items)
    }).catch((err) => { if (current) setError(errorText(err)) })
    return () => { current = false }
  }, [data.donorID])

  function change(key: keyof CollectionDetails, value: string) {
    setData((previous) => ({ ...previous, [key]: value }))
  }

  function field(label: string, key: keyof CollectionDetails, options: React.ComponentProps<typeof Input> = {}) {
    return <Field label={label} required={options.required}><Input {...options} value={data[key] ?? ''} onChange={(e) => change(key, e.target.value)} /></Field>
  }

  async function search() {
    setError('')
    setBusy(true)
    try {
      setResults(await dataService.findCollectionDonors(query))
      setSearched(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const amount = String(data.amount ?? '').trim()
    const committedAmount = (data.committedAmount ?? '').trim()
    if (data.kind !== 'materials' && (!amountPattern.test(amount) || Number(amount) <= 0)) {
      setError('Enter the amount received in whole rupees, such as 10000.')
      return
    }
    if (data.kind === 'installment' && !data.planID && (!amountPattern.test(committedAmount) || Number(committedAmount) <= 0)) {
      setError('Enter the total pledge in whole rupees, such as 100000.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await dataService.submitCollection(id, { ...data, amount, committedAmount })
      await onSaved(id)
    } catch (err) {
      const message = errorText(err)
      setError(message === 'Complete the donor enrollment details, including the signature name and date.'
        ? 'The server is running an older version. Deploy the updated Apps Script version and retry.'
        : message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <form id="collection-form" className="space-y-5" onSubmit={submit}>
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{entry ? 'Correct collection' : 'Find donor'}</h2>
            <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button>
          </div>
          {entry?.note && <p className="rounded-lg bg-amber-50 p-3 text-sm">{entry.note}</p>}
          {donorSelected ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
              <span className="font-medium">{data.name}</span>
              <Button type="button" variant="secondary" onClick={() => {
                setData({ ...data, donorID: '', name: '', planID: '', kind: 'one-time' })
                setEnrolling(false)
              }}>Change donor</Button>
            </div>
          ) : (
            <>
              <Field label="Donor name or full mobile number">
                <div className="flex gap-2">
                  <Input value={query} onChange={(e) => { setQuery(e.target.value); setResults([]); setSearched(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!busy && query.trim().length >= 3) void search() } }} />
                  <Button type="button" variant="secondary" disabled={busy || query.trim().length < 3} onClick={search}>Search</Button>
                </div>
              </Field>
              {searched && !results.length && <p className="text-sm text-slate-500">No matching donor found.</p>}
              {results.map((result) => (
                <button key={result.id} type="button" className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-orange-50"
                  onClick={() => { setData({ ...data, donorID: result.id, name: result.name, planID: '' }); setEnrolling(false) }}>
                  {result.name} {result.phoneEnd && <span className="text-slate-500">· mobile ending {result.phoneEnd}</span>}
                </button>
              ))}
              {!enrolling && <Button type="button" variant="secondary" onClick={() => setEnrolling(true)}>Enroll a new donor</Button>}
            </>
          )}
          {enrolling && !donorSelected && (
            <div className="grid gap-3 sm:grid-cols-2">
              {field('Full name', 'name', { required: true, maxLength: 150 })}
              {field('Mobile number', 'phone', { required: true, type: 'tel', maxLength: 30, placeholder: '10-digit Indian mobile number' })}
              {field('Email', 'email', { type: 'email', maxLength: 254 })}
              {field('Residential address', 'address', { required: true, maxLength: 600 })}
              {field('Office address', 'office', { required: data.mailing === 'Office', maxLength: 600 })}
              <Field label="Preferred mailing address" required>
                <Select value={data.mailing} onChange={(e) => change('mailing', e.target.value)}><option>Residence</option><option>Office</option></Select>
              </Field>
              {field('Aadhaar number', 'aadhaar', { required: true, type: 'password', inputMode: 'numeric', pattern: '[0-9]{12}', maxLength: 12, autoComplete: 'off' })}
              {field('PAN', 'pan', { required: true, type: 'password', pattern: '[A-Za-z]{5}[0-9]{4}[A-Za-z]', maxLength: 10, autoComplete: 'off' })}
              <details className="space-y-3 sm:col-span-2">
                <summary className="cursor-pointer font-medium">Prayer occasions and referrals</summary>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('Gotram', 'gotram', { maxLength: 100 })}
                  {field('Referrals (name, address and phone)', 'referrals', { maxLength: 1000 })}
                  {field('Prayer occasion or name', 'prayer1', { maxLength: 150 })}
                  {field('Prayer date', 'prayerDate1', { type: 'date' })}
                  {field('Second prayer occasion or name', 'prayer2', { maxLength: 150 })}
                  {field('Second prayer date', 'prayerDate2', { type: 'date' })}
                </div>
              </details>
            </div>
          )}
        </section>

        {(donorSelected || enrolling) && (
          <section className="space-y-3 border-t border-slate-200 pt-4">
            <h2 className="font-semibold">Contribution</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contribution type" required>
                <Select value={data.kind} onChange={(e) => setData({ ...data, kind: e.target.value as CollectionDetails['kind'], planID: '', ...(e.target.value === 'materials' ? { category: 'Temple Construction' } : {}) })}>
                  <option value="one-time">One-time payment</option>
                  <option value="installment">Installment payment</option>
                  <option value="materials">Construction materials</option>
                </Select>
              </Field>
              <Field label="Seva" required>
                <Select required value={data.seva} onChange={(e) => change('seva', e.target.value)}>
                  <option value="">Select seva</option>{sevas.map((seva) => <option key={seva}>{seva}</option>)}
                </Select>
              </Field>
              <Field label="Purpose" required>
                <Select value={data.category} onChange={(e) => change('category', e.target.value)}>{purposes.map((purpose) => <option key={purpose}>{purpose}</option>)}</Select>
              </Field>
              {field('Collection date', 'date', { required: true, type: 'date' })}
              {data.kind === 'installment' && (
                <div className="space-y-2 sm:col-span-2">
                  <Field label="Commitment" required>
                    <Select value={data.planID} onChange={(e) => change('planID', e.target.value)}>
                      <option value="">Set up a new commitment</option>
                      {plans.filter((item) => item.outstanding > 0).map((item) => <option key={item.id} value={item.id}>{item.purpose} · {formatCurrency(item.outstanding)} outstanding</option>)}
                    </Select>
                  </Field>
                  {!data.planID && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {field('Total pledged (₹)', 'committedAmount', { required: true, inputMode: 'numeric', placeholder: '100000' })}
                      {field('Monthly installments', 'installmentCount', { required: true, type: 'number', min: 2, max: 120, step: 1 })}
                      {field('First installment due', 'firstDue', { required: true, type: 'date' })}
                      <p className="text-sm text-slate-600 sm:col-span-3">
                        The plan and payment will be recorded after admin approval. Enter only the amount you received today below.
                      </p>
                    </div>
                  )}
                  {plan && <p className="text-sm text-slate-600">Committed {formatCurrency(plan.committed)} · Next due {plan.nextDue || '—'} · Balance after approval {formatCurrency(Math.max(0, plan.outstanding - Number(data.amount || 0)))}</p>}
                </div>
              )}
              {data.kind === 'materials' ? (
                <>
                  {field('Item', 'item', { required: true, maxLength: 150 })}
                  {field('Quantity', 'quantity', { required: true, type: 'number', step: 'any' })}
                  {field('Unit', 'unit', { required: true, maxLength: 40, placeholder: 'bags, kg, pieces' })}
                  <Field label="Delivery status" required>
                    <Select value={data.delivery} onChange={(e) => change('delivery', e.target.value)}><option>Promised</option><option>Delivered</option></Select>
                  </Field>
                  {data.delivery === 'Delivered' && field('Delivery site', 'site', { required: true, maxLength: 150 })}
                </>
              ) : (
                <>
                  {field(data.kind === 'installment' ? 'Received today (₹)' : 'Amount received (₹)', 'amount',
                    { required: true, inputMode: 'numeric', placeholder: '10000' })}
                  <Field label="Payment method" required>
                    <Select value={data.method} onChange={(e) => change('method', e.target.value)}>{methods.map((method) => <option key={method}>{method}</option>)}</Select>
                  </Field>
                  {data.method !== 'Cash' && field('Payment reference', 'reference', { required: true, maxLength: 120 })}
                </>
              )}
            </div>
            <p className="text-sm text-slate-600">ISKCON representative · {representative}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Submit for approval'}</Button>
            </div>
          </section>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>
    </Card>
  )
}

export function CollectionReview() {
  const [opened, setOpened] = useState(false)
  const [view, setView] = useState<'pending' | 'cash' | 'materials' | 'all'>('pending')
  const [rows, setRows] = useState<CollectionEntry[]>([])
  const [selected, setSelected] = useState<CollectionEntry | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { donations, refreshCollectionsLedger } = useApp()

  async function load() {
    setError('')
    setLoading(true)
    try {
      setRows(await dataService.getCollections())
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  const filtered = rows.filter((row) => {
    if (view === 'pending') return row.status === 'Pending review'
    if (view === 'cash') return row.status === 'Approved' && row.details.kind !== 'materials' && row.details.method === 'Cash' && donations.some((donation) => donation.donationID === row.donationID)
    if (view === 'materials') return row.status === 'Approved' && row.details.kind === 'materials'
    return true
  })
  const cashByCollector = new Map<string, number>()
  for (const row of filtered) {
    if (view === 'cash' && !row.handover) cashByCollector.set(row.collector, (cashByCollector.get(row.collector) || 0) + Number(row.details.amount || 0))
  }
  const cashHeld = [...cashByCollector.values()].reduce((sum, amount) => sum + amount, 0)

  return (
    <Card className="space-y-3 p-4">
      <Button variant="secondary" onClick={() => {
        setOpened(!opened)
        if (!opened) void load()
      }}>{opened ? 'Hide collections' : 'Pending Collections'}</Button>
      {opened && (
        <>
          <div className="flex flex-wrap gap-2">
            <Select aria-label="Collections view" value={view} onChange={(e) => setView(e.target.value as typeof view)}>
              <option value="pending">Pending review</option>
              <option value="cash">Cash handovers</option>
              <option value="materials">Materials register</option>
              <option value="all">All submissions</option>
            </Select>
            <Button variant="secondary" disabled={loading} onClick={load}>Refresh</Button>
          </div>
          {view === 'cash' && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium">Cash with collectors · {formatCurrency(cashHeld)}</p>
              {[...cashByCollector].map(([name, amount]) => <p key={name} className="text-slate-600">{name} · {formatCurrency(amount)}</p>)}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {loading && <p className="text-sm text-slate-500">Loading collections…</p>}
          {!loading && !filtered.length && !error && <p className="text-sm text-slate-500">No collections in this view.</p>}
          {filtered.length > 0 && <CollectionTable key={view} rows={filtered} admin actions={(row) => (
            <Button variant="secondary" onClick={() => setSelected(row)}>{row.status === 'Pending review' ? 'Review' : 'View'}</Button>
          )} />}
        </>
      )}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Collection details" wide>
        {selected && <CollectionDecision key={selected.id} row={selected} onSaved={async () => {
          setSelected(null)
          await Promise.all([load(), refreshCollectionsLedger()])
        }} />}
      </Modal>
    </Card>
  )
}

function CollectionRecordDetails({ row }: { row: CollectionEntry }) {
  const data = row.details
  const materials = data.kind === 'materials'
  const cash = data.method === 'Cash'
  const details = [
    ['Donor', data.name], ['Mobile', data.phone], ['Email', data.email], ['Residential address', data.address],
    ['Office address', data.office], ['Mail to', data.mailing], ['PAN ending', data.pan ? data.pan.slice(-4) : ''],
    ['Aadhaar ending', data.aadhaar ? data.aadhaar.slice(-4) : ''], ['Gotram', data.gotram],
    ['Prayer occasion', [data.prayer1, data.prayerDate1].filter(Boolean).join(' · ')],
    ['Second prayer occasion', [data.prayer2, data.prayerDate2].filter(Boolean).join(' · ')], ['Referrals', data.referrals],
    ['Seva', data.seva], ['Purpose', data.category],
    ['Collection ID', row.id], ['Status', row.status], ['Submitted', formatDateTime(row.submittedAt)],
    ['Collected by', row.collector], ['Collection date', formatDate(data.date)], ['Contribution', summary(data)],
    ['Commitment', data.planID || (data.committedAmount ? 'New monthly commitment' : '')],
    ['Total pledged', data.committedAmount ? formatCurrency(Number(data.committedAmount)) : ''],
    ['Monthly installments', data.installmentCount], ['First installment due', data.firstDue],
    ['Payment reference', materials || cash ? '' : data.reference],
    ['Delivery site', materials ? data.site : ''], ['Delivery date', materials && data.delivery === 'Delivered' ? data.deliveredDate || data.date : ''],
    ['Receipt record', row.donationID], ['Review note', row.note], ['Handed over to', row.handover?.account],
    ['Handover date', row.handover?.date], ['Handover reference', row.handover?.reference],
  ]
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      {details.filter(([, value]) => value).map(([label, value]) => (
        <div key={label}><dt className="text-slate-500">{label}</dt><dd className="break-words font-medium">{value}</dd></div>
      ))}
    </dl>
  )
}

function CollectionDecision({ row, onSaved }: { row: CollectionEntry; onSaved: () => Promise<void> }) {
  const { accounts } = useApp()
  const data = row.details
  const pending = row.status === 'Pending review'
  const materials = data.kind === 'materials'
  const cash = !materials && data.method === 'Cash'
  const handover = cash && row.status === 'Approved' && !row.handover
  const receive = materials && row.status === 'Approved' && data.delivery === 'Promised'
  const [accountID, setAccountID] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr)
  const [reference, setReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const choices = accounts.filter((account) => account.type === 'bank' || (handover && account.type === 'cash' && account.accountName !== 'Cash with Collectors'))

  async function save(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await onSaved()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <CollectionRecordDetails row={row} />
      {((pending && !materials && !cash) || handover) && (
        <Field label={handover ? 'Destination account' : 'Bank account'} required>
          <Select value={accountID} onChange={(e) => { setAccountID(e.target.value); setConfirmed(false) }}>
            <option value="">Select account</option>
            {choices.map((account) => <option key={account.accountID} value={account.accountID}>{account.accountName}</option>)}
          </Select>
        </Field>
      )}
      {pending && !materials && !cash && <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I verified this reference and amount against the selected bank account.
      </label>}
      {pending && (
        <>
          <Field label="Review note" hint="Required when returning or rejecting a collection."><Input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || (!materials && !cash && (!accountID || !confirmed))} onClick={() => save(() => dataService.reviewCollection(row.id, 'Approved', note, accountID, confirmed))}>Approve</Button>
            <Button variant="secondary" disabled={busy || !note.trim()} onClick={() => save(() => dataService.reviewCollection(row.id, 'Needs correction', note, '', false))}>Return for correction</Button>
            <Button variant="secondary" disabled={busy || !note.trim()} onClick={() => save(() => dataService.reviewCollection(row.id, 'Rejected', note, '', false))}>Reject</Button>
          </div>
        </>
      )}
      {(handover || receive) && (
        <>
          <Field label={handover ? 'Handover date' : 'Delivery date'} required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={handover ? 'Handover or deposit reference' : 'Delivery site'} required><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          <Button disabled={busy || !date || !reference.trim() || (handover && !accountID)} onClick={() => save(() => handover
            ? dataService.recordCollectionHandover(row.id, accountID, choices.find((account) => account.accountID === accountID)?.type || '', date, reference)
            : dataService.receiveCollectionMaterials(row.id, date, reference))}>
            {handover ? 'Record handover' : 'Mark delivered'}
          </Button>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}

