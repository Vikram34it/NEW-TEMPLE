import { useEffect, useState } from 'react'
import { Save, Plus, Pencil, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { isCollectorPortal } from '../config/portal'
import { Button, Card, CardHeader, Field, Input, Select, Badge, Modal, PageHeader, Textarea } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate } from '../utils/helpers'
import { dataService } from '../services/apiService'
import type { ResetPreviewResult } from '../services/apiService'
import type { Role, User } from '../types'

type LoginShare = { recipient: User; password?: string }

export function SettingsPage() {
  const { settings, updateSettings, users, auditLog, deleteUser, can } = useApp()
  const [form, setForm] = useState({ ...settings })
  const [saveMsg, setSaveMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [repairMsg, setRepairMsg] = useState('')
  const [repairing, setRepairing] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [loginShare, setLoginShare] = useState<LoginShare | null>(null)
  const [pinRecipient, setPinRecipient] = useState<User | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [tab, setTab] = useState<'temple' | 'users' | 'audit' | 'messaging'>('temple')

  const save = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await updateSettings(form)
      setSaveMsg('Settings saved')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch {
      setSaveMsg('Save failed')
      setTimeout(() => setSaveMsg(''), 2500)
    } finally {
      setSaving(false)
    }
  }

  const userColumns: Column<User>[] = [
    { header: 'Name', accessor: (u) => <span className="font-medium text-slate-700">{u.name}</span>, sortable: true, sortKey: 'name' },
    { header: 'Email', accessor: (u) => u.email },
    { header: 'Role', accessor: (u) => <Badge color={roleColor(u.role)}>{u.role}</Badge> },
    { header: 'Status', accessor: (u) => <Badge color={u.status === 'active' ? 'green' : 'slate'}>{u.status}</Badge> },
    { header: 'Created', accessor: (u) => formatDate(u.createdDate) },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Temple configuration and system management" />

      <div className="flex flex-wrap gap-2">
        {[['temple', 'Temple Details'], ['messaging', 'Messaging & SMS'], ['users', 'Users'], ['audit', 'Audit Log']].map(([k, label]) => (
          <Button key={k} variant={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k as never)}>{label}</Button>
        ))}
      </div>

      {tab === 'temple' && (
        <Card>
          <CardHeader title="Temple Details" />
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Temple Name"><Input value={form.templeName} onChange={(e) => setForm({ ...form, templeName: e.target.value })} /></Field>
              <Field label="Temple Phone"><Input value={form.templePhone} onChange={(e) => setForm({ ...form, templePhone: e.target.value })} /></Field>
            </div>
            <Field label="Temple Address"><Input value={form.templeAddress} onChange={(e) => setForm({ ...form, templeAddress: e.target.value })} /></Field>
            <Field label="Temple Email"><Input value={form.templeEmail} onChange={(e) => setForm({ ...form, templeEmail: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Receipt Prefix"><Input value={form.receiptPrefix} onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })} /></Field>
              <Field label="Currency"><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
            </div>
            <Field label="Default Bank Account">
              <Input value={form.defaultBankAccount} onChange={(e) => setForm({ ...form, defaultBankAccount: e.target.value })} />
            </Field>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}</Button>
              {saveMsg && <span className={`text-sm ${saveMsg === 'Save failed' ? 'text-red-600' : 'text-emerald-600'}`}>{saveMsg}</span>}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sync &amp; Repair</p>
              <p className="text-[11px] text-slate-400 mb-2">
                Rebuilds the ledger and account balances from currently-active donations &amp; expenses. Use this if the
                Dashboard still shows a cancelled donation/expense.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={repairing}
                  onClick={async () => {
                    setRepairing(true)
                    setRepairMsg('')
                    try {
                      await dataService.resyncLedger()
                      setRepairMsg('Balances rebuilt — reloading…')
                      setTimeout(() => window.location.reload(), 1200)
                    } catch {
                      setRepairMsg('Repair failed')
                    } finally {
                      setRepairing(false)
                    }
                  }}
                >
                  <RefreshCw size={14} className={repairing ? 'animate-spin' : ''} /> {repairing ? 'Repairing…' : 'Repair balances'}
                </Button>
                {repairMsg && <span className="text-sm text-emerald-600">{repairMsg}</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'messaging' && (
        <>
        <Card>
          <CardHeader title="SMS Gateway" subtitle="Used by Bulk Messaging for sending real SMS. Emails always go through the temple's Gmail." />
          <div className="p-5 space-y-4">
            <Field label="SMS Provider" hint="Choose Off to use the free WhatsApp fallback in Bulk Messaging instead.">
              <Select value={form.smsProvider} onChange={(e) => setForm({ ...form, smsProvider: e.target.value as string })}>
                <option value="off">Off — no SMS gateway (use WhatsApp)</option>
                <option value="msg91">MSG91 (India)</option>
                <option value="textlocal">TextLocal</option>
                <option value="twilio">Twilio</option>
                <option value="custom">Custom URL template</option>
              </Select>
            </Field>

            {form.smsProvider && form.smsProvider !== 'off' && (
              <>
                {form.smsProvider === 'twilio' && (
                  <Field label="Twilio Account SID" required hint="Starts with AC… from your Twilio console.">
                    <Input value={form.smsAccountSid} onChange={(e) => setForm({ ...form, smsAccountSid: e.target.value })} />
                  </Field>
                )}
                {form.smsProvider === 'msg91' && (
                  <Field label="MSG91 Auth Key" required>
                    <Input value={form.smsApiKey} onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })} placeholder="Your MSG91 authkey" />
                  </Field>
                )}
                {form.smsProvider === 'textlocal' && (
                  <Field label="TextLocal API Key" required>
                    <Input value={form.smsApiKey} onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })} />
                  </Field>
                )}
                {form.smsProvider === 'custom' && (
                  <>
                    <Field label="Gateway URL Template" required hint="Use {phone}, {message}, {api_key}, {sender} and {from} as placeholders. Fetched server-side.">
                      <Input value={form.smsCustomUrl} onChange={(e) => setForm({ ...form, smsCustomUrl: e.target.value })} placeholder="https://gateway.example.com/send?to={phone}&msg={message}&key={api_key}" />
                    </Field>
                    <Field label="API Key (optional)">
                      <Input value={form.smsApiKey} onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })} />
                    </Field>
                  </>
                )}
                {form.smsProvider === 'twilio' && (
                  <Field label="Twilio Auth Token" required>
                    <Input value={form.smsApiKey} onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })} />
                  </Field>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {(form.smsProvider === 'msg91' || form.smsProvider === 'textlocal') && (
                    <Field label="Sender ID" hint="6 characters (MSG91) / 3-11 (TextLocal)">
                      <Input value={form.smsSenderId} onChange={(e) => setForm({ ...form, smsSenderId: e.target.value })} />
                    </Field>
                  )}
                  {form.smsProvider === 'twilio' && (
                    <Field label="From Number" hint="Your Twilio number, e.g. +1234567890">
                      <Input value={form.smsFrom} onChange={(e) => setForm({ ...form, smsFrom: e.target.value })} />
                    </Field>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Phone numbers are normalised automatically (10-digit Indian numbers get a +91 prefix). Every number is
                  built server-side, so your keys stay out of the browser.
                </p>
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}</Button>
              {saveMsg && <span className={`text-sm ${saveMsg === 'Save failed' ? 'text-red-600' : 'text-emerald-600'}`}>{saveMsg}</span>}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="WhatsApp Business API (Meta)"
            subtitle="Proactive messages must use a Meta-approved template in your WhatsApp Business Account. Map your message tokens to the template's {{1}}, {{2}} … variables in order."
          />
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Create the template in Meta Business Suite (e.g. body: <span className="font-mono">Hare Krishna {`{{1}}`}!
              {`\n`}{`{{2}}`}</span>). Then set the param map below to the matching token order —{' '}
              <span className="font-mono">Name,Message</span> fills {`{{1}}`} with the name and {`{{2}}`} with your
              personalised message. All values stay server-side.
            </p>
            <Field label="Access Token" required hint="Long-lived system-user token with waba messaging permission.">
              <Input type="password" value={form.waApiToken || ''} onChange={(e) => setForm({ ...form, waApiToken: e.target.value })} placeholder="EAAG…" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone Number ID" required hint="From Meta Business Suite → WhatsApp → API setup.">
                <Input value={form.waPhoneNumberId || ''} onChange={(e) => setForm({ ...form, waPhoneNumberId: e.target.value })} />
              </Field>
              <Field label="Template Name" required hint="The approved template in your WABA.">
                <Input value={form.waTemplateName || ''} onChange={(e) => setForm({ ...form, waTemplateName: e.target.value })} placeholder="temple_greeting" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Template Language">
                <Select value={form.waTemplateLanguage || 'en'} onChange={(e) => setForm({ ...form, waTemplateLanguage: e.target.value })}>
                  <option value="en">English (en)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="kn">Kannada (kn)</option>
                  <option value="mr">Marathi (mr)</option>
                  <option value="te">Telugu (te)</option>
                  <option value="ta">Tamil (ta)</option>
                </Select>
              </Field>
              <Field label="Template Param Map" hint="Comma-separated tokens in template order.">
                <Input value={form.waTemplateParamMap || 'Message'} onChange={(e) => setForm({ ...form, waTemplateParamMap: e.target.value })} placeholder="Name,Message" />
              </Field>
            </div>
            <p className="text-xs text-slate-400">
              10-digit Indian numbers get a +91 prefix automatically. Costs follow Meta's per-conversation pricing for
              template messages (marketing/utility rates by country).
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}</Button>
              {saveMsg && <span className={`text-sm ${saveMsg === 'Save failed' ? 'text-red-600' : 'text-emerald-600'}`}>{saveMsg}</span>}
            </div>
          </div>
        </Card>
        </>
      )}

      {tab === 'users' && (
        <>
        {can('*') && (
          <Card>
            <CardHeader
              title="Danger Zone"
              subtitle="Irreversible maintenance actions. Admins only."
            />
            <div className="p-5 space-y-2">
              <p className="text-sm text-slate-500">
                Deletes <strong>all</strong> entered donations, expenses, payments and transactions,
                resets every account balance to its OpeningBalance and restarts the receipt counter
                at 0001. Users, people, vendors, projects and accounts are kept. Cannot be undone
                from the app (spreadsheet Version history is the only recovery).
              </p>
              <p className="text-xs text-slate-400">
                You will need the reset password: in the Apps Script editor, run <span className="font-mono">getResetKeyNow</span> to view it.
              </p>
              <div className="pt-1">
                <Button variant="danger" onClick={() => setShowReset(true)}>
                  <AlertTriangle size={16} /> Reset All Transactions
                </Button>
              </div>
            </div>
          </Card>
        )}
        <DataTable
          columns={userColumns}
          data={users}
          searchable
          searchPlaceholder="Search users..."
          pageSize={10}
          rowKey={(u) => u.userID}
          toolbar={can('*') && <Button size="sm" onClick={() => setShowUser(true)}><Plus size={14} /> Add User</Button>}
          actions={(u) => can('*') && (
            <div className="flex flex-wrap gap-1 justify-end">
              {u.status === 'active' && <Button size="sm" variant="secondary" onClick={() => setLoginShare({ recipient: u })}>Share login</Button>}
              {u.role === 'collector' && (
                <Button size="sm" variant="secondary" onClick={() => setPinRecipient(u)}>Reset PIN</Button>
              )}
              <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
              {u.userID !== 'USR-0001' && (
                <button onClick={() => { if (confirm(`Delete user ${u.name}?`)) void deleteUser(u.userID).catch(() => {}) }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
              )}
            </div>
          )}
        />
        </>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader title="Audit Log" subtitle="Important actions are recorded here" />
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Module</th>
                  <th className="px-4 py-2.5">Record ID</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No audit entries yet in this session.</td></tr>
                )}
                {auditLog.map((a) => (
                  <tr key={a.logID} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-slate-500">{new Date(a.dateTime).toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-700">{a.user}</td>
                    <td className="px-4 py-2"><Badge color="amber">{a.action}</Badge></td>
                    <td className="px-4 py-2 text-slate-600">{a.module}</td>
                    <td className="px-4 py-2 text-slate-400">{a.recordID}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showUser} onClose={() => setShowUser(false)} title="Add User">
        <UserForm onDone={() => setShowUser(false)} onShare={setLoginShare} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && <UserForm initial={editUser} onDone={() => setEditUser(null)} onShare={setLoginShare} />}
      </Modal>

      {loginShare && can('*') && (
        <Modal open onClose={() => setLoginShare(null)} title="Share login on WhatsApp">
          <LoginShareForm share={loginShare} templeName={settings.templeName} onResetPin={() => {
            setPinRecipient(loginShare.recipient)
            setLoginShare(null)
          }} />
        </Modal>
      )}

      {pinRecipient && can('*') && (
        <Modal open onClose={() => setPinRecipient(null)} title={`Reset PIN for ${pinRecipient.name}`}>
          <CollectorPinForm recipient={pinRecipient} onDone={() => setPinRecipient(null)} onShare={(pin) => {
            setLoginShare({ recipient: pinRecipient, password: pin })
            setPinRecipient(null)
          }} />
        </Modal>
      )}

      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset All Transactions">
        <ResetAllForm onDone={() => setShowReset(false)} />
      </Modal>
    </div>
  )
}

