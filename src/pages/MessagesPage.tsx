import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2, Mail, MailOpen, Send } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Field, Input, Textarea, EmptyState } from '../components/ui'
import { formatDateTime } from '../utils/helpers'
import type { Message } from '../types'

export function MessagesPage() {
  const { messages, unreadMessages, user, refreshMessages, setMessagesPolling, markMessageRead, deleteMessage } = useApp()
  const [showCompose, setShowCompose] = useState(false)
  const [viewing, setViewing] = useState<Message | null>(null)
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setMessagesPolling(true)
    return () => setMessagesPolling(false)
  }, [setMessagesPolling])

  const meEmail = user?.email.toLowerCase()

  const foldered = messages.filter((m) => {
    const mine = (m.senderEmail || '').toLowerCase() === meEmail
    return tab === 'sent' ? mine : !mine
  })
  const visible = foldered.sort((a, b) => b.sentAt.localeCompare(a.sentAt))

  const openMessage = (m: Message) => {
    setViewing(m)
    const isRecipient = (m.recipientEmail || '').toLowerCase() === meEmail
    if (isRecipient && !m.read && meEmail) {
      void markMessageRead(m.messageID).catch(() => {})
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshMessages()
    setRefreshing(false)
  }

  const handleDelete = async (m: Message) => {
    if (!user) return
    const isRecipient = (m.recipientEmail || '').toLowerCase() === user.email.toLowerCase()
    await deleteMessage(m.messageID, isRecipient ? 'recipient' : 'sender').catch(() => {})
    setViewing(null)
  }

  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Messages</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadMessages.length > 0
              ? `${unreadMessages.length} unread message${unreadMessages.length === 1 ? '' : 's'}`
              : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
            {refreshing ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />} Refresh
          </Button>
          <Button onClick={() => setShowCompose(true)}>
            <Plus size={16} /> Compose
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'inbox' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('inbox')}>
          Inbox ({folderedInboxCount(messages, user?.email || '')})
        </Button>
        <Button variant={tab === 'sent' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('sent')}>
          Sent ({folderedSentCount(messages, user?.email || '')})
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {visible.length === 0 && (
          <EmptyState title="No messages" subtitle="Messages you send and receive will appear here" />
        )}
        {visible.map((m) => {
          const isRecipient = (m.recipientEmail || '').toLowerCase() === meEmail
          const unread = isRecipient && !m.read
          return (
            <button
              key={m.messageID}
              onClick={() => openMessage(m)}
              className={`w-full flex items-start gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-orange-50/50 transition-colors ${
                unread ? 'bg-orange-50/40' : ''
              }`}
            >
              <div className={`mt-1 shrink-0 ${unread ? 'text-orange-600' : 'text-slate-400'}`}>
                {unread ? <Mail size={18} /> : <MailOpen size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-sm truncate ${unread ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                    {tab === 'sent' ? `To: ${m.recipientEmail}` : `${m.senderName || m.senderEmail}`}
                  </p>
                  <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(m.sentAt)}</span>
                </div>
                <p className={`text-xs mt-0.5 ${unread ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{m.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{m.body}</p>
              </div>
              {unread && <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-2" />}
            </button>
          )
        })}
      </div>

      <Modal open={showCompose} onClose={() => setShowCompose(false)} title="Compose Message" wide>
        <ComposeForm onDone={() => setShowCompose(false)} />
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Message" wide>
        {viewing && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-800">{viewing.subject}</p>
              <p className="text-xs text-slate-500 mt-1">
                {tab === 'sent' ? 'To' : 'From'}:{' '}
                {tab === 'sent' ? viewing.recipientEmail : viewing.senderName || viewing.senderEmail}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(viewing.sentAt)}</p>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewing.body}</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => handleDelete(viewing)}>
                <Trash2 size={15} /> Delete
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCompose(true)
                  setViewing(null)
                }}
              >
                <Send size={15} /> Reply
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
function folderedInboxCount(messages: Message[], email: string): number {
  const me = email.toLowerCase()
  return messages.filter((m) => (m.recipientEmail || '').toLowerCase() === me).length
}

// eslint-disable-next-line react-refresh/only-export-components
function folderedSentCount(messages: Message[], email: string): number {
  const me = email.toLowerCase()
  return messages.filter((m) => (m.senderEmail || '').toLowerCase() === me).length
}

function ComposeForm({ onDone }: { onDone: () => void }) {
  const { sendMessage, users, user } = useApp()
  const [form, setForm] = useState({ recipientEmail: '', subject: '', body: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const recipients = users
    .filter((u) => u.email.toLowerCase() !== user?.email?.toLowerCase() && u.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.recipientEmail) return setError('Select a recipient')
    if (!form.subject.trim()) return setError('Subject is required')
    if (!form.body.trim()) return setError('Message body is required')
    setError('')
    setSaving(true)
    try {
      await sendMessage(form)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <Field label="To" required>
        <select
          value={form.recipientEmail}
          onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          required
        >
          <option value="">Select user</option>
          {recipients.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Subject" required>
        <Input
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          placeholder="Subject"
          required
        />
      </Field>
      <Field label="Message" required>
        <Textarea
          rows={6}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          placeholder="Write your message..."
          required
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Sending…' : <><Send size={15} /> Send</>}
        </Button>
      </div>
    </form>
  )
}