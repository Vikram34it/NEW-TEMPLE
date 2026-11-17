import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Button, Field, Input, Select, Textarea } from '../ui'
import { CONSTRUCTION_EXPENSE_CATEGORIES, OPERATIONS_EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../utils/constants'

interface DonationLike2 {
  expenseID: string
  accountID?: string
  date: string
  category: string
  description: string
  amount: number
  paymentMethod: string
  vendorID: string
  vendorName: string
  billNumber: string
  transactionReference: string
  projectID: string
  projectName: string
  approvedBy: string
  paidBy: string
  notes: string
}

const empty: DonationLike2 = {
  expenseID: '',
  date: new Date().toISOString().slice(0, 10),
  category: '',
  description: '',
  amount: 0,
  paymentMethod: PAYMENT_METHODS[0],
  vendorID: '',
  vendorName: '',
  billNumber: '',
  transactionReference: '',
  projectID: '',
  projectName: '',
  approvedBy: '',
  paidBy: '',
  notes: '',
}

const ALL_CATEGORIES = [...CONSTRUCTION_EXPENSE_CATEGORIES, ...OPERATIONS_EXPENSE_CATEGORIES]

interface Props {
  initial?: Partial<DonationLike2>
  onDone: () => void
}

export function ExpenseForm({ initial, onDone }: Props) {
  const { addExpense, updateExpense, user, vendors, accounts } = useApp()
  const [form, setForm] = useState<DonationLike2>({ ...empty, ...initial })
  const [categoryGroup, setCategoryGroup] = useState<'construction' | 'operations'>(() =>
    CONSTRUCTION_EXPENSE_CATEGORIES.some((category) => category === initial?.category) ? 'construction' : 'operations'
  )
  const [customCategory, setCustomCategory] = useState(() =>
    Boolean(initial?.category && !ALL_CATEGORIES.some((category) => category === initial.category))
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const bankAccounts = accounts.filter((account) => account.type === 'bank')
  const chooseBank = !initial?.expenseID && form.paymentMethod !== 'Cash'
  const payingBank = bankAccounts.find((account) => account.accountID === form.accountID)?.accountID ||
    bankAccounts.find((account) => account.accountName === 'ICICI')?.accountID || bankAccounts[0]?.accountID || ''

  const set = <K extends keyof DonationLike2>(key: K, value: DonationLike2[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const categories = categoryGroup === 'construction'
    ? CONSTRUCTION_EXPENSE_CATEGORIES
    : OPERATIONS_EXPENSE_CATEGORIES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) return setError('Description is required')
    if (!form.category.trim()) return setError('Choose an expense category.')
    if (chooseBank && !payingBank) return setError('Add a bank account before recording a bank payment.')
    if (!form.amount || form.amount <= 0) return setError('Amount must be greater than zero')
    const approvedBy = form.approvedBy || user?.name || ''
    const paidBy = form.paidBy || user?.name || ''

    setError('')
    setSaving(true)
    try {
      if (initial?.expenseID) {
        await updateExpense({ ...form, expenseID: initial.expenseID, approvedBy, paidBy } as never)
      } else {
        await addExpense({ ...form, accountID: chooseBank ? payingBank : undefined, approvedBy, paidBy } as never)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label="Amount (₹)" required>
          <Input type="number" min="0" value={form.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} placeholder="0.00" required />
        </Field>
      </div>

      <Field label="Description" required>
        <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What was this expense for?" required />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Category" required hint="Choose a construction category only for expenses related to temple construction.">
          {!customCategory ? (
            <div className="space-y-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { if (categoryGroup !== 'construction') set('category', ''); setCategoryGroup('construction') }}
                  className={`flex-1 px-2 py-1 text-xs rounded-lg ${categoryGroup === 'construction' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Construction
                </button>
                <button
                  type="button"
                  onClick={() => { if (categoryGroup !== 'operations') set('category', ''); setCategoryGroup('operations') }}
                  className={`flex-1 px-2 py-1 text-xs rounded-lg ${categoryGroup === 'operations' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Operations
                </button>
              </div>
              <div className="flex gap-2">
                <Select required value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Button type="button" variant="secondary" size="sm" onClick={() => setCustomCategory(true)}>Custom</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="New category" />
              <Button type="button" variant="secondary" size="sm" onClick={() => {
                if (!categories.some((category) => category === form.category)) set('category', '')
                setCustomCategory(false)
              }}>Default</Button>
            </div>
          )}
        </Field>
        <Field label="Payment Method" required>
          <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        {chooseBank && (
          <Field label="Paying bank account" required>
            <Select required value={payingBank} onChange={(event) => set('accountID', event.target.value)}>
              {!bankAccounts.length && <option value="">Add a bank account first</option>}
              {bankAccounts.map((account) => <option key={account.accountID} value={account.accountID}>{account.accountName}</option>)}
            </Select>
          </Field>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Vendor / Person Paid">
          <Select
            value={form.vendorName}
            onChange={(e) => {
              const v = vendors.find((x) => x.companyName === e.target.value || x.contactPerson === e.target.value)
              set('vendorName', e.target.value)
              set('vendorID', v?.vendorID || '')
            }}
          >
            <option value="">None</option>
            {vendors.map((v) => (
              <option key={v.vendorID} value={v.companyName}>{v.companyName}</option>
            ))}
          </Select>
        </Field>
        <Field label="Bill Number">
          <Input value={form.billNumber} onChange={(e) => set('billNumber', e.target.value)} placeholder="Bill / invoice no." />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">

        <Field label="Transaction Reference">
          <Input value={form.transactionReference} onChange={(e) => set('transactionReference', e.target.value)} placeholder="Ref no." />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Approved By">
          <Input value={form.approvedBy} onChange={(e) => set('approvedBy', e.target.value)} placeholder={user?.name || ''} />
        </Field>
        <Field label="Paid By">
          <Input value={form.paidBy} onChange={(e) => set('paidBy', e.target.value)} placeholder={user?.name || ''} />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional notes" />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.expenseID ? 'Save Changes' : 'Add Expense'}</Button>
      </div>
    </form>
  )
}
