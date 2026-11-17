import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { DataTable, type Column } from '../components/DataTable'
import { CollectionPhotoScan } from '../components/CollectionPhotoScan'
import { Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui'
import { CONFIG } from '../config/apiConfig'
import { useApp } from '../context/AppContext'
import { dataService } from '../services/apiService'
import type { CollectionDetails, CollectionDonor, CollectionEntry, CollectionPlan } from '../types'
import { formatCurrency, formatDate, formatDateTime, normalizePhone, parseDateInput, todayStr } from '../utils/helpers'

const sevas = ['Yudhisthra', 'Bhima', 'Arjuna', 'Nakula', 'Sahadeva']
const constructionPurpose = 'Temple Construction'
const methods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque']
const amountPattern = /^[0-9]+$/
const installmentAmountPattern = /^[0-9]+(?:\.[0-9]{1,2})?$/
const newCommitment = 'new'

function emptyCollection(): CollectionDetails {
  return {
    donorID: '', name: '', phone: '', email: '', address: '', office: '', mailing: 'Residence',
    pan: '', aadhaar: '', gotram: '', prayer1: '', prayerDate1: '', prayer2: '', prayerDate2: '', referrals: '',
    seva: '', category: constructionPurpose, kind: 'one-time',
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
  Cancelled: 'bg-slate-100 text-slate-700',
}

function CollectionTable({ rows, admin = false, history = false, actions }: {
  rows: CollectionEntry[]
  admin?: boolean
  history?: boolean
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
    { header: 'Contribution', accessor: ({ details }) => (
      details.kind === 'materials'
        ? <><div>{details.quantity} {details.unit} {details.item}</div><div className="text-xs text-slate-500">{details.delivery}</div></>
        : <><div className="whitespace-nowrap font-medium tabular-nums">{formatCurrency(Number(details.amount))}</div>
          <div className="text-xs text-slate-500">{details.kind === 'installment' ? 'Installment' : 'One-time'} · {details.method}</div>
          {details.committedAmount && <div className="text-xs text-slate-500">{formatCurrency(Number(details.committedAmount))} pledged</div>}</>
    ) },
    { header: 'Reference', accessor: ({ details, donationID }) => (
      <><div className="break-all">{details.reference || '—'}</div>{donationID && <div className="text-xs text-slate-500">{donationID}</div>}</>
    ) },
    { header: 'Installments paid / pending', accessor: ({ installment, details, status }) => installment ? (
      <div className="min-w-32 text-xs">
        <div className="font-medium">{installment.paidCount} paid · {installment.pendingCount} pending</div>
        {!admin && <div>{formatCurrency(installment.outstanding)} outstanding</div>}
        {installment.nextDue && <div className="text-slate-500">Due {formatDate(installment.nextDue)}</div>}
      </div>
    ) : details.kind === 'installment' ? (status === 'Pending review' ? 'Awaiting approval' : 'Unavailable') : '—' },
    { header: 'Status', accessor: (row) => (
      <><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${statusColors[row.status]}`}>{row.status}</span>
        {row.handover && <div className="mt-1 text-xs text-slate-500">Handed over to {row.handover.account}</div>}
        {row.status === 'Approved' && row.details.kind !== 'materials' && row.details.method === 'Cash' && !row.handover && (
          <div className="mt-1 text-xs text-slate-500">Awaiting handover</div>
        )}</>
    ) },
    { header: 'Review note', accessor: ({ note }) => note ? <span className="line-clamp-2 min-w-24 max-w-52 break-words">{note}</span> : '—' },
  ]
  if (admin) {
    const progressColumn = columns.findIndex((column) => column.header === 'Installments paid / pending')
    columns.splice(progressColumn + 1, 0, {
      header: 'Pending amount', accessor: ({ installment }) => installment ? formatCurrency(installment.outstanding) : '—',
      className: 'whitespace-nowrap tabular-nums',
    })
    columns.splice(2, 0, { header: 'Collector', accessor: 'collector' })
  }

  const visibleColumns = columns.filter((column) =>
    !(admin && ['Reference', 'Review note'].includes(column.header)) &&
    !(history && column.header === 'Installments paid / pending'))
  const searchableRows = rows.map((row) => ({
    ...row, donorName: row.details.name, paymentType: row.details.kind, collectionDate: row.details.date,
    paymentReference: row.details.reference,
  }))
  return <DataTable columns={visibleColumns} data={searchableRows} rowKey={(row) => row.id} actions={actions}
    searchable={!admin} searchPlaceholder="Search by donor, date, or reference"
    toolbar={<p className="text-xs text-slate-500">{rows.length} {rows.length === 1 ? 'submission' : 'submissions'}</p>} />
}

type CollectorView = 'all' | 'Pending review' | 'Needs correction' | 'Approved' | 'pending' | 'completed'

type CommitmentRow = {
  id: string
  donor: string
  purpose: string
  type: 'Installment commitment' | 'One-time donation' | 'Materials delivered'
  pledged: number
  received: number
  outstanding: number
  nextDue: string
  paidCount: number
  pendingCount: number
  collectors: Set<string>
  entry: CollectionEntry
}

function collectionOverview(rows: CollectionEntry[]) {
  const history = rows.filter((row) => row.status === 'Approved')
    .sort((first, second) => second.details.date.localeCompare(first.details.date) ||
      second.submittedAt.localeCompare(first.submittedAt))
  const commitments = new Map<string, CommitmentRow>()
  const settledCollections: CommitmentRow[] = []
  let collectedPaise = 0
  for (const entry of history) {
    const { details, installment } = entry
    if (details.kind !== 'materials') collectedPaise += Math.round(Number(details.amount || 0) * 100)
    const existing = installment && commitments.get(installment.id)
    if (existing) existing.collectors.add(entry.collector)
    if (installment && !existing) {
      commitments.set(installment.id, {
        id: installment.id, donor: details.name, purpose: installment.purpose,
        type: 'Installment commitment', pledged: installment.committed, received: installment.received,
        outstanding: installment.outstanding, nextDue: installment.nextDue,
        paidCount: installment.paidCount, pendingCount: installment.pendingCount,
        collectors: new Set([entry.collector]), entry,
      })
    }
    if (details.kind === 'one-time' || (details.kind === 'materials' && details.delivery === 'Delivered')) {
      const materials = details.kind === 'materials'
      settledCollections.push({
        id: entry.id, donor: details.name, purpose: materials ? summary(details) : details.category,
        type: materials ? 'Materials delivered' : 'One-time donation',
        pledged: 0, received: Number(details.amount || 0), outstanding: 0, nextDue: '',
        paidCount: 0, pendingCount: 0, collectors: new Set([entry.collector]), entry,
      })
    }
  }
  const plans = [...commitments.values()]
  const pending = plans.filter((plan) => plan.outstanding > 0).sort((first, second) =>
    (first.nextDue || '9999').localeCompare(second.nextDue || '9999') || first.donor.localeCompare(second.donor))
  const completed = [...plans.filter((plan) => plan.outstanding === 0), ...settledCollections]
    .sort((first, second) => second.entry.details.date.localeCompare(first.entry.details.date))
  const totals = plans.reduce((sum, plan) => ({
    pledged: sum.pledged + Math.round(plan.pledged * 100),
    received: sum.received + Math.round(plan.received * 100),
    outstanding: sum.outstanding + Math.round(plan.outstanding * 100),
  }), { pledged: 0, received: 0, outstanding: 0 })
  return { history, pending, completed, totals, collectedPaise }
}

function collectorKey(row: CollectionEntry) {
  return row.collectorID || row.collector
}

function collectorBreakdown(rows: CollectionEntry[], overview: ReturnType<typeof collectionOverview>) {
  const collectors = new Map<string, {
    id: string; name: string; pledged: number; outstanding: number; completed: number;
    completedCount: number; received: number; reviewCount: number; activity: number;
  }>()
  for (const row of rows) {
    const id = collectorKey(row)
    const collector = collectors.get(id) || {
      id, name: row.collector, pledged: 0, outstanding: 0, completed: 0,
      completedCount: 0, received: 0, reviewCount: 0, activity: 0,
    }
    collector.activity++
    if (row.status === 'Pending review') collector.reviewCount++
    if (row.status === 'Approved' && row.details.kind !== 'materials') {
      collector.received += Math.round(Number(row.details.amount || 0) * 100)
    }
    collectors.set(id, collector)
  }
  const origins = new Map<string, CollectionEntry>()
  for (const row of rows) {
    const planID = row.installment?.id
    if (!planID) continue
    const isOrigin = planID === 'PLAN-' + row.id
    if (!isOrigin && row.status !== 'Approved') continue
    const current = origins.get(planID)
    if (isOrigin || !current || (planID !== 'PLAN-' + current.id &&
        (row.submittedAt < current.submittedAt || (row.submittedAt === current.submittedAt && row.id < current.id)))) {
      origins.set(planID, row)
    }
  }
  const owners = new Map<string, string>()
  for (const plan of [...overview.pending, ...overview.completed]) {
    if (plan.type !== 'Installment commitment') continue
    const origin = origins.get(plan.id) || plan.entry
    const id = collectorKey(origin)
    const collector = collectors.get(id)!
    owners.set(plan.id, id)
    collector.pledged += Math.round(plan.pledged * 100)
    collector.outstanding += Math.round(plan.outstanding * 100)
    if (plan.outstanding === 0) {
      collector.completed += Math.round(plan.pledged * 100)
      collector.completedCount++
    }
  }
  return { owners, collectors: [...collectors.values()].sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name)) }
}

function CommitmentTable({ rows, pending, actions, admin = false }: {
  rows: CommitmentRow[]
  pending: boolean
  actions: (row: CommitmentRow) => ReactNode
  admin?: boolean
}) {
  const columns: Column<CommitmentRow>[] = [
    { header: 'Donor', accessor: 'donor', sortable: true },
    { header: 'Type', accessor: 'type' },
    { header: 'Purpose', accessor: 'purpose' },
    { header: 'Pledged', accessor: (row) => row.pledged ? formatCurrency(row.pledged) : '—', sortKey: 'pledged', sortable: true },
    { header: 'Received', accessor: (row) => row.type === 'Materials delivered' ? '—' : formatCurrency(row.received), sortKey: 'received', sortable: true },
    { header: 'Installments', accessor: (row) => row.type === 'Installment commitment' ? `${row.paidCount} paid / ${row.pendingCount} remaining` : '—' },
  ]
  if (admin) columns.splice(1, 0, {
    header: 'Collectors', accessor: (row) => [...row.collectors].filter(Boolean).join(', ') || '—',
  })
  if (pending) {
    columns.push(
      { header: 'Outstanding', accessor: (row) => formatCurrency(row.outstanding), sortKey: 'outstanding', sortable: true },
      { header: 'Next due', accessor: (row) => row.nextDue ? formatDate(row.nextDue) : '—', sortKey: 'nextDue', sortable: true },
    )
  }
  return <DataTable columns={columns} data={rows} rowKey={(row) => row.id} actions={actions} searchable={!admin}
    searchPlaceholder="Search by donor, purpose, or type" />
}

function LiveCollectionsPage() {
  const { user } = useApp()
  const [rows, setRows] = useState<CollectionEntry[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CollectionEntry | null>(null)
  const [paymentFor, setPaymentFor] = useState<CollectionEntry | null>(null)
  const [filter, setFilter] = useState<CollectorView>('pending')
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

  const overview = collectionOverview(rows)
  const views: { id: CollectorView; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending installments', count: overview.pending.length },
    { id: 'completed', label: 'Completed collections', count: overview.completed.length },
    { id: 'Approved', label: 'Approved history', count: overview.history.length },
    { id: 'Pending review', label: 'Pending review', count: rows.filter((row) => row.status === 'Pending review').length },
    { id: 'Needs correction', label: 'Needs correction', count: rows.filter((row) => row.status === 'Needs correction').length },
    { id: 'all', label: 'All submissions', count: rows.length },
  ]
  const title = views.find((view) => view.id === filter)?.label
  const commitmentRows = filter === 'pending' ? overview.pending : filter === 'completed' ? overview.completed : null
  const filtered = filter === 'Approved' ? overview.history : filter === 'all' ? rows : rows.filter((row) => row.status === filter)
  const metrics = [
    { label: 'Installment pledges', paise: overview.totals.pledged },
    { label: 'Paid toward pledges', paise: overview.totals.received },
    { label: 'Remaining to collect', paise: overview.totals.outstanding },
    { label: 'My approved collections', paise: overview.collectedPaise },
  ]

  function openCollection(entry: CollectionEntry | null = null, payment: CollectionEntry | null = null) {
    setMessage('')
    setEditing(entry)
    setPaymentFor(payment)
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

      <section aria-label="Collection totals" className="space-y-2">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(({ label, paise }) => (
            <Card key={label} className="p-3 sm:p-4">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 sm:text-2xl">{loading || error ? '—' : formatCurrency(paise / 100)}</p>
            </Card>
          ))}
        </div>
        <p className="text-xs text-slate-500">Pledge totals include all approved payments on commitments you’ve collected for. My approved collections totals only the payments you recorded.</p>
      </section>

      {formOpen && (
        <div id="collection-entry" className="mx-auto max-w-3xl scroll-mt-4">
          <CollectionForm entry={editing} paymentFor={paymentFor} representative={user?.name || ''} onCancel={() => setFormOpen(false)} onSaved={async (id) => {
            setFormOpen(false)
            setMessage('Submitted for approval · ' + id.slice(0, 12))
            setFilter('Pending review')
            await load()
          }} />
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Collection views">
        {views.map(({ id, label, count }) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${filter === id ? 'border-orange-700 bg-orange-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {label} <span className="tabular-nums">({loading || error ? '—' : count})</span>
          </button>
        ))}
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          <Button variant="secondary" disabled={loading} onClick={load}>Refresh</Button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="text-sm text-slate-500">Loading collections…</p>}
        {!loading && !(commitmentRows?.length ?? filtered.length) && !error && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            {filter === 'all' ? (
              <>
                <p className="font-medium text-slate-800">No collections submitted yet</p>
                <p className="mt-1">Start by finding or enrolling the donor.</p>
                {!formOpen && <Button className="mt-3 w-full sm:w-auto" onClick={() => openCollection()}>
                  <Plus size={18} /> Record your first collection
                </Button>}
              </>
            ) : <p>{filter === 'pending' ? 'No installments outstanding.' :
              filter === 'completed' ? 'No completed collections yet.' : 'No submissions in this view.'}</p>}
          </div>
        )}
        {!!commitmentRows?.length && <CommitmentTable key={filter} rows={commitmentRows} pending={filter === 'pending'} actions={(row) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSelected(row.entry)}>View</Button>
            {filter === 'pending' && <Button size="sm" disabled={formOpen} onClick={() => openCollection(null, row.entry)}>Record payment</Button>}
          </div>
        )} />}
        {!commitmentRows && filtered.length > 0 && <CollectionTable key={filter} rows={filtered} history={filter === 'Approved'} actions={(row) => (
          <Button variant="secondary" onClick={() => setSelected(row)}>View</Button>
        )} />}
      </Card>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Collection details" wide>
        {selected && (
          <div className="space-y-4">
            <CollectionRecordDetails row={selected} />
            {selected.status !== 'Cancelled' && <CollectionMessage row={selected} />}
            {selected.status === 'Approved' && selected.installment && selected.installment.outstanding > 0 && (
              <Button disabled={formOpen} onClick={() => {
                openCollection(null, selected)
                setSelected(null)
              }}>Record another installment payment</Button>
            )}
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

function CollectionForm({ entry, paymentFor, representative, onCancel, onSaved }: {
  entry: CollectionEntry | null
  paymentFor: CollectionEntry | null
  representative: string
  onCancel: () => void
  onSaved: (id: string) => Promise<void>
}) {
  const [data, setData] = useState<CollectionDetails>(() => {
    if (paymentFor) {
      const { donorID, name, planID, seva, category } = paymentFor.details
      return { ...emptyCollection(), donorID, name, planID, seva, category, kind: 'installment' }
    }
    if (!entry) return emptyCollection()
    const details = { ...entry.details }
    if (!details.donorID) { details.aadhaar = ''; details.pan = '' }
    return details
  })
  const [id] = useState(() => entry?.id || 'COL-' + crypto.randomUUID())
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollectionDonor[]>([])
  const [plans, setPlans] = useState<CollectionPlan[]>([])
  const [loadedDonorID, setLoadedDonorID] = useState('')
  const [enrolling, setEnrolling] = useState(Boolean(entry && !entry.details.donorID))
  const [scanNotice, setScanNotice] = useState('')
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const donorSelected = Boolean(data.donorID)
  const plansReady = !data.donorID || loadedDonorID === data.donorID
  const donorPlans = data.donorID && plansReady ? plans : []
  const plan = donorPlans.find((item) => item.id === data.planID)
  const openPlans = donorPlans.filter((item) => item.outstanding > 0 || item.id === data.planID)
  const existingCommitment = Boolean(data.planID && data.planID !== newCommitment)
  const startingCommitment = data.planID === newCommitment || (!data.planID && plansReady && !openPlans.length)
  const available = plan?.availableToRecord ?? plan?.outstanding ?? 0
  const amountReceived = Number(data.amount || 0)

  useEffect(() => {
    if (!data.donorID) return
    let current = true
    dataService.getCollectionPlans(data.donorID).then((items) => {
      if (current) {
        setPlans(items)
        setLoadedDonorID(data.donorID)
      }
    }).catch((err) => { if (current) setError(errorText(err)) })
    return () => { current = false }
  }, [data.donorID])

  function change(key: keyof CollectionDetails, value: string) {
    setData((previous) => ({ ...previous, [key]: value }))
  }

  function applyScan({ paperAmount, category: _scannedPurpose, ...draft }: Awaited<ReturnType<typeof dataService.scanCollectionForm>>) {
    if (draft.seva && !sevas.includes(draft.seva)) delete draft.seva
    if (draft.method && !methods.includes(draft.method)) delete draft.method
    if (draft.kind && !['one-time', 'installment', 'materials'].includes(draft.kind)) delete draft.kind
    if (draft.mailing && !['Residence', 'Office'].includes(draft.mailing)) delete draft.mailing
    if (draft.delivery && !['Promised', 'Delivered'].includes(draft.delivery)) delete draft.delivery
    for (const key of ['date', 'firstDue', 'prayerDate1', 'prayerDate2'] as const) {
      const date = parseDateInput(draft[key] || '')
      if (date) draft[key] = date
      else delete draft[key]
    }
    setData((previous) => previous.donorID ? previous : { ...previous, method: '', ...draft })
    if (draft.phone || draft.name) {
      setQuery(draft.phone || draft.name || '')
      setResults([])
      setSearched(false)
    }
    setEnrolling(true)
    setError('')
    setScanNotice((paperAmount ? 'Donation amount written on the form: ' + paperAmount + '. ' : '') +
      'Check the draft against the paper form. Enter Aadhaar and PAN manually for new donors, and verify the contribution type, date, amount and payment method.')
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
    const againstCommitment = data.kind === 'installment' && existingCommitment
    if (data.kind !== 'materials' && (!(againstCommitment ? installmentAmountPattern : amountPattern).test(amount) || Number(amount) <= 0)) {
      setError(againstCommitment ? 'Enter the amount received, with up to two decimal places.' : 'Enter the amount received in whole rupees, such as 10000.')
      return
    }
    if (data.kind === 'installment' && (!plansReady || (!startingCommitment && !plan))) {
      setError('Choose an existing commitment or explicitly start a new one.')
      return
    }
    if (data.kind === 'installment' && startingCommitment && (!amountPattern.test(committedAmount) || Number(committedAmount) <= 0)) {
      setError('Enter the total pledge in whole rupees, such as 100000.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await dataService.submitCollection(id, { ...data, planID: againstCommitment ? data.planID : '', amount, committedAmount })
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
          {!donorSelected && <CollectionPhotoScan disabled={busy} onScan={applyScan} />}
          {scanNotice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{scanNotice}</p>}
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
                <Select value={data.kind} onChange={(e) => setData({ ...data, kind: e.target.value as CollectionDetails['kind'], planID: '' })}>
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
              <Field label="Purpose of donation" hint={data.category === constructionPurpose
                ? 'All new collections are for temple construction only.'
                : 'Original purpose of this collection.'}>
                <Input value={data.category} readOnly />
              </Field>
              {field('Collection date', 'date', { required: true, type: 'date' })}
              {data.kind === 'installment' && (
                <div className="space-y-2 sm:col-span-2">
                  {!plansReady && <p className="text-sm text-slate-600">Checking existing commitments for this donor.</p>}
                  {plansReady && openPlans.length > 0 && (
                    <Field label="Which commitment is this payment for?" required>
                      <Select required value={data.planID} onChange={(e) => change('planID', e.target.value)}>
                        <option value="">Choose an existing commitment</option>
                        {openPlans.map((item) => <option key={item.id} value={item.id}>
                          {item.purpose} · {formatCurrency(item.outstanding)} outstanding
                        </option>)}
                        <option value={newCommitment}>Start a separate commitment</option>
                      </Select>
                    </Field>
                  )}
                  {startingCommitment && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {field('Total pledged (₹)', 'committedAmount', { required: true, inputMode: 'numeric', placeholder: '100000' })}
                      {field('Monthly installments', 'installmentCount', { required: true, type: 'number', min: 2, max: 120, step: 1 })}
                      {field('First installment due', 'firstDue', { required: true, type: 'date' })}
                      <p className="text-sm text-slate-600 sm:col-span-3">
                        The commitment becomes available for additional payments after the admin approves this submission.
                      </p>
                    </div>
                  )}
                  {plan && (
                    <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      <p>Committed <strong>{formatCurrency(plan.committed)}</strong> · Approved payments <strong>{formatCurrency(plan.received)}</strong></p>
                      <p>{plan.paidCount} installments fully paid · {plan.pendingCount} remaining
                        {plan.nextDue && <> · Next scheduled amount {formatCurrency(plan.nextAmount)} due {formatDate(plan.nextDue)}</>}
                      </p>
                      <p>Outstanding <strong>{formatCurrency(plan.outstanding)}</strong>
                        {!!plan.awaitingApproval && <> · Awaiting approval {formatCurrency(plan.awaitingApproval)}</>}
                      </p>
                      <p>Enter what you received on the collection date. Partial payments and payments ahead of schedule are applied to the earliest unpaid installments.</p>
                      {amountReceived > 0 && amountReceived <= available && (
                        <p>Projected balance after pending payments and this payment are approved <strong>{formatCurrency(available - amountReceived)}</strong></p>
                      )}
                      {amountReceived > available && <p className="text-amber-800">Available after pending submissions {formatCurrency(available)}. If this payment already has a linked bank receipt, the admin can reconcile it during approval.</p>}
                    </div>
                  )}
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
                  {field('Amount received (₹)', 'amount',
                    { required: true, inputMode: data.kind === 'installment' && existingCommitment ? 'decimal' : 'numeric', placeholder: '10000' })}
                  <Field label="Payment method" required>
                    <Select required value={data.method} onChange={(e) => change('method', e.target.value)}>
                      <option value="">Select payment method</option>
                      {methods.map((method) => <option key={method}>{method}</option>)}
                    </Select>
                  </Field>
                  {data.method && data.method !== 'Cash' && field('Payment reference', 'reference', { required: true, maxLength: 120 })}
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

export function CollectionReview({ dashboard = false }: { dashboard?: boolean }) {
  const [opened, setOpened] = useState(dashboard)
  const [view, setView] = useState<'pending' | 'approved' | 'installments' | 'completed' | 'corrections' | 'cash' | 'materials' | 'cancelled' | 'all'>(dashboard ? 'all' : 'pending')
  const [query, setQuery] = useState('')
  const [collectorID, setCollectorID] = useState<string | null>(null)
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

  useEffect(() => { if (dashboard) void load() }, [dashboard])

  const overview = collectionOverview(rows)
  const { collectors, owners } = collectorBreakdown(rows, overview)
  const activeCollector = collectors.find((collector) => collector.id === collectorID)
  const search = query.trim().toLowerCase()
  const matches = (row: CollectionEntry) => !search || [
    row.details.name, row.collector, row.details.reference, row.donationID, row.id,
    row.installment?.id, row.installment?.purpose, row.details.category,
  ].some((value) => String(value || '').toLowerCase().includes(search))
  const matchingCommitments = new Set(overview.history.filter(matches).flatMap((row) => [row.id, row.installment?.id]))
  const matchesCommitment = (row: CommitmentRow) => matchingCommitments.has(row.id) &&
    (!activeCollector || (owners.get(row.id) || collectorKey(row.entry)) === activeCollector.id)
  const commitmentRows = view === 'installments'
    ? overview.pending.filter(matchesCommitment)
    : view === 'completed' ? overview.completed.filter(matchesCommitment) : null
  const filtered = (view === 'approved' ? overview.history : rows).filter((row) => {
    if (!matches(row) || (activeCollector && collectorKey(row) !== activeCollector.id)) return false
    if (view === 'pending') return row.status === 'Pending review'
    if (view === 'corrections') return row.status === 'Needs correction'
    if (view === 'cancelled') return row.status === 'Cancelled'
    if (view === 'cash') return row.status === 'Approved' && row.details.kind !== 'materials' && row.details.method === 'Cash' && donations.some((donation) => donation.donationID === row.donationID)
    if (view === 'materials') return row.status === 'Approved' && row.details.kind === 'materials'
    return true
  })
  const cashByCollector = new Map<string, number>()
  for (const row of filtered) {
    if (view === 'cash' && !row.handover) cashByCollector.set(row.collector, (cashByCollector.get(row.collector) || 0) + Number(row.details.amount || 0))
  }
  const cashHeld = [...cashByCollector.values()].reduce((sum, amount) => sum + amount, 0)
  const collectorColumns: Column<(typeof collectors)[number]>[] = [
    { header: 'Collector', sortKey: 'name', sortable: true, accessor: (collector) => (
      <button type="button" className="text-left font-semibold text-orange-700 underline" onClick={() => {
        setCollectorID(collector.id)
        setQuery('')
        setView('all')
      }}>{collector.name || 'Unnamed collector'}</button>
    ) },
    { header: 'Pledged', accessor: (collector) => formatCurrency(collector.pledged / 100), sortKey: 'pledged', sortable: true },
    { header: 'Outstanding', accessor: (collector) => formatCurrency(collector.outstanding / 100), sortKey: 'outstanding', sortable: true },
    { header: 'Completed pledges', accessor: (collector) => `${formatCurrency(collector.completed / 100)} (${collector.completedCount})`, sortKey: 'completed', sortable: true },
    { header: 'Approved receipts', accessor: (collector) => formatCurrency(collector.received / 100), sortKey: 'received', sortable: true },
    { header: 'Pending review', accessor: 'reviewCount', sortable: true },
    { header: 'Submissions', accessor: 'activity', sortable: true },
  ]

  return (
    <Card className="space-y-3 p-4">
      {dashboard ? <h2 className="text-lg font-semibold text-slate-900">Collector donations</h2> : <Button variant="secondary" onClick={() => {
        setOpened(!opened)
        if (!opened) void load()
      }}>{opened ? 'Hide collections' : 'Pending Collections'}</Button>}
      {opened && (
        <>
          {activeCollector && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{activeCollector.name || 'Unnamed collector'}</h3>
              <Button variant="secondary" onClick={() => {
                setCollectorID(null)
                setQuery('')
              }}>Back to all collectors</Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label={activeCollector ? 'Collector totals' : 'Approved collection totals across collectors'}>
            {(activeCollector ? [
              ['Installment pledges', activeCollector.pledged],
              ['Remaining to collect', activeCollector.outstanding],
              ['Completed pledges', activeCollector.completed],
              ['Approved collector payments', activeCollector.received],
            ] as const : [
              ['Installment pledges', overview.totals.pledged],
              ['Paid toward pledges', overview.totals.received],
              ['Remaining to collect', overview.totals.outstanding],
              ['Approved collector payments', overview.collectedPaise],
            ] as const).map(([label, paise]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-600">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{loading || error ? '—' : formatCurrency(paise / 100)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Pledges are credited to the collector who opened the commitment, or to the first collector with an approved submission when the commitment was set up separately. Approved receipts are credited to the collector who recorded each payment.
          </p>
          {!activeCollector && collectors.length > 0 && (
            <DataTable columns={collectorColumns} data={collectors} rowKey={(collector) => collector.id}
              searchable searchPlaceholder="Find a collector" />
          )}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input aria-label="Search collector donations" placeholder="Search donor, collector or reference" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Select aria-label="Collections view" value={view} onChange={(e) => setView(e.target.value as typeof view)}>
              <option value="all">All submissions</option>
              <option value="pending">Pending review</option>
              <option value="corrections">Needs correction</option>
              <option value="installments">Pending installments</option>
              <option value="completed">Completed collections</option>
              <option value="approved">Approved history</option>
              <option value="cash">Cash handovers</option>
              <option value="materials">Materials register</option>
              <option value="cancelled">Cancelled</option>
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
          {!loading && !(commitmentRows?.length ?? filtered.length) && !error && <p className="text-sm text-slate-500">No collections in this view.</p>}
          {!!commitmentRows?.length && <CommitmentTable key={view + search} rows={commitmentRows} pending={view === 'installments'} admin actions={(row) => (
            <Button variant="secondary" onClick={() => setSelected(row.entry)}>View latest collection</Button>
          )} />}
          {!commitmentRows && filtered.length > 0 && <CollectionTable key={view + query.trim()} rows={filtered} admin history={view === 'approved'} actions={(row) => (
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
    ['Installments fully paid', row.installment?.paidCount.toString()],
    ['Installments pending', row.installment?.pendingCount.toString()],
    ['Total received for plan', row.installment && formatCurrency(row.installment.received)],
    ['Outstanding', row.installment && formatCurrency(row.installment.outstanding)],
    ['Next unpaid installment', row.installment?.nextDue
      ? formatCurrency(row.installment.nextAmount) + ' due ' + formatDate(row.installment.nextDue) : ''],
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

function CollectionMessage({ row }: { row: CollectionEntry }) {
  const { settings } = useApp()
  const [mode, setMode] = useState<'greeting' | 'reminder' | null>(null)
  const [draft, setDraft] = useState('')
  const plan = row.installment
  const phone = normalizePhone(row.contact?.phone ?? row.details.phone)
  const whatsapp = /^\d{10}$/.test(phone) ? '91' + phone : ''
  const email = (row.contact?.email ?? row.details.email ?? '').trim()
  const emailAvailable = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)
  const canRemind = row.status === 'Approved' && Boolean(plan && plan.pendingCount > 0)

  function prepare(type: 'greeting' | 'reminder') {
    setMode(type)
    setDraft(type === 'reminder' && plan
      ? [
        'Hare Krishna, ' + row.details.name + '.',
        'A gentle reminder about your commitment towards ' + plan.purpose + '.',
        plan.paidCount + ' installments are fully paid and ' + plan.pendingCount + ' are pending. Total outstanding: ' + formatCurrency(plan.outstanding) + '.',
        plan.nextDue ? 'The next unpaid installment has ' + formatCurrency(plan.nextAmount) + ' remaining, due ' + formatDate(plan.nextDue) + '.' : '',
        'Thank you for your support.\n' + settings.templeName,
      ].filter(Boolean).join('\n\n')
      : 'Hare Krishna, ' + row.details.name + '.\n\nWarm greetings from ' + settings.templeName + '. Thank you for your support.')
  }

  return (
    <section className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold">Message donor</h3>
      {!whatsapp && !emailAvailable ? <p className="text-sm text-slate-500">No usable mobile number or email is available for this donor.</p> : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => prepare('greeting')}>Write greeting</Button>
            {canRemind && <Button variant="secondary" onClick={() => prepare('reminder')}>Write installment reminder</Button>}
          </div>
          {mode && (
            <>
              <Field label="Message"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} /></Field>
              {draft.trim() && <div className="flex flex-wrap gap-4 text-sm font-medium text-orange-700 underline">
                {whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(draft)}`} target="_blank" rel="noopener noreferrer">WhatsApp draft to +{whatsapp}</a>}
                {emailAvailable && <a className="break-all" href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(mode === 'reminder' ? 'Installment reminder' : 'Greetings from ' + settings.templeName)}&body=${encodeURIComponent(draft)}`}>Email draft to {email}</a>}
              </div>}
            </>
          )}
        </>
      )}
    </section>
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
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
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
      {row.status !== 'Cancelled' && <CollectionMessage row={row} />}
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
      {row.status !== 'Cancelled' && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          {cancelling ? (
            <>
              <p className="text-sm text-slate-600">
                Cancellation keeps the submission for audit. Any linked receipt stops counting toward donations and installments.
                Imported bank credits and recorded cash handovers are preserved.
              </p>
              <Field label="Cancellation reason" required>
                <Textarea value={cancelReason} maxLength={1000} rows={2} onChange={(event) => setCancelReason(event.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={busy || !cancelReason.trim()}
                  onClick={() => void save(() => dataService.cancelCollection(row.id, cancelReason))}>Confirm cancellation</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setCancelling(false)}>Go back</Button>
              </div>
            </>
          ) : <Button variant="danger" disabled={busy} onClick={() => setCancelling(true)}>Cancel collection</Button>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}

