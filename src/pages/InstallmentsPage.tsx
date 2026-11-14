import { useEffect, useState } from 'react'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dataService } from '../services/apiService'
import type { Donation, InstallmentPlan } from '../types'
import { formatCurrency, formatDate, formatDateTime, normalizePhone } from '../utils/helpers'

type Installment = { due: string; paise: number }
const money = (paise: number) => formatCurrency(paise / 100)

function makeSchedule(total: number, count: number, firstDue: string): Installment[] {
  const start = new Date(firstDue + 'T00:00:00Z')
  if (!Number.isSafeInteger(total) || !Number.isInteger(count) || count < 1 || count > 120 ||
      total < count || !Number.isFinite(start.getTime())) throw new Error('Enter a positive total, first due date, and 1–120 installments.')
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1))
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    date.setUTCDate(Math.min(lastDay, start.getUTCDate()))
    return { due: date.toISOString().slice(0, 10), paise: Math.floor(total / count) + Number(index < total % count) }
  })
}

export function InstallmentsPage() {
  const { people } = useApp()
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [receipts, setReceipts] = useState<Donation[]>([])
  const [donorID, setDonorID] = useState('')
  const [purpose, setPurpose] = useState('')
  const [total, setTotal] = useState('')
  const [count, setCount] = useState('1')
  const [firstDue, setFirstDue] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const donors = people.filter((person) => person.personType.includes('Donor'))

  useEffect(() => {
    let active = true
    void Promise.all([dataService.getInstallmentPlans(), dataService.getDonations()])
      .then(([loadedPlans, loadedReceipts]) => { if (active) { setPlans(loadedPlans); setReceipts(loadedReceipts) } })
      .catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [])

  async function save(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      const [updatedPlans, updatedReceipts] = await Promise.all([dataService.getInstallmentPlans(), dataService.getDonations()])
      setPlans(updatedPlans)
      setReceipts(updatedReceipts)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the change.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Donor Installments" subtitle="Commitments, linked receipts, and payment reminders" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={async (event) => {
          event.preventDefault()
          const saved = await save(() => dataService.createInstallmentPlan(donorID, purpose, makeSchedule(Math.round(Number(total) * 100), Number(count), firstDue)))
          if (saved) { setTotal(''); setPurpose('') }
        }}>
          <Field label="Donor"><Select required value={donorID} onChange={(event) => setDonorID(event.target.value)}>
            <option value="">Choose a donor</option>
            {donors.map((donor) => <option key={donor.personID} value={donor.personID}>{donor.name}{donor.phone ? ' · ' + donor.phone : ''}</option>)}
          </Select></Field>
          <Field label="Purpose"><Input required maxLength={200} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></Field>
          <Field label="Committed amount (₹)"><Input required type="number" step="0.01" min="0.01" value={total} onChange={(event) => setTotal(event.target.value)} /></Field>
          <Field label="Monthly installments"><Input required type="number" min="1" max="120" value={count} onChange={(event) => setCount(event.target.value)} /></Field>
          <Field label="First due date"><Input required type="date" value={firstDue} onChange={(event) => setFirstDue(event.target.value)} /></Field>
          <div className="flex items-end"><Button type="submit" disabled={busy}>Create commitment</Button></div>
        </form>
      </Card>

      {plans.map((plan) => {
        const donor = donors.find((person) => person.personID === plan.donorID)
        return <Commitment key={plan.planID} plan={plan} donorName={donor?.name || 'Donor profile unavailable'} phone={String(donor?.phone || '')}
          receipts={receipts.filter((receipt) => receipt.donorID === plan.donorID)} busy={busy} save={save} />
      })}
      {!plans.length && <p className="text-sm text-slate-600">{busy ? 'Loading commitments…' : 'No commitments recorded.'}</p>}
    </div>
  )
}

