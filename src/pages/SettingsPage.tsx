import { useState } from 'react'
import { Save, Plus, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Card, CardHeader, Field, Input, Select, Badge, Modal, PageHeader } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatDate } from '../utils/helpers'
import type { Role, User } from '../types'

export function SettingsPage() {
  const { settings, updateSettings, users, auditLog, deleteUser, can } = useApp()
  const [form, setForm] = useState({ ...settings })
  const [saveMsg, setSaveMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
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
        <DataTable
          columns={userColumns}
          data={users}
          searchable
          searchPlaceholder="Search users..."
          pageSize={10}
          rowKey={(u) => u.userID}
          toolbar={can('*') && <Button size="sm" onClick={() => setShowUser(true)}><Plus size={14} /> Add User</Button>}
          actions={(u) => can('*') && (
            <div className="flex gap-1 justify-end">
              <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
              {u.userID !== 'USR-0001' && (
                <button onClick={() => { if (confirm(`Delete user ${u.name}?`)) void deleteUser(u.userID).catch(() => {}) }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
              )}
            </div>
          )}
        />
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
        <UserForm onDone={() => setShowUser(false)} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && <UserForm initial={editUser} onDone={() => setEditUser(null)} />}
      </Modal>
    </div>
  )
}

function roleColor(role: Role): 'green' | 'red' | 'amber' | 'blue' | 'orange' | 'slate' | 'violet' {
  switch (role) {
    case 'admin': return 'red'
    case 'accountant': return 'blue'
    case 'manager': return 'orange'
    case 'viewer': return 'slate'
  }
}

function UserForm({ initial, onDone }: { initial?: Partial<User>; onDone: () => void }) {
  const { addUser, updateUser } = useApp()
  const [form, setForm] = useState<Partial<User>>({ ...{
    name: '', email: '', role: 'viewer', status: 'active', password: '',
  }, ...initial })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim() || !form.email?.trim()) return setError('Name and email are required')
    if (!initial?.userID && !form.password) return setError('Password is required for new users')
    setError('')
    setSaving(true)
    try {
      if (initial?.userID) {
        await updateUser(form as User)
      } else {
        await addUser(form as Omit<User, 'userID' | 'createdDate'>)
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
      {!initial?.userID && (
        <Field label="Password" required><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set password" required /></Field>
      )}
      <Field label="Role">
        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="admin">Admin</option>
          <option value="accountant">Accountant</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone} type="button">Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.userID ? 'Save Changes' : 'Add User'}</Button>
      </div>
    </form>
  )
}
