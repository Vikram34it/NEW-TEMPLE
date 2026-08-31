import { CONFIG } from '../config/apiConfig'
import { buildDashboardData, mockData } from '../data/mockData'
import type {
  Account,
  Announcement,
  BulkCampaignPayload,
  BulkEmailPart,
  BulkSendResult,
  BulkSmsPart,
  Campaign,
  Communication,
  DashboardData,
  Donation,
  EventVolunteer,
  Expense,
  Message,
  PendingPayment,
  Person,
  PrayerRequest,
  Project,
  Settings,
  TempleEvent,
  Transaction,
  User,
  Vendor,
} from '../types'

// A lightweight, mock-safe data layer. When the Apps Script backend URL is
// configured (useMockData = false), every "load" call fetches from the API and
// every mutation writes back to the spreadsheet. When not configured, it
// returns bundled sample data so the UI can be developed and demoed fully
// offline.

type RecordName =
  | 'users'
  | 'people'
  | 'donations'
  | 'expenses'
  | 'vendors'
  | 'projects'
  | 'pendingPayments'
  | 'accounts'
  | 'transactions'
  | 'settings'
  | 'auditLog'
  | 'announcements'
  | 'messages'
  | 'events'
  | 'eventVolunteers'
  | 'requests'
  | 'communications'

type MutateOp = 'create' | 'update' | 'softDelete' | 'hardDelete' | 'delete'

// Optional token sent to the backend (e.g. the API_KEY from Apps Script).
// Configure it via an environment variable at build time where appropriate.
const TOKEN = import.meta.env.VITE_API_TOKEN || ''

async function apiFetch(path: string, params: Record<string, string> = {}, body?: unknown) {
  if (!CONFIG.webAppUrl) {
    throw new Error('API not configured')
  }
  const qs = new URLSearchParams(params).toString()
  const url = `${CONFIG.webAppUrl}?action=${path}${qs ? `&${qs}` : ''}${TOKEN ? `&token=${TOKEN}` : ''}`
  const res = await fetch(url, body
    ? {
        method: 'POST',
        body: JSON.stringify(body),
      }
    : undefined)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const json = await res.json()
  if (json.success === false) {
    throw new Error(json.message || 'API request failed')
  }
  return json.data
}

// The Apps Script backend returns rows keyed by its spreadsheet headers
// (e.g. "UserID", "DonorName", "CreatedAt"). The React app uses the same
// field names in camelCase (e.g. "userID", "donorName"). Convert every
// record read from the API so the app can consume it as-is.
function toCamel<T>(obj: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  const boolKeys = ['deleted', 'pinned', 'read', 'deletedBySender', 'deletedByRecipient', 'need80G']
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue // skip internal keys such as _row
    let key = k.charAt(0).toLowerCase() + k.slice(1)
    if (k === 'PANNumber') key = 'panNumber'
    let val = v
    if (boolKeys.includes(key) && typeof val === 'string') {
      val = /^true$/i.test(val)
    } else if (key === 'personType' && typeof val === 'string') {
      val = val.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    }
    out[key] = val
  }
  return out as T
}

function toCamelAny(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((r) => toCamel(r as Record<string, unknown>))
  if (value && typeof value === 'object') return toCamel(value as Record<string, unknown>)
  return value
}

// Per-record metadata: which backend actions to call, which field holds the
// id, which fields the server generates on create (so we must NOT send them),
// and any frontend-key -> spreadsheet-header renames that differ from a
// simple first-letter-capitalisation.
interface RecordMeta {
  idField: string
  create?: string
  update?: string
  softDelete?: string
  hardDelete?: string
  skipOnCreate?: string[]
  aliases?: Record<string, string>
}

