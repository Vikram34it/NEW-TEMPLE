import { useState } from 'react'
import { Plus, Wallet, Landmark, PiggyBank, HandCoins } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Field, Input, Card } from '../components/ui'
import { formatCurrency } from '../utils/helpers'
import type { Account } from '../types'

const accountIcon = (type: string) => {
  switch (type) {
    case 'cash': return <Wallet size={20} />
    case 'bank': return <Landmark size={20} />
    case 'construction': return <PiggyBank size={20} />
    case 'donation': return <HandCoins size={20} />
    default: return <Wallet size={20} />
  }
}

export function AccountsPage() {
  const { accounts, transactions, can, addAccount } = useApp()
  const [showAdd, setShowAdd] = useState(false)

  const accountTxs = (account: string) => transactions.filter((t) => t.account === account)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cash and bank balances</p>
        </div>
        {can('*') && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Account</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {accounts.map((a) => {
          const txs = accountTxs(a.accountName)
          const received = txs.filter((t) => t.incomeOrExpense === 'income').reduce((s, t) => s + t.amount, 0)
          const spent = txs.filter((t) => t.incomeOrExpense === 'expense').reduce((s, t) => s + t.amount, 0)
          return (
            <Card key={a.accountID} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2.5 rounded-lg bg-orange-50 text-orange-600`}>{accountIcon(a.type)}</div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{a.accountName}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{a.type} account</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(a.currentBalance)}</p>
              <p className="text-[11px] text-slate-400">Opening: {formatCurrency(a.openingBalance)}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-slate-500">Received</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(received)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-slate-500">Spent</p>
                  <p className="font-semibold text-red-600">{formatCurrency(spent)}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Account">
        <AccountForm
          onDone={async (a) => { await addAccount(a); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  )
}

function AccountForm({ onDone, onClose }: { onDone: (a: Omit<Account, 'accountID'>) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ accountName: '', openingBalance: 0, currentBalance: 0, type: 'bank', notes: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.accountName.trim()) return setError('Account name is required')
    setError('')
    setSaving(true)
    try {
      await onDone({ ...form, openingBalance: Number(form.openingBalance) || 0, currentBalance: Number(form.currentBalance) || 0 } as Omit<Account, 'accountID'>)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <Field label="Account Name" required>
        <Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="e.g. Temple Cash" required />
      </Field>
      <Field label="Account Type">
        <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="construction">Construction</option>
          <option value="donation">Donation</option>
        </select>
      </Field>
      <Field label="Opening Balance (₹)">
        <Input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} />
      </Field>
      <Field label="Current Balance (calculated) - leave for auto-update">
        <Input type="number" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: Number(e.target.value) })} className="bg-slate-50" />
      </Field>
      <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Account'}</Button>
      </div>
    </form>
  )
}