function Commitment({ plan, donorName, phone, receipts, busy, save }: {
  plan: InstallmentPlan
  donorName: string
  phone: string
  receipts: Donation[]
  busy: boolean
  save: (action: () => Promise<unknown>) => Promise<boolean>
}) {
  const [receiptID, setReceiptID] = useState('')
  const [messageType, setMessageType] = useState<'update' | 'reminder' | null>(null)
  const schedule: Installment[] = JSON.parse(plan.schedule)
  const linked = receipts.filter((receipt) => receipt.installmentPlanID === plan.planID)
  const received = linked.reduce((sum, receipt) => sum + Math.round(receipt.amount * 100), 0)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const { committed, installments } = schedule.reduce((result, item) => {
    const allocated = Math.min(item.paise, Math.max(0, received - result.committed))
    result.installments.push({ ...item, remaining: item.paise - allocated })
    result.committed += item.paise
    return result
  }, { committed: 0, installments: [] as Array<Installment & { remaining: number }> })
  const pending = installments.filter((item) => item.remaining > 0)
  const next = pending[0]
  const overdue = pending.filter((item) => item.due < today).length
  const message = [
    'Hare Krishna, ' + donorName + '.',
    messageType === 'reminder' ? 'A gentle reminder about your commitment towards ' + plan.purpose + '.' : 'Thank you for supporting ' + plan.purpose + '.',
    'We have received ' + money(received) + ' towards your commitment of ' + money(committed) + '.',
    (schedule.length - pending.length) + ' of ' + schedule.length + ' installments are fully paid. ' + pending.length + ' pending. Outstanding amount ' + money(Math.max(0, committed - received)) + '.',
    next ? 'The next unpaid installment has ' + money(next.remaining) + ' remaining, due ' + formatDate(next.due) + '.' : '',
    'Thank you for your continued support.',
  ].filter(Boolean).join('\n')
  const digits = normalizePhone(phone)
  const whatsAppPhone = digits.length === 10 ? '91' + digits : digits

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">{donorName}</h2>
        <p className="text-sm text-slate-600">{plan.purpose}</p>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p>Committed <strong>{money(committed)}</strong></p>
        <p>Received <strong>{money(received)}</strong></p>
        <p>Outstanding <strong>{money(Math.max(0, committed - received))}</strong></p>
      </div>
      <p className="text-sm">{schedule.length - pending.length} fully paid · {pending.length} pending · {overdue} overdue</p>
      {next && <p className="text-sm">Next unpaid installment: {money(next.remaining)} due {formatDate(next.due)}</p>}
      {received > committed && <p className="text-sm">Received above commitment: {money(received - committed)}</p>}
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Installment schedule</summary>
        <ul className="mt-2 space-y-1">{installments.map((item, index) =>
          <li key={index}>{index + 1}. {formatDate(item.due)} · {money(item.paise)} · {item.remaining ? money(item.remaining) + ' remaining' : 'Paid'}</li>)}</ul>
      </details>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Choose an existing donation receipt">
          <Select value={receiptID} onChange={(event) => setReceiptID(event.target.value)}>
            <option value="">Select receipt</option>
            {receipts.filter((receipt) => !receipt.installmentPlanID).map((receipt) => <option key={receipt.donationID} value={receipt.donationID}>
              {receipt.receiptNumber || receipt.donationID} · {formatDate(receipt.date)} · {formatCurrency(receipt.amount)} · {receipt.purpose || receipt.category}
            </option>)}
          </Select>
        </Field>
        <Button disabled={!receiptID || busy} onClick={async () => {
          if (await save(() => dataService.linkInstallmentPayment(plan.planID, receiptID))) setReceiptID('')
        }}>Link payment</Button>
      </div>
      {linked.length > 0 && <ul className="space-y-1 text-sm">{linked.map((receipt) => <li key={receipt.donationID} className="flex items-center gap-2">
        <span>{receipt.receiptNumber || receipt.donationID} · {formatCurrency(receipt.amount)}</span>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save(() => dataService.linkInstallmentPayment(plan.planID, receipt.donationID, true))}>Unlink</Button>
      </li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setMessageType('update')}>Preview payment update</Button>
        {next && <Button variant="secondary" onClick={() => setMessageType('reminder')}>Preview reminder</Button>}
      </div>
      {plan.lastReminderAt && <p className="text-sm text-slate-600">Last reminder marked sent {formatDateTime(plan.lastReminderAt)}</p>}
      {messageType && <div className="space-y-2">
        <Textarea aria-label="Donor message preview" value={message} readOnly rows={6} />
        {whatsAppPhone && <a className="text-sm font-medium text-orange-700 underline" target="_blank" rel="noreferrer"
          href={'https://wa.me/' + whatsAppPhone + '?text=' + encodeURIComponent(message)}>Open WhatsApp draft</a>}
        {messageType === 'reminder' && next && <Button variant="ghost" disabled={busy} onClick={() => void save(() => dataService.recordInstallmentReminder(plan.planID))}>Mark reminder sent</Button>}
        <Button variant="ghost" onClick={() => setMessageType(null)}>Close preview</Button>
      </div>}
    </Card>
  )
}