const RECORD_META: Record<RecordName, RecordMeta> = {
  users: { idField: 'userID', create: 'createUser', update: 'updateUser', hardDelete: 'deleteUser' },
  people: {
    idField: 'personID',
    create: 'createPerson',
    update: 'updatePerson',
    hardDelete: 'deletePerson',
    aliases: { panNumber: 'PANNumber' },
  },
  donations: {
    idField: 'donationID',
    create: 'createDonation',
    update: 'updateDonation',
    softDelete: 'softDeleteDonation',
    skipOnCreate: ['donationID', 'receiptNumber', 'createdAt', 'updatedAt'],
    aliases: { panNumber: 'PANNumber' },
  },
  expenses: {
    idField: 'expenseID',
    create: 'createExpense',
    update: 'updateExpense',
    softDelete: 'softDeleteExpense',
    skipOnCreate: ['expenseID', 'createdAt', 'updatedAt'],
  },
  vendors: {
    idField: 'vendorID',
    create: 'createVendor',
    update: 'updateVendor',
    hardDelete: 'deleteVendor',
    aliases: { gstNumber: 'GSTNumber' },
  },
  projects: { idField: 'projectID', create: 'createProject', update: 'updateProject' },
  pendingPayments: { idField: 'paymentID', create: 'createPayment', update: 'updatePayment' },
  accounts: { idField: 'accountID', create: 'createAccount', update: 'updateAccount' },
  transactions: { idField: 'transactionID', create: 'createTransaction' },
  settings: { idField: '' },
  auditLog: { idField: '' },
  announcements: {
    idField: 'announcementID',
    create: 'createAnnouncement',
    update: 'updateAnnouncement',
    softDelete: 'archiveAnnouncement',
    skipOnCreate: ['announcementID', 'postedAt'],
  },
  messages: {
    idField: 'messageID',
    create: 'sendMessage',
    update: 'markMessageRead',
    skipOnCreate: ['messageID', 'sentAt', 'read', 'readAt', 'deletedBySender', 'deletedByRecipient'],
  },
  events: {
    idField: 'eventID',
    create: 'createEvent',
    update: 'updateEvent',
    hardDelete: 'deleteEvent',
    skipOnCreate: ['eventID'],
  },
  eventVolunteers: {
    idField: 'volunteerID',
    create: 'createVolunteer',
    update: 'updateVolunteer',
    hardDelete: 'removeVolunteer',
    skipOnCreate: ['volunteerID', 'registeredAt'],
  },
  requests: {
    idField: 'requestID',
    create: 'createRequest',
    update: 'updateRequest',
    hardDelete: 'deleteRequest',
    skipOnCreate: ['requestID'],
  },
  communications: {
    idField: 'communicationID',
    create: 'createCommunication',
    update: 'updateCommunication',
    hardDelete: 'deleteCommunication',
    skipOnCreate: ['communicationID'],
  },
}

// Convert a frontend camelCase record into the object the backend expects
// (spreadsheet-header keys). Arrays -> joined strings, booleans -> TRUE/FALSE.
function serialize(recordName: RecordName, payload: Record<string, unknown>, op: MutateOp): Record<string, unknown> {
  const meta = RECORD_META[recordName]
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'id' || k.startsWith('_')) continue
    if (op === 'create' && meta.skipOnCreate?.includes(k)) continue
    if (v === undefined || v === null) continue
    let val: unknown = v
    if (Array.isArray(val)) val = val.join(', ')
    else if (typeof val === 'boolean') val = val ? 'TRUE' : 'FALSE'
    const key = (meta.aliases && meta.aliases[k]) || k.charAt(0).toUpperCase() + k.slice(1)
    out[key] = val
  }
  return out
}

// Generic in-memory store that operates on the mock data when live API is off.
class MockStore {
  data = { ...mockData }

  reset() {
    this.data = { ...mockData }
  }
}

export const mockStore = new MockStore()

