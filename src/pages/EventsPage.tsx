import { useState } from 'react'
import { Plus, Pencil, Trash2, Users, CalendarDays, MapPin, IndianRupee } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Field, Input, Textarea, Select, Badge, EmptyState } from '../components/ui'
import { formatCurrency, formatDate } from '../utils/helpers'
import { EVENT_CATEGORIES, EVENT_STATUSES, VOLUNTEER_ROLES } from '../utils/constants'
import type { TempleEvent } from '../types'

const WRITE_ROLES = ['admin', 'accountant', 'manager']

const categoryColor: Record<string, string> = {
  Festival: 'orange',
  Program: 'blue',
  Seva: 'green',
  Meeting: 'amber',
  Other: 'slate',
}

const statusColor: Record<string, string> = {
  Upcoming: 'green',
  Completed: 'blue',
  Cancelled: 'red',
}

export function EventsPage() {
  const { events, eventVolunteers, user, deleteEvent } = useApp()
  const [editing, setEditing] = useState<TempleEvent | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [volunteersFor, setVolunteersFor] = useState<TempleEvent | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  const canWrite = user ? WRITE_ROLES.includes(user.role) : false
  const today = new Date().toISOString().slice(0, 10)

  const sorted = events
    .filter((e) => !categoryFilter || e.category === categoryFilter)
    .sort((a, b) => {
      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1
      if (b.status === 'upcoming' && a.status !== 'upcoming') return 1
      return a.date.localeCompare(b.date)
    })

  const volunteerCount = (eventID: string) => eventVolunteers.filter((v) => v.eventID === eventID).length

  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">Festivals, programs and seva schedules</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Event
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={categoryFilter === '' ? 'primary' : 'secondary'} size="sm" onClick={() => setCategoryFilter('')}>
          All
        </Button>
        {EVENT_CATEGORIES.map((c) => (
          <Button
            key={c}
            variant={categoryFilter === c ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {sorted.length === 0 && (
        <EmptyState title="No events found" subtitle="Add an event to get started" />
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((e) => {
          const isPast = e.status === 'upcoming' && e.date < today
          return (
            <div key={e.eventID} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <Badge color={(categoryColor[e.category] || 'slate') as never}>{e.category || 'Other'}</Badge>
                <Badge color={(statusColor[cap(e.status)] || 'slate') as never}>{cap(e.status)}</Badge>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mt-3">{e.title}</h3>
              {e.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{e.description}</p>
              )}
              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-slate-400" />
                  {formatDate(e.date)}
                  {e.time ? ` at ${e.time}` : ''}
                  {isPast && <Badge color="amber">Past</Badge>}
                </p>
                {e.location && (
                  <p className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400" />
                    {e.location}
                  </p>
                )}
                {e.budget > 0 && (
                  <p className="flex items-center gap-2">
                    <IndianRupee size={13} className="text-slate-400" />
                    {formatCurrency(e.budget)}
                  </p>
                )}
              </div>
              {e.organizer && <p className="text-[11px] text-slate-400 mt-3">Organizer: {e.organizer}</p>}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setVolunteersFor(e)}>
                  <Users size={14} /> {volunteerCount(e.eventID)} Volunteer{volunteerCount(e.eventID) === 1 ? '' : 's'}
                </Button>
                {canWrite && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(e)} title="Edit">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void confirmDelete(e, deleteEvent)} className="text-red-500 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Event" wide>
        <EventForm onDone={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Event" wide>
        {editing && <EventForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal open={!!volunteersFor} onClose={() => setVolunteersFor(null)} title="Volunteers" wide>
        {volunteersFor && <VolunteersPanel event={volunteersFor} onChanged={() => setVolunteersFor(volunteersFor)} />}
      </Modal>
    </div>
  )
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function confirmDelete(e: TempleEvent, del: (id: string) => Promise<void>): Promise<void> {
  if (!window.confirm(`Delete event "${e.title}"? This cannot be undone.`)) return Promise.resolve()
  return del(e.eventID)
}

function EventForm({ initial, onDone }: { initial?: Partial<TempleEvent>; onDone: () => void }) {
  const { addEvent, updateEvent } = useApp()
  const [form, setForm] = useState<Partial<TempleEvent>>({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    time: '',
    location: '',
    description: '',
    category: 'Festival',
    budget: 0,
    organizer: '',
    status: 'upcoming',
    ...initial,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof TempleEvent, v: never) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return setError('Title is required')
    if (!form.date) return setError('Date is required')
    setError('')
    setSaving(true)
    try {
      if (initial?.eventID) {
        await updateEvent({ ...(form as TempleEvent), eventID: initial.eventID })
      } else {
        await addEvent(form as Omit<TempleEvent, 'eventID'>)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <Field label="Title" required>
        <Input value={form.title} onChange={(e) => set('title', e.target.value as never)} placeholder="Event title" required />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value as never)} required />
        </Field>
        <Field label="Time">
          <Input type="time" value={form.time} onChange={(e) => set('time', e.target.value as never)} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Location">
          <Input value={form.location} onChange={(e) => set('location', e.target.value as never)} placeholder="Venue" />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => set('category', e.target.value as never)}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Budget (₹)">
          <Input type="number" min="0" value={form.budget || ''} onChange={(e) => set('budget', Number(e.target.value) as never)} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s.toLowerCase()}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Organizer">
        <Input value={form.organizer} onChange={(e) => set('organizer', e.target.value as never)} placeholder="Person responsible" />
      </Field>
      <Field label="Description">
        <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value as never)} placeholder="Event details..." />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.eventID ? 'Save Changes' : 'Add Event'}</Button>
      </div>
    </form>
  )
}

function VolunteersPanel({ event, onChanged }: { event: TempleEvent; onChanged: () => void }) {
  const { eventVolunteers, people, addVolunteer, removeVolunteer } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({ personID: '', name: '', role: 'Volunteer' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const volunteers = eventVolunteers.filter((v) => v.eventID === event.eventID)

  const setPerson = (personID: string) => {
    const p = people.find((x) => x.personID === personID)
    setForm((f) => ({ ...f, personID, name: p ? p.name : '' }))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.personID) return setError('Select a person')
    setError('')
    setSaving(true)
    try {
      await addVolunteer({ eventID: event.eventID, personID: form.personID, name: form.name, role: form.role })
      setForm({ personID: '', name: '', role: 'Volunteer' })
      setExpanded(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add volunteer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{event.title}</p>
        <Badge color="blue">{volunteers.length} registered</Badge>
      </div>

      <div className="divide-y divide-slate-100">
        {volunteers.length === 0 && <EmptyState title="No volunteers yet" />}
        {volunteers.map((v) => (
          <div key={v.volunteerID} className="flex items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-slate-700 font-medium truncate">{v.name}</p>
              <p className="text-[11px] text-slate-400">{v.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-50 shrink-0"
              onClick={() => void removeVolunteer(v.volunteerID).then(onChanged).catch(() => {})}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>

      {expanded ? (
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
          <Field label="Person" required>
            <Select value={form.personID} onChange={(e) => setPerson(e.target.value)} required>
              <option value="">Select person</option>
              {people.map((p) => (
                <option key={p.personID} value={p.personID}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {VOLUNTEER_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Adding…' : 'Add Volunteer'}</Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setExpanded(true)}>
          <Plus size={15} /> Add Volunteer
        </Button>
      )}
    </div>
  )
}