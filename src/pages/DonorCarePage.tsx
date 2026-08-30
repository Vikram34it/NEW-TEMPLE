import { useMemo, useState } from 'react'
import { Plus, Check, Copy, Send, MessageCircle, Heart, HandCoins, Phone, Mail, Trash2, CalendarHeart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, PageHeader, Card, StatCard, Modal, Field, Input, Select, Textarea, Badge } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate, fillTemplate, todayStr } from '../utils/helpers'
import { DONOR_MESSAGE_TEMPLATES, COMMUNICATION_CHANNELS, COMMUNICATION_TYPES } from '../utils/constants'
import type { Communication, Donation, Person } from '../types'

interface DonorSummary {
  key: string
  name: string
  person?: Person
  phone: string
  email: string
  city: string
  totalDonated: number
  donations: Donation[]
  lastDonation?: Donation
  birthday?: string
  anniversary?: string
  preferredChannel?: string
}

function waPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length === 10 ? '91' + digits : digits
}

function donorKeyOf(name: string, person?: Person): string {
  return person ? person.personID : `name:${String(name).trim().toLowerCase()}`
}

export function DonorCarePage() {
  const { people, donations, communications, addCommunication, deleteCommunication } = useApp()
  const [compose, setCompose] = useState<{ donor?: DonorSummary } | null>(null)
  const [lapsedMonths, setLapsedMonths] = useState(6)
  const [tab, setTab] = useState<'thanks' | 'lapsed' | 'occasions' | 'log'>('thanks')

  const today = todayStr()
  const currentMonth = today.slice(5, 7)

  const donors = useMemo<DonorSummary[]>(() => {
    const map = new Map<string, DonorSummary>()
    const donorPeople = people.filter((p) => p.personType.includes('Donor'))

    for (const p of donorPeople) {
      map.set(p.personID, {
        key: p.personID,
        name: p.name,
        person: p,
        phone: p.phone || '',
        email: p.email || '',
        city: p.city || '',
        totalDonated: 0,
        donations: [],
        birthday: p.birthday,
        anniversary: p.anniversary,
        preferredChannel: p.preferredChannel,
      })
    }

    for (const d of donations) {
      const person = donorPeople.find(
        (p) => p.personID === d.donorID || p.name.toLowerCase() === String(d.donorName).toLowerCase()
      )
      const key = person ? person.personID : donorKeyOf(d.donorName)
      const sum = map.get(key) || {
        key,
        name: d.donorName || person?.name || '',
        person,
        phone: person ? person.phone || '' : d.phone || '',
        email: person ? person.email || '' : d.email || '',
        city: person ? person.city || '' : '',
        totalDonated: 0,
        donations: [] as Donation[],
        birthday: person?.birthday,
        anniversary: person?.anniversary,
        preferredChannel: person?.preferredChannel,
      }
      sum.donations.push(d)
      sum.totalDonated += d.amount
      if (!sum.phone && d.phone) sum.phone = d.phone
      if (!sum.email && d.email) sum.email = d.email
      if (!sum.lastDonation || d.date > sum.lastDonation.date) sum.lastDonation = d
      map.set(key, sum)
    }

    return [...map.values()].sort((a, b) => b.totalDonated - a.totalDonated)
  }, [people, donations])

  const thankedAfter = (donor: DonorSummary, comms: Communication[]): boolean => {
    if (!donor.lastDonation) return true
    return comms.some(
      (c) =>
        (c.personID === donor.key || c.donorName.toLowerCase() === donor.name.toLowerCase()) &&
        (c.type === 'Thank You' || c.type === 'Receipt') &&
        String(c.date).slice(0, 10) >= donor.lastDonation!.date
    )
  }

  const toThank = useMemo(
    () => donors.filter((d) => d.donations.length > 0 && !thankedAfter(d, communications)),
    [donors, communications]
  )

  const lapsed = useMemo(() => {
    const cutoff = new Date(today)
    cutoff.setMonth(cutoff.getMonth() - lapsedMonths)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return donors.filter((d) => d.donations.length > 0 && d.lastDonation && d.lastDonation.date < cutoffStr)
  }, [donors, lapsedMonths, today])

  const occasions = useMemo(() => {
    const withBD = people
      .filter((p) => p.birthday && p.birthday.slice(5, 7) === currentMonth)
      .map((p) => ({ p, kind: 'Birthday' as const, date: p.birthday as string }))
    const withAnn = people
      .filter((p) => p.anniversary && p.anniversary.slice(5, 7) === currentMonth)
      .map((p) => ({ p, kind: 'Anniversary' as const, date: p.anniversary as string }))
    return [...withBD, ...withAnn].sort((a, b) => a.date.localeCompare(b.date))
  }, [people, currentMonth])

  const logRows = useMemo(() => [...communications].sort((a, b) => b.date.localeCompare(a.date)), [communications])

  const logColumns: Column<Communication>[] = [
    { header: 'Date', accessor: (c) => formatDate(c.date), sortable: true, sortKey: 'date' },
    { header: 'Donor', accessor: (c) => <span className="font-medium text-slate-700">{c.donorName}</span>, sortable: true, sortKey: 'donorName' },
    { header: 'Channel', accessor: (c) => <Badge color={channelColor(c.channel)}>{c.channel}</Badge> },
    { header: 'Type', accessor: (c) => c.type },
    { header: 'Subject', accessor: (c) => <span className="max-w-[220px] truncate block">{c.subject || '—'}</span> },
    { header: 'Status', accessor: (c) => <Badge color={c.status === 'Sent' ? 'green' : 'slate'}>{c.status}</Badge> },
    { header: 'Sent By', accessor: (c) => c.sentBy || '—' },
  ]

  const giveList = (rows: DonorSummary[]) => (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Nothing here — all looked after.</p>}
      {rows.map((d) => (
        <div key={d.key} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
          <div className="w-9 h-9 shrink-0 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm uppercase">
            {d.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {d.lastDonation && <>Last: {formatCurrency(d.lastDonation.amount)} on {formatDate(d.lastDonation.date)}</>}
              {!d.lastDonation && d.city}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1">{d.phone || '—'}</span>
            {d.email && <span className="flex items-center gap-1">{d.email}</span>}
          </div>
          <Button size="sm" onClick={() => setCompose({ donor: d })}>
            <Send size={14} /> Message
          </Button>
        </div>
      ))}
    </div>
  )

  const occasionColor = (kind: string) => (kind === 'Birthday' ? 'orange' : 'blue') as 'orange' | 'blue'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Donor Care"
        subtitle="Stay close to your supporters — thank them, remember their special days and bring them back"
        action={
          <Button onClick={() => setCompose({})} disabled={donors.length === 0}>
            <Plus size={16} /> Send Message
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Donors to Thank"
          value={String(toThank.length)}
          icon={<HandCoins size={20} />}
          color="green"
          sub="Recent donation without a thank-you"
        />
        <StatCard
          label="Lapsed Donors"
          value={String(lapsed.length)}
          icon={<Heart size={20} />}
          color="red"
          sub={`No donation in the last ${lapsedMonths} months`}
        />
        <StatCard
          label={`Occasions in ${new Date().toLocaleString('en', { month: 'long' })}`}
          value={String(occasions.length)}
          icon={<CalendarHeart size={20} />}
          color="violet"
          sub="Birthdays & anniversaries this month"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['thanks', 'Needs Thanks', toThank.length],
            ['lapsed', 'Lapsed Donors', lapsed.length],
            ['occasions', 'Birthdays & Anniversaries', occasions.length],
            ['log', 'Communication Log', logRows.length],
          ] as const
        ).map(([key, label, count]) => (
          <Button key={key} variant={tab === key ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(key)}>
            {label} ({count})
          </Button>
        ))}
      </div>

      {tab === 'thanks' && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Smart donors — thank them personally</p>
          {giveList(toThank)}
        </Card>
      )}

      {tab === 'lapsed' && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-slate-700">Donors we haven't heard from recently</p>
            <Select className="w-36" value={String(lapsedMonths)} onChange={(e) => setLapsedMonths(Number(e.target.value))}>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
              <option value="24">Last 24 months</option>
            </Select>
          </div>
          {giveList(lapsed)}
        </Card>
      )}

      {tab === 'occasions' && (
        <Card className="p-4">
          <div className="space-y-2">
            {occasions.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No birthdays or anniversaries this month. Add dates on the People page.</p>}
            {occasions.map(({ p, kind, date }) => {
              const donor = donors.find((d) => d.key === p.personID)
              return (
                <div key={`${p.personID}-${kind}`} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {kind} • {formatDate(date)} • {p.preferredChannel || p.phone || p.email || 'No contact'}
                    </p>
                  </div>
                  <Badge color={occasionColor(kind)}>{kind}</Badge>
                  <Button size="sm" onClick={() => setCompose({ donor })}>
                    <Send size={14} /> Wish
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {tab === 'log' && (
        <DataTable
          columns={logColumns}
          data={logRows}
          searchable
          searchPlaceholder="Search by donor, type or subject..."
          exportFilename={`donor-log-${today}.csv`}
          exportColumns={[
            { header: 'Date', accessor: (c: Communication) => c.date },
            { header: 'Donor', accessor: (c: Communication) => c.donorName },
            { header: 'Channel', accessor: (c: Communication) => c.channel },
            { header: 'Type', accessor: (c: Communication) => c.type },
            { header: 'Subject', accessor: (c: Communication) => c.subject },
            { header: 'Status', accessor: (c: Communication) => c.status },
            { header: 'Sent By', accessor: (c: Communication) => c.sentBy },
          ]}
          pageSize={10}
          rowKey={(c) => c.communicationID}
          actions={(c) => (
            <button
              onClick={() => {
                if (confirm(`Delete the logged communication with ${c.donorName}?`)) void deleteCommunication(c.communicationID).catch(() => {})
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        />
      )}

      <Modal open={!!compose} onClose={() => setCompose(null)} title="Send Message To Donor" wide>
        {compose && <ComposeModal donors={donors} initial={compose.donor} onLogged={addCommunication} onClose={() => setCompose(null)} />}
      </Modal>
    </div>
  )
}

function channelColor(channel: string): 'green' | 'blue' | 'amber' | 'slate' {
  const map: Record<string, 'green' | 'blue' | 'amber' | 'slate'> = {
    WhatsApp: 'green',
    Email: 'blue',
    SMS: 'amber',
    'Phone Call': 'blue',
    'In Person': 'slate',
    Post: 'slate',
    Other: 'slate',
  }
  return map[channel] || 'slate'
}

function ComposeModal({ donors: donorList, initial, onLogged, onClose }: {
  donors: DonorSummary[]
  initial?: DonorSummary
  onLogged: (c: Omit<Communication, 'communicationID'>) => Promise<Communication>
  onClose: () => void
}) {
  const { user, settings, sendDonorEmail } = useApp()
  const [donorKey, setDonorKey] = useState(initial?.key || '')
  const [templateId, setTemplateId] = useState('thankyou')
  const [channel, setChannel] = useState(initial?.preferredChannel === 'Email' ? 'Email' : 'WhatsApp')
  const [type, setType] = useState('Thank You')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const donor = donorList.find((d) => d.key === donorKey)

  const applyTemplate = (tid: string, d?: DonorSummary) => {
    const tpl = DONOR_MESSAGE_TEMPLATES.find((t) => t.id === tid) || DONOR_MESSAGE_TEMPLATES[0]
    const values: Record<string, string | number> = {
      Name: d?.name || 'Devotee',
      Amount: d?.lastDonation?.amount || '',
      TempleName: settings.templeName || 'Temple',
      City: d?.city || '',
      Festival: 'the festival',
    }
    setSubject(fillTemplate(tpl.subject, values))
    setMessage(fillTemplate(tpl.body, values))
    const typeMap: Record<string, string> = {
      thankyou: 'Thank You',
      birthday: 'Birthday Wish',
      festival: 'Festival Greeting',
      reengage: 'Re-engagement',
      custom: 'Other',
    }
    setType(typeMap[tid] || 'Other')
  }

  const onDonorChange = (key: string) => {
    setDonorKey(key)
    const d = donorList.find((x) => x.key === key)
    applyTemplate(templateId, d)
  }

  const onTemplateChange = (tid: string) => {
    setTemplateId(tid)
    applyTemplate(tid, donor)
  }

  const handleCopy = async () => {
    if (!message.trim()) return setError('Message is empty')
    try {
      await navigator.clipboard.writeText(message)
      setActionMsg('Copied — paste it in WhatsApp / wherever you like.')
    } catch {
      setActionMsg('Copy failed — select the text and copy manually.')
    }
  }

  const handleWhatsApp = () => {
    if (!donor) return setError('Select a donor first')
    if (!donor.phone) return setError('This donor has no phone number saved')
    if (!message.trim()) return setError('Message is empty')
    setActionMsg('')
    window.open(`https://wa.me/${waPhone(donor.phone)}?text=${encodeURIComponent(message)}`, '_blank')
    setActionMsg('WhatsApp opened for ' + donor.name + ' — send away, then save the log below.')
  }

  const handleEmail = async () => {
    if (!donor) return setError('Select a donor first')
    if (!donor.email) return setError('This donor has no email address saved')
    if (!subject.trim() || !message.trim()) return setError('Subject and message are required')
    setSaving(true)
    setError('')
    try {
      await sendDonorEmail(donor.email, subject, message)
      setChannel('Email')
      setActionMsg('Email sent to ' + donor.email + ' — save the log below.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email sending failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLog = async () => {
    if (!donor) return setError('Select a donor first')
    if (!subject.trim() && !message.trim()) return setError('Add a subject or message first')
    if (!donorKey) return
    setSaving(true)
    setError('')
    try {
      await onLogged({
        personID: donor.person ? donor.person.personID : '',
        donorName: donor.name,
        date: todayStr(),
        channel,
        type,
        subject,
        message,
        sentBy: user?.name || '',
        status: 'Sent',
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log communication')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      {actionMsg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">{actionMsg}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Donor" required>
          <Select value={donorKey} onChange={(e) => onDonorChange(e.target.value)} required>
            <option value="">Select donor…</option>
            {donorList.map((d) => (
              <option key={d.key} value={d.key}>{d.name} {d.phone || d.email || ''}</option>
            ))}
          </Select>
        </Field>
        <Field label="Template">
          <Select value={templateId} onChange={(e) => onTemplateChange(e.target.value)}>
            {DONOR_MESSAGE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Channel">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {COMMUNICATION_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {COMMUNICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="flex items-end text-xs text-slate-500 pb-2 truncate">
          {donor && (
            <span className="flex items-center gap-1.5 min-w-0">
              <Phone size={13} className="shrink-0" /> {donor.phone || 'no phone'}
              <Mail size={13} className="shrink-0 ml-1" /> {donor.email || 'no email'}
            </span>
          )}
          {!donor && <span>Contact details appear once a donor is chosen.</span>}
        </div>
      </div>

      <Field label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (for email)" />
      </Field>
      <Field label="Message" required>
        <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message body" />
      </Field>

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleCopy()}><Copy size={14} /> Copy</Button>
          <Button variant="secondary" size="sm" onClick={handleWhatsApp}><MessageCircle size={14} /> WhatsApp</Button>
          <Button variant="secondary" size="sm" onClick={() => void handleEmail()} disabled={saving}>
            {saving ? <Check size={14} /> : <Send size={14} />} Send Email
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleLog()} disabled={saving}><Check size={14} /> Save to Log</Button>
        </div>
      </div>
    </div>
  )
}