export const api = {
  async load(record: RecordName): Promise<unknown> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      const data = (await apiFetch(record)) as unknown[]
      return Array.isArray(data) ? data.map((r) => toCamel(r as Record<string, unknown>)) : data
    }
    return mockStore.data[record]
  },

  // Persist a mutation to the backend (live) or the in-memory mock store
  // (demo). Returns the canonical server record for creates.
  async mutate(record: RecordName, op: MutateOp, payload: unknown): Promise<unknown> {
    const meta = RECORD_META[record]
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      if (record === 'settings') {
        return apiFetch('updateSettings', {}, { settings: payload })
      }
      const action =
        op === 'create' ? meta.create
        : op === 'update' ? meta.update
        : op === 'softDelete' ? meta.softDelete
        : meta.hardDelete
      if (!action) throw new Error('This record type does not support that operation')

      let body: unknown
      if (op === 'create' || op === 'update') {
        body = { record: serialize(record, payload as Record<string, unknown>, op) }
      } else {
        const rec = payload as Record<string, unknown> | undefined
        const id = rec?.[meta.idField] ?? (rec?.id as string | undefined) ?? (typeof payload === 'string' ? payload : '')
        if (!id) throw new Error('Missing record ID')
        body = { id: String(id) }
      }
      const data = await apiFetch(action, {}, body)
      return op === 'create' ? toCamelAny(data) : data
    }
    return mutateMock(record, op, payload)
  },
}

function mutateMock(record: RecordName, op: MutateOp, payload: unknown) {
  const store = mockStore.data
  if (record === 'settings') {
    if (op === 'update') store.settings = payload as Settings
    return store.settings
  }
  const arr = store[record as keyof typeof store]
  if (!Array.isArray(arr)) return null
  const meta = RECORD_META[record]
  const rec = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>
  const idKey = meta.idField
  const id = rec[idKey] ?? rec.id ?? (typeof payload === 'string' ? payload : '')

  if (op === 'create') {
    ;(arr as unknown[]).push(payload)
    return payload
  }
  const cast = arr as unknown as Record<string, unknown>[]
  const idx = cast.findIndex((r) => r[idKey] === id)
  if (idx === -1) return null
  if (op === 'update') {
    cast[idx] = { ...cast[idx], ...rec }
    return cast[idx]
  }
  if (op === 'softDelete') {
    cast[idx] = { ...cast[idx], deleted: true }
    return cast[idx]
  }
  arr.splice(idx, 1)
  return null
}

