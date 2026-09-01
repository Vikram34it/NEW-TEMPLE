import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Signature, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CONFIG } from '../config/apiConfig'
import { Button, Card, Field, Input, Modal, Select } from '../components/ui'
import type { Role } from '../types'

type LoginMode = 'admin' | 'user' | 'donor'

const demoAccounts = [
  { role: 'Admin', email: 'admin@temple.org', pass: 'admin123' },
  { role: 'Accountant', email: 'accountant@temple.org', pass: 'accountant123' },
  { role: 'Manager', email: 'manager@temple.org', pass: 'manager123' },
  { role: 'Viewer', email: 'viewer@temple.org', pass: 'viewer123' },
  { role: 'Donor', email: 'donor@temple.org', mob: '9845012345', pass: 'donor123' },
]

const modes: { key: LoginMode; label: string }[] = [
  { key: 'admin', label: 'Admin Login' },
  { key: 'user', label: 'User Login' },
  { key: 'donor', label: 'Donor Login' },
]

export function LoginPage() {
  const { user, login } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const err = await login(email, password)
    setBusy(false)
    if (err) {
      setError(err)
    } else {
      navigate('/')
    }
  }

  const visibleAccounts = demoAccounts.filter((a) =>
    mode === 'admin' ? a.role === 'Admin'
    : mode === 'donor' ? a.role === 'Donor'
    : a.role !== 'Admin' && a.role !== 'Donor'
  )

  const isDonorMode = mode === 'donor'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-orange-600 items-center justify-center text-white mb-3">
            <Signature size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Temple Management</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {CONFIG.useMockData && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg p-3">
            <strong>Demo mode:</strong> Using local sample data ({CONFIG.webAppUrl ? '' : 'no API configured yet'}). Use the demo accounts below to sign in.
          </div>
        )}

        <Card className="p-6">
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
            {modes.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === m.key ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isDonorMode && (
              <p className="text-xs text-slate-500 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                Donor? Sign in with the <strong>mobile number</strong> or email registered with the temple to view your donations and receipts.
              </p>
            )}
            <Field label={isDonorMode ? 'Mobile Number or Email' : 'Email'} required>
              <Input
                type={isDonorMode ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isDonorMode ? 'Mobile number or email' : 'you@temple.org'}
                required
              />
            </Field>
            <Field label="Password" required>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {mode !== 'donor' && (
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setShowAddUser(true)}
                className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                <UserPlus size={16} />
                Admin? Add users &amp; set passwords
              </button>
            </div>
          )}
          {mode === 'donor' && (
            <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
              Don't have an account? Ask the temple admin to create your donor login.
            </div>
          )}
        </Card>

        {CONFIG.useMockData && visibleAccounts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {visibleAccounts.map((a) => (
              <button
                key={a.role}
                onClick={() => { setEmail(isDonorMode && a.mob ? a.mob : a.email); setPassword(a.pass) }}
                className="text-left text-xs bg-white border border-slate-200 rounded-lg p-2.5 hover:border-orange-400 hover:shadow-sm transition-all"
              >
                <span className="block font-semibold text-slate-700">{a.role}</span>
                <span className="text-slate-400">{a.email}</span>
              </button>
            ))}
          </div>
        )}

        <Modal open={showAddUser} onClose={() => setShowAddUser(false)} title="Add User">
          <AddUserForm onDone={() => setShowAddUser(false)} />
        </Modal>
      </div>
    </div>
  )
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const { addUser } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (!name.trim() || !email.trim() || !password) return setError('Name, email and password are required')
    setSaving(true)
    try {
      await addUser({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password, role, status: 'active' })
      setOk('User created. They can now sign in with the password you set.')
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRole('viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      {ok && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">{ok}</div>}
      <Field label="Full Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Sharma" required /></Field>
      <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@temple.org" required /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Mobile Number" hint="Donor portal matches donations by mobile first, then email">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9845012345" />
        </Field>
        <Field label="Password" required hint="Share this password with the user"><Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a password" required /></Field>
      </div>
      <Field label="Role">
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="admin">Admin</option>
          <option value="accountant">Accountant</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
          <option value="donor">Donor (own donations only)</option>
        </Select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone} type="button">Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Add User'}</Button>
      </div>
    </form>
  )
}
