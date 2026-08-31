import { useEffect, useMemo, useState } from 'react'
import { Mail, MessageCircle, Send, CheckCircle2, AlertTriangle, RefreshCw, CalendarClock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Card, CardHeader, PageHeader, Field, Input, Select, Textarea, Badge } from '../components/ui'
import { formatCurrency, fillTemplate, todayStr } from '../utils/helpers'
import { DONOR_MESSAGE_TEMPLATES, PERSON_TYPES, COMMUNICATION_TYPES } from '../utils/constants'
import { dataService } from '../services/apiService'
import type { BulkEmailPart, BulkSendResult, BulkSmsPart, Campaign, CommunicationChannel, Donation, Person, Settings } from '../types'

type Channel = 'email' | 'sms' | 'whatsapp'

const TYPE_MAP: Record<string, string> = {
  thankyou: 'Thank You',
  birthday: 'Birthday Wish',
  festival: 'Festival Greeting',
  reengage: 'Re-engagement',
  custom: 'Other',
}

const WA_BATCH = 8

function waPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length === 10 ? '91' + digits : digits
}

function nowLocalInput(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
}

function recipientCount(c: Campaign): number {
  try {
    return (JSON.parse(c.recipients || '[]') as unknown[]).length
  } catch {
    return 0
  }
}