// Convenience data accessor used by the React app.
export const dataService = {
  async getDashboard(): Promise<DashboardData> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return apiFetch('getDashboardData') as Promise<DashboardData>
    }
    const { donations, expenses, accounts, pendingPayments, projects } = mockStore.data
    return buildDashboardData(donations, expenses, accounts, pendingPayments, projects)
  },

  async getReports(): Promise<unknown> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      const res = (await apiFetch('getReports')) as { donations: unknown[]; expenses: unknown[] }
      return {
        ...res,
        donations: res.donations.map((r) => toCamel(r as Record<string, unknown>)),
        expenses: res.expenses.map((r) => toCamel(r as Record<string, unknown>)),
      }
    }
    return null
  },

  // Write a record to the backend / mock store.
  persist(record: RecordName, op: MutateOp, payload: unknown): Promise<unknown> {
    return api.mutate(record, op, payload)
  },

  // Ask the backend to rebuild the ledger + account balances from the live
  // (non-deleted) records. Falls back safely when offline.
  async resyncLedger(): Promise<{ success: boolean }> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return (await apiFetch('resyncLedger')) as { success: boolean }
    }
    return { success: true }
  },

  // Persist settings (backend or mock).
  async saveSettings(settings: Settings): Promise<void> {
    await api.mutate('settings', 'update', settings)
  },

  async getUsers(): Promise<User[]> {
    return (await api.load('users')) as User[]
  },
  async getPeople(): Promise<Person[]> {
    return (await api.load('people')) as Person[]
  },
  async getDonations(): Promise<Donation[]> {
    const all = (await api.load('donations')) as Donation[]
    return all.filter((d) => !d.deleted)
  },
  async getExpenses(): Promise<Expense[]> {
    const all = (await api.load('expenses')) as Expense[]
    return all.filter((e) => !e.deleted)
  },
  async getVendors(): Promise<Vendor[]> {
    return (await api.load('vendors')) as Vendor[]
  },
  async getProjects(): Promise<Project[]> {
    return (await api.load('projects')) as Project[]
  },
  async getPendingPayments(): Promise<PendingPayment[]> {
    return (await api.load('pendingPayments')) as PendingPayment[]
  },
  async getAccounts(): Promise<Account[]> {
    return (await api.load('accounts')) as Account[]
  },
  async getTransactions(): Promise<Transaction[]> {
    return (await api.load('transactions')) as Transaction[]
  },
  async getSettings(): Promise<Settings> {
    return (await api.load('settings')) as Settings
  },

  async getAnnouncements(): Promise<Announcement[]> {
    return (await api.load('announcements')) as Announcement[]
  },
  async getMessages(email: string): Promise<Message[]> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      const data = (await apiFetch('getMessages', { me: email })) as unknown[]
      return data.map((r) => toCamel(r as Record<string, unknown>)) as Message[]
    }
    const all = mockStore.data.messages as Message[]
    const me = String(email || '').trim().toLowerCase()
    return all.filter((m) => {
      const toMe = (m.recipientEmail || '').toLowerCase() === me
      const fromMe = (m.senderEmail || '').toLowerCase() === me
      if (!toMe && !fromMe) return false
      if (toMe && m.deletedByRecipient) return false
      if (fromMe && m.deletedBySender) return false
      return true
    })
  },
  async getEvents(): Promise<TempleEvent[]> {
    return (await api.load('events')) as TempleEvent[]
  },
  async getEventVolunteers(): Promise<EventVolunteer[]> {
    return (await api.load('eventVolunteers')) as EventVolunteer[]
  },
  async getRequests(): Promise<PrayerRequest[]> {
    return (await api.load('requests')) as PrayerRequest[]
  },
  async getCommunications(): Promise<Communication[]> {
    return (await api.load('communications')) as Communication[]
  },

  // Send a real email to a donor from the temple's own Gmail (live backend).
  // In demo mode this just simulates a successful send.
  async sendDonorEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; to: string; sentAt: string }> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return (await apiFetch('sendDonorEmail', {}, { to, subject, body })) as {
        sent: boolean
        to: string
        sentAt: string
      }
    }
    return { sent: true, to, sentAt: new Date().toISOString() }
  },

  // Send personalized bulk emails (one per recipient) through the temple's
  // Gmail. Demo mode simulates a successful send.
  async sendBulkEmails(messages: BulkEmailPart[]): Promise<BulkSendResult> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return (await apiFetch('sendBulkEmails', {}, { messages })) as BulkSendResult
    }
    await new Promise((r) => setTimeout(r, 600))
    const parts = messages.filter((m) => m.to && m.subject && m.body)
    const skipped = messages.length - parts.length
    return {
      sent: parts.length,
      failed: skipped,
      total: messages.length,
      failures: skipped > 0 ? [{ to: '—', error: `${skipped} message(s) had no contacts` }] : [],
    }
  },

  // Send bulk SMS through a configured gateway. In demo mode a non-'off'
  // provider simulates success; an unconfigured gateway returns a clear error
  // so the UI can suggest the WhatsApp fallback.
  async sendBulkSms(messages: BulkSmsPart[]): Promise<BulkSendResult> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return (await apiFetch('sendBulkSms', {}, { messages })) as BulkSendResult
    }
    const { settings } = mockStore.data
    const provider = String(settings.smsProvider || 'off').toLowerCase()
    if (!provider || provider === 'off' || provider === 'none') {
      throw new Error('SMS gateway is not configured. Go to Settings > Messaging to choose a provider, or send via WhatsApp instead.')
    }
    await new Promise((r) => setTimeout(r, 600))
    const parts = messages.filter((m) => m.to && m.body)
    const skipped = messages.length - parts.length
    return {
      sent: parts.length,
      failed: skipped,
      total: messages.length,
      failures: skipped > 0 ? [{ to: '—', error: `${skipped} message(s) had no phone number` }] : [],
    }
  },

  // Send personalised messages through the official WhatsApp Business API. The
  // backend posts Meta-approved template messages using the settings in
  // Messaging & SMS (access token, Phone Number ID, template + param map).
  async sendBulkWhatsApp(messages: Array<{ to: string; params: string[] }>): Promise<BulkSendResult> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return (await apiFetch('sendBulkWhatsApp', {}, { messages })) as BulkSendResult
    }
    const { settings } = mockStore.data
    if (!settings.waApiToken || !settings.waPhoneNumberId) {
      throw new Error('WhatsApp Business API is not configured. Open Settings > Messaging & SMS and add your access token and Phone Number ID.')
    }
    await new Promise((r) => setTimeout(r, 600))
    const parts = messages.filter((m) => m.to)
    const skipped = messages.length - parts.length
    return {
      sent: parts.length,
      failed: skipped,
      total: messages.length,
      failures: skipped > 0 ? [{ to: '—', error: `${skipped} message(s) had no phone number` }] : [],
    }
  },

  // Write many Communication log rows in one request (bulk campaign trail).
  async logBulkCommunications(records: Array<Omit<Communication, 'communicationID'>>): Promise<{ created: number; errors: string[] }> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return (await apiFetch('logBulkCommunications', {}, { records })) as { created: number; errors: string[] }
    }
    const arr = mockStore.data.communications as Communication[]
    const withIds = records.map((r, i) => ({
      ...r,
      communicationID: `COM-BULK-${String(arr.length + i + 1).padStart(3, '0')}`,
    }))
    ;(arr as unknown[]).push(...withIds)
    return { created: withIds.length, errors: [] }
  },

  // Scheduled campaigns: list, schedule for later (sent server-side by a
  // Google Apps Script time trigger), and cancel while still pending.
  async getCampaigns(): Promise<Campaign[]> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      const data = (await apiFetch('getCampaigns')) as unknown[]
      return data.map((r) => toCamel(r as Record<string, unknown>)) as Campaign[]
    }
    return mockStore.data.campaigns as Campaign[]
  },

  async scheduleBulkCampaign(payload: BulkCampaignPayload): Promise<Campaign> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return toCamel((await apiFetch('scheduleBulkCampaign', {}, payload)) as Record<string, unknown>) as Campaign
    }
    const c: Campaign = {
      campaignID: `CAM-${String((mockStore.data.campaigns as Campaign[]).length + 1).padStart(3, '0')}`,
      scheduledAt: payload.scheduledAt,
      channel: payload.channel,
      type: payload.type,
      subject: payload.subject,
      message: payload.message,
      festival: payload.festival,
      recipients: JSON.stringify(payload.recipients),
      sentBy: payload.sentBy,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    }
    ;(mockStore.data.campaigns as unknown[]).push(c)
    return c
  },

  async cancelCampaign(id: string): Promise<void> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      await apiFetch('cancelBulkCampaign', {}, { id })
      return
    }
    const c = (mockStore.data.campaigns as Campaign[]).find((x) => x.campaignID === id)
    if (c) c.status = 'cancelled'
  },

  // Mark a message as read (partial update against the backend / mock store).
  async markMessageRead(messageID: string): Promise<void> {
    await api.mutate('messages', 'update', {
      messageID,
      read: true,
      readAt: new Date().toISOString(),
    })
  },

  // Soft-delete a message for one side only (sender or recipient).
  async deleteMessage(messageID: string, email: string, side: 'sender' | 'recipient'): Promise<void> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      await apiFetch('deleteMessage', {}, { id: messageID, email, side })
      return
    }
    const arr = mockStore.data.messages as Message[]
    const item = arr.find((m) => m.messageID === messageID)
    if (!item) throw new Error('Message not found')
    if (side === 'sender') item.deletedBySender = true
    else item.deletedByRecipient = true
  },

  async login(email: string, password: string): Promise<User> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      const res = (await apiFetch('login', {}, { email, password })) as { user: User }
      return res.user
    }
    const users = mockStore.data.users as User[]
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.status === 'active'
    )
    if (!found) throw new Error('Invalid credentials or account disabled')
    return found
  },
}

export type { RecordName }