import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Button, Field, Input, Select, Textarea } from '../ui'
import { DONATION_CATEGORIES, PAYMENT_METHODS } from '../../utils/constants'

interface Props {
  initial?: Partial<DonationLike>
  onDone: () => void
}

interface DonationLike {
  donationID: string
  date: string
  donorName: string
  phone: string
  email: string
  address: string
  amount: number
  category: string
  purpose: string
  paymentMethod: string
  transactionReference: string
  receivedBy: string
  notes: string
}

const empty: DonationLike = {
  donationID: '',
  date: new Date().toISOString().slice(0, 10),
  donorName: '',
  phone: '',
  email: '',
  address: '',
  amount: 0,
  category: DONATION_CATEGORIES[0],
  purpose: '',
  paymentMethod: PAYMENT_METHODS[0],
  transactionReference: '',
  receivedBy: '',
  notes: '',
}

export function DonationForm({ initial, onDone }: Props) {
  const { addDonation, updateDonation, user, people } = useApp()
  const [form, setForm] = useState<DonationLike>({ ...empty, ...initial })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [customCategory, setCustomCategory] = useState(false)

  const knownDonors = people.filter((p) => p.personType.includes('Donor'))

  const set = <K extends keyof DonationLike>(key: K, value: DonationLike[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.donorName.trim()) return setError('Donor name is required')
    if (!form.amount || form.amount <= 0) return setError('Donation amount must be greater than zero')
    const submission = { ...form, receivedBy: form.receivedBy || user?.name || '' }

    setError('')
    setSaving(true)
    try {
      if (initial?.donationID) {
        await updateDonation({ ...(submission as unknown as DonationLike), donationID: initial.donationID } as never)
      } else {
        await addDonation(submission as never)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save donation')
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
        <Field label="Choose a Saved Donor (optional)">
          <select
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none"
            value={form.donorName}
            onChange={(e) => {
              const name = e.target.value
              set('donorName', name)
              const donor = knownDonors.find((d) => d.name === name)
              if (donor) {
                set('phone', donor.phone)
                set('email', donor.email)
                set('address', donor.address)
              } else {
                if (name === '') set('phone', '')
              }
            }}
          >
            <option value="">— Pick a saved donor (or type below) —</option>
            {knownDonors.map((d) => (
              <option key={d.personID} value={d.name}>{d.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Tip: choosing a saved donor auto-fills their contact details and links the donation to their Donor Care profile.</p>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Donor Name" required>
          <Input value={form.donorName} onChange={(e) => set('donorName', e.target.value)} placeholder="Full name (or pick from the list above)" required />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email" />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Address" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Amount (₹)" required>
          <Input type="number" min="0" value={form.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} placeholder="0.00" required />
        </Field>
        <Field label="Payment Method" required>
          <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Category" required>
          {!customCategory ? (
            <div className="flex gap-2">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {DONATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Button type="button" variant="secondary" size="sm" onClick={() => setCustomCategory(true)}>Custom</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="New category" />
              <Button type="button" variant="secondary" size="sm" onClick={() => setCustomCategory(false)}>Default</Button>
            </div>
          )}
        </Field>
        <Field label="Purpose">
          <Input value={form.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="Purpose of donation" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Transaction Reference">
          <Input value={form.transactionReference} onChange={(e) => set('transactionReference', e.target.value)} placeholder="UPI ref / NEFT no." />
        </Field>
        <Field label="Received By">
          <Input value={form.receivedBy} onChange={(e) => set('receivedBy', e.target.value)} placeholder={user?.name || 'Who received'} />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional notes" />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.donationID ? 'Save Changes' : 'Add Donation'}</Button>
      </div>
    </form>
  )
}
