import { useState } from 'react'
import { Plus, Pencil, Pin, Archive } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Field, Input, Textarea, Badge } from '../components/ui'
import { formatDate, formatDateTime } from '../utils/helpers'
import type { Announcement } from '../types'

const WRITE_ROLES = ['admin', 'accountant', 'manager']

export function AnnouncementsPage() {
  const { announcements, user, archiveAnnouncement } = useApp()
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const canWrite = user ? WRITE_ROLES.includes(user.role) : false
  const today = new Date().toISOString().slice(0, 10)

  const active = announcements
    .filter(
      (a) =>
        !a.deleted &&
        a.status !== 'archived' &&
        (!a.expiresAt || a.expiresAt >= today)
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.postedAt.localeCompare(a.postedAt)
    })

  const archived = announcements.filter(
    (a) => a.status === 'archived' || (a.expiresAt && a.expiresAt < today)
  )

  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Temple notices for all members and staff</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Post Announcement
          </Button>
        )}
      </div>

      {active.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-sm">No announcements yet</p>
          <p className="text-xs text-slate-300 mt-1">Post the first announcement to keep everyone informed</p>
        </div>
      )}

      <div className="space-y-3">
        {active.map((a) => (
          <div
            key={a.announcementID}
            className={`bg-white rounded-xl border shadow-sm p-5 ${a.pinned ? 'border-orange-200 border-l-4 border-l-orange-500' : 'border-slate-200'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                      <Pin size={11} /> Pinned
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-slate-800">{a.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Posted by {a.postedBy || '—'} on {formatDateTime(a.postedAt)}
                </p>
              </div>
              {canWrite && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(a)}
                    className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => void archiveAnnouncement(a.announcementID)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    title="Archive"
                  >
                    <Archive size={15} />
                  </button>
                </div>
              )}
            </div>
            {a.body && <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{a.body}</p>}
            {a.expiresAt && (
              <p className="text-[11px] text-slate-400 mt-3">Expires {formatDate(a.expiresAt)}</p>
            )}
          </div>
        ))}
      </div>

      {archived.length > 0 && (
        <details className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4">
          <summary className="cursor-pointer text-xs font-medium text-slate-500">
            Archived ({archived.length})
          </summary>
          <div className="mt-3 space-y-2">
            {archived.map((a) => (
              <div key={a.announcementID} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-100 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-600 truncate">{a.title}</p>
                  <p className="text-[11px] text-slate-400">Posted {formatDate(a.postedAt)}</p>
                </div>
                <Badge color="slate">Archived</Badge>
              </div>
            ))}
          </div>
        </details>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Post Announcement" wide>
        <AnnouncementForm onDone={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Announcement" wide>
        {editing && <AnnouncementForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}

function AnnouncementForm({ initial, onDone }: { initial?: Partial<Announcement>; onDone: () => void }) {
  const { addAnnouncement, updateAnnouncement } = useApp()
  const [form, setForm] = useState<Partial<Announcement>>({
    title: '',
    body: '',
    expiresAt: '',
    pinned: false,
    status: 'active',
    ...initial,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof Announcement, v: never) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim()) return setError('Title is required')
    setError('')
    setSaving(true)
    try {
      if (initial?.announcementID) {
        await updateAnnouncement({ ...(form as Announcement), announcementID: initial.announcementID })
      } else {
        await addAnnouncement(form as Omit<Announcement, 'announcementID' | 'postedAt' | 'postedBy'>)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <Field label="Title" required>
        <Input value={form.title} onChange={(e) => set('title', e.target.value as never)} placeholder="Announcement title" required />
      </Field>
      <Field label="Body">
        <Textarea rows={5} value={form.body} onChange={(e) => set('body', e.target.value as never)} placeholder="Announcement details..." />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Expires On" hint="Leave empty to keep it active indefinitely">
          <Input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value as never)} />
        </Field>
        <Field label="Pinned">
          <label className="flex items-center gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.pinned}
              onChange={(e) => set('pinned', e.target.checked as never)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-600">Show at the top of the announcement list</span>
          </label>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.announcementID ? 'Save Changes' : 'Post'}</Button>
      </div>
    </form>
  )
}