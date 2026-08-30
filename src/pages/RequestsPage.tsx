import { useState } from 'react'
import { Plus, Pencil, Trash2, HeartHandshake } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Field, Input, Textarea, Select, Badge, Card, EmptyState } from '../components/ui'
import { formatDate } from '../utils/helpers'
import { REQUEST_TYPES, REQUEST_STATUSES } from '../utils/constants'
import type { PrayerRequest } from '../types'

const WRITE_ROLES = ['admin', 'accountant', 'manager']

const typeColor: Record<string, string> = {
  'Prayer Request': 'blue',
  'Seva Request': 'green',
  Assistance: 'amber',
  Other: 'slate',
}

const statusColor: Record<string, string> = {
  open: 'amber',
  'in-progress': 'blue',
  resolved: 'green',
  closed: 'slate',
}

export function RequestsPage() {
  const { requests, user, deleteRequest } = useApp()
  const [editing, setEditing] = useState<PrayerRequest | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const canWrite = user ? WRITE_ROLES.includes(user.role) : false

  const filtered = requests.filter((r) => !statusFilter || r.status === statusFilter)

  const openCount = requests.filter((r) => r.status === 'open' || r.status === 'in-progress').length

  const handleDelete = (r: PrayerRequest) => {
    if (!window.confirm(`Delete request from ${r.personName}?`)) return
    void deleteRequest(r.requestID).catch(() => {})
  }

  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Prayer and seva requests from devotees &nbsp;•&nbsp; {openCount} open
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New Request
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={statusFilter === '' ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter('')}>
          All
        </Button>
        {REQUEST_STATUSES.map((s) => {
          const key = s.toLowerCase().replace(/ /g, '-')
          return (
            <Button
              key={s}
              variant={statusFilter === key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            >
              {s}
            </Button>
          )
        })}
      </div>

      {filtered.length === 0 && <EmptyState title="No requests found" />}

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((r) => (
          <Card key={r.requestID} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <HeartHandshake size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.personName}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(r.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge color={(typeColor[r.type] || 'slate') as never}>{r.type}</Badge>
                <Badge color={(statusColor[r.status] || 'slate') as never}>
                  {cap(r.status)}
                </Badge>
              </div>
            </div>
            {r.description && (
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{r.description}</p>
            )}
            {(r.assignedTo || r.notes) && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                {r.assignedTo && <p className="text-xs text-slate-500">Assigned to: <span className="font-medium">{r.assignedTo}</span></p>}
                {r.notes && <p className="text-xs text-slate-400">Notes: {r.notes}</p>}
              </div>
            )}
            {canWrite && (
              <div className="mt-4 flex items-center gap-1 justify-end border-t border-slate-100 pt-3">
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                  <Pencil size={14} /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(r)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Request" wide>
        <RequestForm onDone={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Request" wide>
        {editing && <RequestForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function RequestForm({ initial, onDone }: { initial?: Partial<PrayerRequest>; onDone: () => void }) {
  const { addRequest, updateRequest, users } = useApp()
  const [form, setForm] = useState<Partial<PrayerRequest>>({
    date: new Date().toISOString().slice(0, 10),
    personID: '',
    personName: '',
    type: 'Prayer Request',
    description: '',
    assignedTo: '',
    status: 'open',
    notes: '',
    ...initial,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof PrayerRequest, v: never) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.personName?.trim()) return setError('Person name is required')
    if (!form.description?.trim()) return setError('Description is required')
    setError('')
    setSaving(true)
    try {
      if (initial?.requestID) {
        await updateRequest({ ...(form as PrayerRequest), requestID: initial.requestID })
      } else {
        await addRequest(form as Omit<PrayerRequest, 'requestID'>)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value as never)} required />
        </Field>
        <Field label="Request Type">
          <Select value={form.type} onChange={(e) => set('type', e.target.value as never)}>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Person Name" required>
        <Input value={form.personName} onChange={(e) => set('personName', e.target.value as never)} placeholder="Name of the devotee/visitor" required />
      </Field>
      <Field label="Description" required>
        <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value as never)} placeholder="Describe the request..." required />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Assigned To">
          <Select value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value as never)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.userID} value={u.name}>{u.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s.toLowerCase().replace(/ /g, '-')}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Input value={form.notes} onChange={(e) => set('notes', e.target.value as never)} placeholder="Internal notes" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.requestID ? 'Save Changes' : 'Record Request'}</Button>
      </div>
    </form>
  )
}