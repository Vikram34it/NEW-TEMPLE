import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'
import { DONATION_CATEGORIES, PAYMENT_METHODS } from '../../utils/constants'
import type { Person } from '../../types'

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
  panNumber?: string
  aadhaarNumber?: string
  need80G: boolean
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
  panNumber: '',
  aadhaarNumber: '',
  need80G: false,
}

interface DonorOption {
  name: string
  phone: string
  email: string
  address: string
  panNumber?: string
  aadhaarNumber?: string
}

// Initialise the form from an optional existing donation. Dates are forced to
// yyyy-mm-dd so the <input type="date"> renders it (it blanks any other format,
// which made editing look like it "forgot" the date).
function seed(initial?: Partial<DonationLike>): DonationLike {
  const merged: DonationLike = { ...empty, ...initial }
  if (merged.date && /^\d{4}-\d{2}-\d{2}$/.test(merged.date) === false) {
    merged.date = new Date(merged.date).toISOString().slice(0, 10)
  }
  return merged
}

export function DonationForm({ initial, onDone }: Props) {
  const { addDonation, updateDonation, user, people, donations, addPerson } = useApp()
  const [form, setForm] = useState<DonationLike>(() => seed(initial))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [customCategory, setCustomCategory] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)

  // Build the donor pick-list from BOTH saved people tagged as Donor AND any
  // donor name seen on past donations, so every past donor can be picked.
  const donorOptions = useMemo<DonorOption[]>(() => {
    const map = new Map<string, DonorOption>()
    const personDonors = people.filter((p) => p.personType.includes('Donor'))
    for (const p of personDonors) {
      map.set(p.name.toLowerCase(), {
        name: p.name,
        phone: p.phone,
        email: p.email,
        address: p.address,
        panNumber: p.panNumber,
        aadhaarNumber: p.aadhaarNumber,
      })
    }
    // Past donations (most recent first) fill in any gaps in the person data.
    const sorted = [...donations].sort((a, b) => b.date.localeCompare(a.date))
    for (const d of sorted) {
      const n = String(d.donorName || '').trim()
      if (!n) continue
      const key = n.toLowerCase()
      const existing = map.get(key)
      map.set(key, {
        name: n,
        phone: (existing?.phone || d.phone || '') as string,
        email: (existing?.email || d.email || '') as string,
        address: (existing?.address || d.address || '') as string,
        panNumber: existing?.panNumber || d.panNumber || '',
        aadhaarNumber: existing?.aadhaarNumber || d.aadhaarNumber || '',
      })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [people, donations])

  const set = <K extends keyof DonationLike>(key: K, value: DonationLike[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handlePickDonor = (name: string) => {
    const donor = donorOptions.find((d) => d.name.toLowerCase() === name.toLowerCase()) || donorOptions.find((d) => d.name === name)
    set('donorName', name)
    if (donor) {
      // Fill the saved personal details but keep date/amount/transaction fresh.
      set('phone', donor.phone || '')
      set('email', donor.email || '')
      set('address', donor.address || '')
      set('panNumber', donor.panNumber || '')
      set('aadhaarNumber', donor.aadhaarNumber || '')
    }
  }

  // After a new person/donor is added, auto-fill the donation fields with their
  // details and switch the donor picker to them.
  const handlePersonAdded = (p: Person) => {
    handlePickDonor(p.name)
    setShowAddPerson(false)
  }

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

  // Prevent the Enter key (in any input/select) from submitting the form early.
  // Donations should only be saved when the user explicitly clicks "Add Donation".
  const preventEarlySubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement
    const tag = target.tagName
    // Allow Enter in the textarea (to add newlines) and on the submit button.
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return
    if (e.key === 'Enter') e.preventDefault()
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEarlySubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label="Choose a Donor (optional)">
          <div className="flex gap-2">
            <select
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none"
              value={form.donorName}
              onChange={(e) => handlePickDonor(e.target.value)}
            >
              <option value="">— Pick a past donor (or type below) —</option>
              {donorOptions.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddPerson(true)}>+ Add Person</Button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tip: picking a donor fills in their saved contact details, PAN and Aadhaar — leave the date, amount and transaction reference fresh each time.</p>
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
        <Field label="PAN Number" hint="Required for an 80G tax-exemption receipt">
          <Input value={form.panNumber} onChange={(e) => set('panNumber', e.target.value)} placeholder="ABCDE1234F" />
        </Field>
        <Field label="Aadhaar Number">
          <Input value={form.aadhaarNumber} onChange={(e) => set('aadhaarNumber', e.target.value)} placeholder="12-digit number" maxLength={12} />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.need80G}
          onChange={(e) => set('need80G', e.target.checked)}
          className="w-4 h-4 accent-orange-600"
        />
        <div>
          <p className="text-sm font-medium text-slate-700">Donor needs a tax-exemption (80G) receipt</p>
          <p className="text-xs text-slate-400">Tick this if the donor wants a receipt with PAN for income-tax deduction.</p>
        </div>
      </label>

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

      <Modal open={showAddPerson} onClose={() => setShowAddPerson(false)} title="Add New Person / Donor">
        <AddPersonForm onDone={handlePersonAdded} onCancel={() => setShowAddPerson(false)} addPerson={addPerson} />
      </Modal>
    </form>
  )
}

function AddPersonForm({ onDone, onCancel, addPerson }: {
  onDone: (p: Person) => void
  onCancel: () => void
  addPerson: (p: Omit<Person, 'personID'>) => Promise<Person>
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    setError('')
    setSaving(true)
    try {
      const created = await addPerson({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        personType: ['Donor'],
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        notes: '',
        panNumber: panNumber.trim() || undefined,
        aadhaarNumber: aadhaarNumber.trim() || undefined,
      })
      onDone(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add person')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} onKeyDown={(e) => { if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'BUTTON' && e.key === 'Enter') e.preventDefault() }} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /></Field>
        <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" /></Field>
      </div>
      <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="PAN Number" hint="Needed if the donor wants a tax (80G) receipt">
          <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="ABCDE1234F" />
        </Field>
        <Field label="Aadhaar Number">
          <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="12-digit number" maxLength={12} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Person'}</Button>
      </div>
    </form>
  )
}