function valuesFor(p: Person, donations: Donation[], settings: Settings, festival: string): Record<string, string> {
  const last = donations
    .filter((d) => !d.deleted && (d.donorID === p.personID || d.donorName.toLowerCase() === p.name.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  return {
    Name: p.name || 'Devotee',
    Amount: last ? formatCurrency(last.amount) : '',
    City: p.city || '',
    TempleName: settings.templeName || 'Temple',
    Festival: festival || 'the festival',
  }
}

export function BulkMessagingPage() {
  const { people, donations, settings, user, sendBulkEmails, sendBulkSms, logBulkCommunications } = useApp()

  const [channel, setChannel] = useState<Channel>('email')
  const [types, setTypes] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [templateId, setTemplateId] = useState(DONOR_MESSAGE_TEMPLATES[0].id)
  const [subject, setSubject] = useState(DONOR_MESSAGE_TEMPLATES[0].subject)
  const [body, setBody] = useState(DONOR_MESSAGE_TEMPLATES[0].body)
  const [festival, setFestival] = useState('')
  const [commType, setCommType] = useState('Thank You')
  const [logToComm, setLogToComm] = useState(true)
  const [waOffset, setWaOffset] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [result, setResult] = useState<BulkSendResult | null>(null)
  const [scheduled, setScheduled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  const activePeople = useMemo(() => people.filter((p) => p.status === 'active'), [people])

  const inTypes = useMemo(() => {
    if (types.length === 0) return activePeople
    return activePeople.filter((p) => types.some((t) => p.personType.includes(t)))
  }, [activePeople, types])

  const eligible = useMemo(() => {
    const hasContact = channel === 'email'
      ? (p: Person) => !!String(p.email || '').trim()
      : (p: Person) => !!String(p.phone || '').trim()
    return inTypes.filter(hasContact)
  }, [inTypes, channel])

  const targets = useMemo(() => eligible.filter((p) => selected.has(p.personID)), [eligible, selected])

  const emailCount = useMemo(() => inTypes.filter((p) => !!String(p.email || '').trim()).length, [inTypes])
  const smsCount = useMemo(() => inTypes.filter((p) => !!String(p.phone || '').trim()).length, [inTypes])

  const selectAll = () => {
    setWaOffset(0)
    setSelected(new Set(eligible.map((p) => p.personID)))
  }
  const clearAll = () => {
    setWaOffset(0)
    setSelected(new Set())
  }

  const toggleType = (t: string) => {
    setWaOffset(0)
    setSelected(new Set())
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const changeChannel = (c: Channel) => {
    setWaOffset(0)
    setSelected(new Set())
    if (c === 'whatsapp') setScheduled(false)
    setChannel(c)
  }

  const applyTemplate = (tid: string) => {
    setTemplateId(tid)
    const tpl = DONOR_MESSAGE_TEMPLATES.find((t) => t.id === tid) || DONOR_MESSAGE_TEMPLATES[0]
    setSubject(tpl.subject)
    setBody(tpl.body)
    setCommType(TYPE_MAP[tid] || 'Other')
  }

  const insertToken = (token: string) => {
    setBody((prev) => (prev ? prev + ' ' + token : token))
  }

  const previews = useMemo(
    () =>
      targets.slice(0, 3).map((p) => {
        const values = valuesFor(p, donations, settings, festival)
        return {
          name: p.name,
          subject: subject ? fillTemplate(subject, values) : '',
          body: fillTemplate(body, values),
        }
      }),
    [targets, body, subject, donations, settings, festival]
  )

  const whatsappLinks = useMemo(
    () =>
      targets.map((p) => ({
        name: p.name,
        url: `https://wa.me/${waPhone(p.phone)}?text=${encodeURIComponent(fillTemplate(body, valuesFor(p, donations, settings, festival)))}`,
      })),
    [targets, body, donations, settings, festival]
  )

  const typeChips = PERSON_TYPES.map((t) => ({
    t,
    count: activePeople.filter((p) => p.personType.includes(t)).length,
  }))

  async function runSend(
    channelName: CommunicationChannel,
    parts: BulkEmailPart[] | BulkSmsPart[],
    targetPeople: Person[]
  ) {
    setSending(true)
    setResult(null)
    setInfo('')
    try {
      const res =
        channelName === 'Email'
          ? await sendBulkEmails(parts as BulkEmailPart[])
          : await sendBulkSms(parts as BulkSmsPart[])
      if (logToComm) {
        const recs = targetPeople.map((p, i) => ({
          personID: p.personID,
          donorName: p.name,
          date: todayStr(),
          channel: channelName,
          type: commType,
          subject: channelName === 'Email' ? (parts[i] as BulkEmailPart).subject || '' : '',
          message: (parts[i] as BulkEmailPart | BulkSmsPart).body,
          sentBy: user?.name || '',
          status: 'Sent',
        }))
        await logBulkCommunications(recs).catch(() => null)
      }
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sending failed')
    } finally {
      setSending(false)
    }
  }

  const handleSend = async () => {
    if (targets.length === 0) return setError('Select at least one recipient')
    if (channel === 'email' && !subject.trim()) return setError('A subject is required for email')
    if (!body.trim()) return setError('Type a message first')
    setError('')
    setInfo('')

    if (channel === 'email') {
      const parts: BulkEmailPart[] = targets.map((p) => {
        const values = valuesFor(p, donations, settings, festival)
        return { to: String(p.email).trim(), subject: fillTemplate(subject, values), body: fillTemplate(body, values) }
      })
      await runSend('Email', parts, targets)
      return
    }

    if (channel === 'sms') {
      const parts: BulkSmsPart[] = targets.map((p) => ({
        to: String(p.phone).trim(),
        body: fillTemplate(body, valuesFor(p, donations, settings, festival)),
      }))
      await runSend('SMS', parts, targets)
      return
    }

    if (whatsappLinks.length === 0) return
    const batch = whatsappLinks.slice(waOffset, waOffset + WA_BATCH)
    const nextOffset = waOffset + WA_BATCH >= whatsappLinks.length ? 0 : waOffset + WA_BATCH
    batch.forEach((l) => window.open(l.url, '_blank'))
    setWaOffset(nextOffset)
    setResult(null)
    setInfo(
      `Opened ${batch.length} WhatsApp chat${batch.length === 1 ? '' : 's'} so you can review & send each one. ${
        whatsappLinks.length - (nextOffset === 0 ? whatsappLinks.length : waOffset + WA_BATCH) > 0
          ? `${whatsappLinks.length - (nextOffset === 0 ? whatsappLinks.length : waOffset + WA_BATCH)} still to open.`
          : ''
      }`
    )
  }

  const refreshCampaigns = async () => {
    setLoadingCampaigns(true)
    try {
      setCampaigns(await dataService.getCampaigns())
    } catch {
      /* keep the last known list */
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    void refreshCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSchedule = async () => {
    if (channel === 'whatsapp') return setError('WhatsApp cannot be scheduled — choose Email or SMS')
    if (targets.length === 0) return setError('Select at least one recipient')
    if (channel === 'email' && !subject.trim()) return setError('A subject is required for email')
    if (!body.trim()) return setError('Type a message first')
    if (!scheduleAt) return setError('Choose a date & time')
    if (new Date(scheduleAt).getTime() <= Date.now()) return setError('Schedule time must be in the future')
    if (
      !confirm(
        `Schedule ${channel === 'email' ? 'email' : 'SMS'} to ${targets.length} recipient${
          targets.length === 1 ? '' : 's'
        } for ${new Date(scheduleAt).toLocaleString()}?`
      )
    )
      return
    setError('')
    setInfo('')
    setSending(true)
    try {
      const recipients = targets.map((p) => ({
        personID: p.personID,
        name: p.name,
        email: p.email || '',
        phone: p.phone || '',
        city: p.city || '',
      }))
      const created = await dataService.scheduleBulkCampaign({
        recipients,
        subject,
        message: body,
        festival,
        channel: channel as 'email' | 'sms',
        type: commType,
        scheduledAt: new Date(scheduleAt).toISOString(),
        sentBy: user?.name || '',
      })
      setInfo(
        `Scheduled campaign ${created.campaignID} for ${new Date(scheduleAt).toLocaleString()} (${
          recipients.length
        } recipients). It sends automatically when due.`
      )
      setScheduleAt('')
      setScheduled(false)
      await refreshCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scheduling failed')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this scheduled campaign before it sends?')) return
    try {
      await dataService.cancelCampaign(id)
      await refreshCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bulk Messaging"
        subtitle="Send one message to many people — personalised for each recipient"
      />

      {channel === 'email' && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          Gmail quota: free accounts send about 100 emails/day, Google Workspace about 1,500/day. Bulk SMS needs a
          gateway — set it up in Settings &gt; Messaging &amp; SMS.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Recipients"
            subtitle={`${targets.length} of ${eligible.length} eligible selected`}
            action={
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={selectAll}>Select all</Button>
                <Button size="sm" variant="secondary" onClick={clearAll}>Clear</Button>
              </div>
            }
          />
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {typeChips.map(({ t, count }) => {
                const on = types.length === 0 || types.includes(t)
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      on ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t} <span className={on ? 'text-orange-200' : 'text-slate-400'}>({count})</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              {types.length === 0 ? 'Segment: all active people' : `Segment: ${types.join(' + ')}`} • {emailCount} with
              email • {smsCount} with phone
            </p>
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-50">
              {eligible.length === 0 && (
                <p className="text-sm text-slate-400 py-8 text-center">
                  No active people match this segment with a {channel === 'email' ? 'saved email' : 'saved phone number'}.
                </p>
              )}
              {eligible.map((p) => {
                const on = selected.has(p.personID)
                return (
                  <label
                    key={p.personID}
                    className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-orange-50/50 transition-colors ${on ? 'bg-orange-50/40' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setWaOffset(0)
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.personID)) next.delete(p.personID)
                          else next.add(p.personID)
                          return next
                        })
                      }}
                      className="mt-1 accent-orange-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {channel === 'email' ? p.email || 'no email' : p.phone || 'no phone'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0 justify-end max-w-[130px]">
                      {p.personType.slice(0, 2).map((t) => (
                        <Badge key={t} color="slate">{t}</Badge>
                      ))}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Message" subtitle="Personalised with tokens — auto-filled per person" />
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['email', 'Email', Mail],
                  ['sms', 'SMS', MessageCircle],
                  ['whatsapp', 'WhatsApp', Send],
                ] as const
              ).map(([key, label, Icon]) => (
                <Button key={key} size="sm" variant={channel === key ? 'primary' : 'secondary'} onClick={() => changeChannel(key)}>
                  <Icon size={14} /> {label}
                </Button>
              ))}
            </div>

            <Field label="Template">
              <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                {DONOR_MESSAGE_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </Select>
            </Field>

            {channel === 'email' && (
              <Field label="Subject" required>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
              </Field>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Festival / Event (optional)" hint="Fills the {Festival} token">
                <Input value={festival} onChange={(e) => setFestival(e.target.value)} placeholder="e.g. Ratha Yatra" />
              </Field>
              <Field label="Save to log as" hint="Recorded in Donor Care &gt; Communication Log">
                <Select value={commType} onChange={(e) => setCommType(e.target.value)}>
                  {COMMUNICATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-medium text-slate-600">
                  Message{channel !== 'email' ? ' (SMS best under ~160 characters)' : ''}
                </label>
                <div className="flex gap-1 flex-wrap">
                  {['Name', 'Amount', 'City', 'TempleName', 'Festival'].map((tok) => (
                    <button
                      key={tok}
                      onClick={() => insertToken(`{${tok}}`)}
                      className="text-[11px] px-2 py-0.5 rounded border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      +{tok}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Dear {Name}, …" />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={logToComm} onChange={(e) => setLogToComm(e.target.checked)} className="accent-orange-600" />
              Save a communication record for every recipient
            </label>

            {channel !== 'whatsapp' && previews.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Preview for {targets.length} recipients (showing {previews.length})
                </p>
                {previews.map((pr) => (
                  <div key={pr.name} className="text-xs bg-white rounded-lg border border-slate-100 p-2.5">
                    <p className="font-semibold text-slate-700">
                      {pr.name}
                      {channel === 'email' && pr.subject ? ` — ${pr.subject}` : ''}
                    </p>
                    <p className="text-slate-500 mt-0.5 whitespace-pre-wrap">{pr.body}</p>
                  </div>
                ))}
              </div>
            )}
            {channel === 'whatsapp' && whatsappLinks.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  WhatsApp — {whatsappLinks.length} chats ready
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Opens chat windows in batches of {WA_BATCH}. Review and send each one, then click again for the next
                  batch.
                </p>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{info}</span>
              </div>
            )}
            {result && (
              <div
                className={`text-sm rounded-lg p-2.5 border flex items-start gap-2 ${
                  result.failed > 0 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}
              >
                {result.failed > 0 ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium">
                    {result.sent} of {result.total} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
                  </p>
                  {result.failures.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 max-h-24 overflow-y-auto text-xs">
                      {result.failures.slice(0, 10).map((f, i) => (
                        <li key={i}>{f.to}: {f.error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1">
              {channel !== 'whatsapp' && (
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs shrink-0">
                    <button
                      onClick={() => setScheduled(false)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        scheduled ? 'text-slate-500 hover:bg-slate-50' : 'bg-orange-600 text-white'
                      }`}
                    >
                      Send now
                    </button>
                    <button
                      onClick={() => setScheduled(true)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        scheduled ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                  {scheduled && (
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 shrink-0">When?</label>
                      <Input
                        type="datetime-local"
                        value={scheduleAt}
                        min={nowLocalInput()}
                        onChange={(e) => setScheduleAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                {channel === 'whatsapp' ? (
                  <Button onClick={() => void handleSend()} disabled={whatsappLinks.length === 0}>
                    <Send size={15} />
                    {waOffset > 0 ? `Open next batch (${Math.min(WA_BATCH, whatsappLinks.length - waOffset)})` : `Open WhatsApp chats (${whatsappLinks.length})`}
                  </Button>
                ) : scheduled ? (
                  <Button onClick={() => void handleSchedule()} disabled={sending || targets.length === 0}>
                    <CalendarClock size={15} /> {sending ? 'Scheduling…' : `Schedule for ${targets.length}`}
                  </Button>
                ) : (
                  <Button onClick={() => void handleSend()} disabled={sending || targets.length === 0}>
                    <Send size={15} /> {sending ? 'Sending…' : `Send to ${targets.length}`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Scheduled & Past Campaigns"
          subtitle="Scheduled messages send automatically from your Apps Script backend when due, then appear here with their result"
          action={
            <Button size="sm" variant="secondary" onClick={() => void refreshCampaigns()} disabled={loadingCampaigns}>
              <RefreshCw size={14} className={loadingCampaigns ? 'animate-spin' : ''} /> Refresh
            </Button>
          }
        />
        <div className="p-4">
          {campaigns.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No campaigns yet. Schedule one above to see it here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="px-2 py-2 font-medium">Scheduled</th>
                    <th className="px-2 py-2 font-medium">Channel</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Recipients</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...campaigns]
                    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
                    .map((c) => (
                      <tr key={c.campaignID} className="hover:bg-slate-50/50">
                        <td className="px-2 py-2 text-slate-700 whitespace-nowrap">
                          {new Date(c.scheduledAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-slate-600 capitalize">{c.channel}</td>
                        <td className="px-2 py-2 text-slate-600">{c.type}</td>
                        <td className="px-2 py-2 text-slate-600">{recipientCount(c)}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[c.status] || STATUS_STYLES.scheduled}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {c.status === 'scheduled' ? (
                            <Button size="sm" variant="secondary" onClick={() => void handleCancel(c.campaignID)}>
                              Cancel
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">{c.subject || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}