function roleColor(role: Role): 'green' | 'red' | 'amber' | 'blue' | 'orange' | 'slate' | 'violet' {
  switch (role) {
    case 'admin': return 'red'
    case 'accountant': return 'blue'
    case 'manager': return 'orange'
    case 'viewer':
    case 'collector': return 'slate'
    case 'donor': return 'violet'
  }
}

function LoginShareForm({ share, templeName, onResetPin }: { share: LoginShare; templeName: string; onResetPin: () => void }) {
  const { recipient, password } = share
  const [pinLookup, setPinLookup] = useState<{ pin: string | null; error?: string } | null>(null)
  const [phone, setPhone] = useState(() => String(recipient.phone ?? '').trim())
  const [summary, setSummary] = useState<{ count: number; total: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isDonor = recipient.role === 'donor'
  const isCollector = recipient.role === 'collector'
  const collectorID = isCollector && !password ? recipient.userID : null
  const collectorCredential = password || pinLookup?.pin
  const loadingPin = !!collectorID && pinLookup === null

  useEffect(() => {
    if (!collectorID) return
    let active = true
    dataService.getCollectorSharePin(collectorID).then(({ pin }) => {
      if (active) setPinLookup({ pin })
    }).catch((err: unknown) => {
      if (active) {
        const detail = err instanceof Error ? err.message : ''
        setPinLookup({
          pin: null,
          error: /^(Permission denied|Invalid action|Unknown action)/i.test(detail)
            ? 'The PIN lookup is unavailable. Check that the latest Code.gs is deployed and you are signed in as an admin.'
            : detail || 'Could not load the collector PIN.',
        })
      }
    })
    return () => { active = false }
  }, [collectorID])
  const loginUrl = isCollectorPortal ? new URL('../', window.location.href) : new URL(window.location.href)
  loginUrl.search = ''
  loginUrl.hash = isDonor ? '/login' : '/staff-login'
  const signInLink = isCollector ? 'https://vikram34it.github.io/iskconmangalagiri/collector/' : loginUrl.href
  const digits = phone.replace(/\D/g, '')
  const whatsappPhone = digits.length === 10 && !phone.trim().startsWith('+') ? '91' + digits : digits
  const validPhone = /^[1-9][0-9]{7,14}$/.test(whatsappPhone)
  const needsCollectorCredential = isCollector && !collectorCredential
  const message = [
    `*Hare Krishna, ${recipient.name}!*`,
    '',
    `*${templeName} ${isDonor ? 'Donor' : 'Staff'} Portal*`,
    `*Login link:* ${signInLink}`,
    ...(isCollector
      ? [`Select your name *${recipient.name}* from the dropdown list.`]
      : [isDonor ? `*Login email:* ${recipient.email}` : `*Select your name:* ${recipient.name}\n*Email sign-in:* ${recipient.email}`]),
    ...(isCollector ? (collectorCredential ? [
      `*${/^\d{4,256}$/.test(collectorCredential) ? 'PIN' : 'Password'}:* ${collectorCredential}`,
    ] : []) : [password
      ? `*Password:* ${password}`
      : `Use your current password${isDonor ? ' or PIN' : ''}.`]),
    ...(summary ? [
      '',
      '*Your contribution summary*',
      `*Total received:* ${formatCurrency(summary.total)}`,
      `*Recorded donations:* ${summary.count}`,
    ] : []),
    '',
    isDonor ? 'Sign in to view your donations and receipts. Thank you for your support!' : 'Thank you for your service!',
  ].join('\n')

  const toggleSummary = async () => {
    setError('')
    if (summary) {
      setSummary(null)
      return
    }
    setLoading(true)
    try {
      setSummary(await dataService.getDonorShareSummary(recipient.userID))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the contribution summary.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label="WhatsApp number" hint="Enter a 10-digit Indian number or include the country code for other numbers.">
        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      {loadingPin && <p role="status" className="text-sm text-slate-600">Loading current PIN from Sheets…</p>}
      {needsCollectorCredential && pinLookup && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-slate-700">
            {pinLookup.error || 'The Users sheet has no readable PIN for this collector. Save a new PIN to prepare the message.'}
          </p>
          <Button variant="secondary" onClick={onResetPin}>Open Reset PIN</Button>
        </div>
      )}
      {isDonor && (
        <Button variant="secondary" disabled={loading} onClick={() => void toggleSummary()}>
          {loading ? 'Loading summary…' : summary ? 'Remove contribution summary' : 'Include contribution summary'}
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!needsCollectorCredential && <Field label="Message preview"><Textarea rows={11} readOnly value={message} /></Field>}
      <p className="text-sm text-slate-600">Verify the recipient’s number before sending in WhatsApp.</p>
      <div className="flex justify-end">
        <Button disabled={!validPhone || loading || needsCollectorCredential} onClick={() => window.open(
          `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer'
        )}>Open WhatsApp draft</Button>
      </div>
    </div>
  )
}

function CollectorPinForm({ recipient, onDone, onShare }: { recipient: User; onDone: () => void; onShare: (pin: string) => void }) {
  const { updateUser } = useApp()
  const [newPin, setNewPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const validPin = /^\d{6}$/.test(newPin)

  const resetPin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validPin || saving || saved) return
    setError('')
    setSaving(true)
    try {
      await updateUser({ userID: recipient.userID, password: newPin })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the collector PIN.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={resetPin}>
      {saved ? (
        <>
          <p role="status" className="text-sm text-emerald-700">New PIN saved.</p>
          <Field label="Saved PIN">
            <Input value={newPin} readOnly onFocus={(event) => event.currentTarget.select()} />
          </Field>
        </>
      ) : (
        <Field label="New 6-digit PIN" hint="Saving replaces the collector’s current sign-in credential.">
          <Input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6}
            required disabled={saving} value={newPin} onChange={(event) => setNewPin(event.target.value)} />
        </Field>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={onDone}>{saved ? 'Done' : 'Cancel'}</Button>
        {saved && recipient.status === 'active' && (
          <Button type="button" onClick={() => onShare(newPin)}>Share login with new PIN</Button>
        )}
        {!saved && <Button type="submit" disabled={!validPin || saving}>{saving ? 'Saving PIN…' : 'Save new PIN'}</Button>}
      </div>
    </form>
  )
}

function UserForm({ initial, onDone, onShare }: { initial?: Partial<User>; onDone: () => void; onShare: (share: LoginShare) => void }) {
  const { addUser, updateUser } = useApp()
  const [form, setForm] = useState<Partial<User>>({ ...{
    name: '', email: '', role: 'viewer', status: 'active', password: '',
  }, ...initial, password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const minimum = form.role === 'admin' || form.role === 'donor' ? 12 : 4

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const shareAfterSave = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'share'
    if (!form.name?.trim() || !form.email?.trim()) return setError('Name and email are required')
    if (!initial?.userID && !form.password) return setError('Password is required for new users')
    setError('')
    setSaving(true)
    try {
      let recipient: User
      if (initial?.userID) {
        await updateUser(form as User)
        recipient = form as User
      } else {
        recipient = await addUser(form as Omit<User, 'userID' | 'createdDate'>)
      }
      if (shareAfterSave && recipient.status === 'active') {
        onShare({ recipient, password: form.password })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <Field label="Full Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
      <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
      <Field label="Mobile Number" hint="For bank donations, use the verified mobile number on the donor profile.">
        <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 9845012345" />
      </Field>
      <Field label="Password" required={!initial?.userID} hint={initial?.userID ? 'Use at least ' + minimum + ' characters, or leave blank to keep the current password.' : 'Use at least ' + minimum + ' characters.'}>
        <Input type="password" autoComplete="new-password" minLength={minimum} maxLength={256} value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!initial?.userID} />
      </Field>
      <Field label="Role">
        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="admin">Admin</option>
          <option value="accountant">Accountant</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
          <option value="collector">Collector</option>
          <option value="donor">Donor (own donations only)</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Field>
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone} type="button">Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.userID ? 'Save Changes' : 'Add User'}</Button>
        {form.status === 'active' && form.password && (
          <Button type="submit" value="share" variant="secondary" disabled={saving}>Save and share login</Button>
        )}
      </div>
    </form>
  )
}

function ResetAllForm({ onDone }: { onDone: () => void }) {
  const [resetKey, setResetKey] = useState('')
  const [preview, setPreview] = useState<ResetPreviewResult | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const PARAMETERS: Array<[string, string]> = [
    ['Donations', 'donations'],
    ['Expenses', 'expenses'],
    ['Payments', 'payments'],
    ['Transactions', 'transactions'],
  ]

  const runPreview = async () => {
    setBusy(true)
    setMsg('')
    setPreview(null)
    try {
      const p = await dataService.resetPreview(resetKey.trim())
      setPreview(p)
      if (p.total === 0) setMsg('Nothing to delete — the financial sheets are already empty.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setBusy(false)
    }
  }

  const runReset = async () => {
    setBusy(true)
    setMsg('')
    try {
      const result = await dataService.resetAllTransactions(resetKey.trim())
      setMsg(`${result.total} rows deleted. Balances rebuilt, receipt counter restarted. Reloading…`)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Reset failed')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <span>
          This permanently deletes every donation, expense, payment and transaction you have entered.
          Only spreadsheet Version history can recover the data afterwards.
        </span>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Reset password" hint="Apps Script editor → run getResetKeyNow to view it">
            <Input
              type="password"
              value={resetKey}
              onChange={(e) => { setResetKey(e.target.value); setPreview(null); setMsg('') }}
              placeholder="Reset password"
            />
          </Field>
        </div>
        <Button variant="secondary" onClick={runPreview} disabled={busy || !resetKey.trim()}>
          {busy && !preview ? 'Checking…' : 'Preview'}
        </Button>
      </div>

      {preview && preview.total > 0 && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Will be deleted</p>
          <ul className="text-sm text-slate-700 space-y-0.5">
            {PARAMETERS.map(([label, key]) => (
              <li key={key} className="flex justify-between">
                <span>{label}</span>
                <span className="font-medium">{preview.removed[key] ?? 0} rows</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm font-semibold">
            <span>Total</span><span>{preview.total} rows</span>
          </div>
          <Field label='Type RESET to confirm'>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
          </Field>
        </div>
      )}

      {msg && <p className={`text-sm ${msg.includes('deleted') || msg.startsWith('Nothing') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone} type="button">Close</Button>
        {preview && preview.total > 0 && (
          <Button variant="danger" onClick={runReset} disabled={busy || confirmText.trim().toUpperCase() !== 'RESET'}>
            {busy ? 'Deleting…' : 'Delete everything permanently'}
          </Button>
        )}
      </div>
    </div>
  )
}
