import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { CONFIG } from '../config/apiConfig'
import { dataService } from '../services/apiService'
import type {
  Account,
  Announcement,
  AuditLogEntry,
  BulkEmailPart,
  BulkSendResult,
  BulkSmsPart,
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

interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

const AppContext = createContext<AppContextValue | null>(null)

const CONFIG_USE_LIVE = !CONFIG.useMockData && !!CONFIG.webAppUrl

const SESSION_KEY = 'temple_session_user'

function loadSessionUser(): User | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.userID && parsed.email) {
      return parsed as User
    }
    return null
  } catch {
    return null
  }
}

function storeSessionUser(u: User | null) {
  try {
    if (u) window.localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // localStorage may be unavailable (e.g. private mode); session still works in-memory
  }
}

let seq = 100
let toastSeq = 0

function nextSeq() {
  seq += 1
  return seq
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong'
}

interface AppContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  can: (permission: string) => boolean

  loading: boolean
  settings: Settings
  updateSettings: (s: Settings) => Promise<void>

  donors: Person[]
  people: Person[]
  donations: Donation[]
  expenses: Expense[]
  vendors: Vendor[]
  projects: Project[]
  pendingPayments: PendingPayment[]
  accounts: Account[]
  transactions: Transaction[]
  users: User[]
  auditLog: AuditLogEntry[]
  dashboard: DashboardData

  announcements: Announcement[]
  messages: Message[]
  events: TempleEvent[]
  eventVolunteers: EventVolunteer[]
  requests: PrayerRequest[]
  unreadMessages: Message[]

  refreshMessages: () => Promise<void>
  setMessagesPolling: (active: boolean) => void

  addDonation: (d: Omit<Donation, 'donationID' | 'receiptNumber'>) => Promise<Donation>
  updateDonation: (d: Donation) => Promise<void>
  softDeleteDonation: (id: string) => Promise<void>
  bulkAddDonations: (items: Array<Omit<Donation, 'donationID' | 'receiptNumber'>>) => Promise<Donation[]>

  addExpense: (e: Omit<Expense, 'expenseID'>) => Promise<Expense>
  updateExpense: (e: Expense) => Promise<void>
  softDeleteExpense: (id: string) => Promise<void>
  bulkAddExpenses: (items: Array<Omit<Expense, 'expenseID'>>) => Promise<Expense[]>

  addPerson: (p: Omit<Person, 'personID'>) => Promise<Person>
  updatePerson: (p: Person) => Promise<void>
  deletePerson: (id: string) => Promise<void>
  bulkAddPeople: (items: Array<Omit<Person, 'personID'>>) => Promise<Person[]>

  addVendor: (v: Omit<Vendor, 'vendorID'>) => Promise<Vendor>
  updateVendor: (v: Vendor) => Promise<void>
  deleteVendor: (id: string) => Promise<void>
  bulkAddVendors: (items: Array<Omit<Vendor, 'vendorID'>>) => Promise<Vendor[]>

  addProject: (p: Omit<Project, 'projectID'>) => Promise<Project>
  updateProject: (p: Project) => Promise<void>

  addPendingPayment: (p: Omit<PendingPayment, 'paymentID'>) => Promise<PendingPayment>
  updatePendingPayment: (p: PendingPayment) => Promise<void>

  addAccount: (a: Omit<Account, 'accountID'>) => Promise<Account>
  updateAccount: (a: Account) => Promise<void>

  addUser: (u: Omit<User, 'userID' | 'createdDate'>) => Promise<User>
  updateUser: (u: User) => Promise<void>
  deleteUser: (id: string) => Promise<void>

  addTransaction: (t: Omit<Transaction, 'transactionID'>) => Promise<Transaction>

  addAnnouncement: (a: Omit<Announcement, 'announcementID' | 'postedAt' | 'postedBy'>) => Promise<Announcement>
  updateAnnouncement: (a: Announcement) => Promise<void>
  archiveAnnouncement: (id: string) => Promise<void>

  sendMessage: (m: Pick<Message, 'recipientEmail' | 'subject' | 'body'>) => Promise<Message>
  markMessageRead: (id: string) => Promise<void>
  deleteMessage: (id: string, side: 'sender' | 'recipient') => Promise<void>

  addEvent: (e: Omit<TempleEvent, 'eventID'>) => Promise<TempleEvent>
  updateEvent: (e: TempleEvent) => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  addVolunteer: (v: Omit<EventVolunteer, 'volunteerID' | 'registeredAt'>) => Promise<EventVolunteer>
  updateVolunteer: (v: EventVolunteer) => Promise<void>
  removeVolunteer: (id: string) => Promise<void>

  addRequest: (r: Omit<PrayerRequest, 'requestID'>) => Promise<PrayerRequest>
  updateRequest: (r: PrayerRequest) => Promise<void>
  deleteRequest: (id: string) => Promise<void>

  communications: Communication[]
  addCommunication: (c: Omit<Communication, 'communicationID'>) => Promise<Communication>
  updateCommunication: (c: Communication) => Promise<void>
  deleteCommunication: (id: string) => Promise<void>
  sendDonorEmail: (to: string, subject: string, body: string) => Promise<{ sent: boolean; to: string; sentAt: string }>
  sendBulkEmails: (messages: BulkEmailPart[]) => Promise<BulkSendResult>
  sendBulkSms: (messages: BulkSmsPart[]) => Promise<BulkSendResult>
  sendBulkWhatsApp: (messages: Array<{ to: string; params: string[] }>) => Promise<BulkSendResult>
  logBulkCommunications: (records: Array<Omit<Communication, 'communicationID'>>) => Promise<{ created: number; errors: string[] }>
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSessionUser)
  const [loading, setLoading] = useState(true)

  const [users, setUsers] = useState<User[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [events, setEvents] = useState<TempleEvent[]>([])
  const [eventVolunteers, setEventVolunteers] = useState<EventVolunteer[]>([])
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [communications, setCommunications] = useState<Communication[]>([])
  const [settings, setSettings] = useState<Settings>({
    templeName: 'ISKCON New Temple',
    templeAddress: '',
    templePhone: '',
    templeEmail: '',
    receiptPrefix: 'REC',
    currentSequence: 1,
    defaultBankAccount: '',
    currency: 'INR',
    smsProvider: 'off',
    smsApiKey: '',
    smsAccountSid: '',
    smsSenderId: '',
    smsFrom: '',
    smsCustomUrl: '',
    waApiToken: '',
    waPhoneNumberId: '',
    waTemplateName: '',
    waTemplateLanguage: 'en',
    waTemplateParamMap: 'Message',
  })
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [messagesPolling, setMessagesPolling] = useState(false)

  const notify = (type: 'success' | 'error', message: string) => {
    const id = ++toastSeq
    setToasts((prev) => [...prev.slice(-3), { id, type, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }

  async function refreshAll(): Promise<void> {
    const isDonor = user?.role === 'donor'
    const me = isDonor ? user.email : undefined
    const mob = isDonor ? user.phone : undefined

    if (isDonor) {
      // Donors load only their own donations (matched by mobile or email) plus
      // public settings. They never receive staff financials in the client.
      const [d, s] = await Promise.all([
        dataService.getDonations(me, mob),
        dataService.getSettings(),
      ])
      setDonations(d)
      setSettings(s)
      setUsers([])
      setPeople([])
      setExpenses([])
      setVendors([])
      setProjects([])
      setPendingPayments([])
      setAccounts([])
      setTransactions([])
      setAnnouncements([])
      setEvents([])
      setEventVolunteers([])
      setRequests([])
      setCommunications([])
      setMessages([])
      setDashboard(null)
      return
    }

    const [u, p, d, e, v, pr, pp, ac, t, s, ann, ev, vols, req, comm] = await Promise.all([
      dataService.getUsers(),
      dataService.getPeople(),
      dataService.getDonations(),
      dataService.getExpenses(),
      dataService.getVendors(),
      dataService.getProjects(),
      dataService.getPendingPayments(),
      dataService.getAccounts(),
      dataService.getTransactions(),
      dataService.getSettings(),
      dataService.getAnnouncements(),
      dataService.getEvents(),
      dataService.getEventVolunteers(),
      dataService.getRequests(),
      dataService.getCommunications(),
    ])
    setUsers(u)
    setPeople(p)
    setDonations(d)
    setExpenses(e)
    setVendors(v)
    setProjects(pr)
    setPendingPayments(pp)
    setAccounts(ac)
    setTransactions(t)
    setSettings(s)
    setAnnouncements(ann)
    setEvents(ev)
    setEventVolunteers(vols)
    setRequests(req)
    setCommunications(comm)
    if (user) {
      try {
        setMessages(await dataService.getMessages(user.email))
      } catch {
        // message load is best-effort; never block the rest of the app
      }
    }
    const dash = await dataService.getDashboard()
    setDashboard(dash)
  }

  async function refreshAllSafe() {
    try {
      await refreshAll()
    } catch {
      // best-effort re-sync after a failed write; errors already notified
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await refreshAll()
      } catch (err) {
        console.error('Failed to load app data', err)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load (or clear) the mailbox whenever the logged-in user changes.
  useEffect(() => {
    if (user) {
      dataService
        .getMessages(user.email)
        .then(setMessages)
        .catch(() => {})
    } else {
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  // 60s auto-refresh of the mailbox while the Messages page is open.
  useEffect(() => {
    if (!CONFIG_USE_LIVE || !user || !messagesPolling) return
    const t = window.setInterval(() => {
      dataService.getMessages(user.email).then(setMessages).catch(() => {})
    }, 60000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CONFIG_USE_LIVE, user?.email, messagesPolling])

  const audit = (action: string, module: string, recordID: string, newValue = '') => {
    if (!user) return
    const entry: AuditLogEntry = {
      logID: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString(),
      user: user.name,
      action,
      module,
      recordID,
      oldValue: '',
      newValue,
    }
    setAuditLog((prev) => [entry, ...prev].slice(0, 500))
  }

  function login(email: string, password: string): Promise<string | null> {
    return new Promise((resolve) => {
      const finish = (msg: string | null, u: User | null) => {
        if (!msg && u) {
          setUser(u)
          storeSessionUser(u)
          audit('Login', 'Auth', u.userID)
        }
        resolve(msg)
      }
      if (!CONFIG_USE_LIVE) {
        setTimeout(() => {
          const found = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
          )
          if (found && found.status === 'active') {
            finish(null, found)
          } else {
            finish(found && found.status !== 'active' ? 'Account is disabled' : 'Invalid email or password', null)
          }
        }, 400)
      } else {
        dataService.login(email, password)
          .then((u) => finish(null, u))
          .catch((err) => finish(err instanceof Error ? err.message : 'Login failed', null))
      }
    })
  }

  function logout() {
    audit('Logout', 'Auth', user?.userID || '')
    setUser(null)
    storeSessionUser(null)
  }

  const can = (permission: string): boolean => {
    if (!user) return false
    const role = user.role
    const perms: Record<string, string[]> = {
      admin: ['*'],
      accountant: ['donations:write', 'expenses:write', 'transactions:read', 'reports:read', 'people:read', 'vendors:read', 'projects:read', 'accounts:read', 'receipts:write'],
      manager: ['projects:read', 'people:read', 'people:write', 'vendors:read', 'vendors:write', 'reports:read', 'dashboard:read'],
      viewer: ['dashboard:read', 'reports:read'],
      donor: ['donor:portal'],
    }
    const allowed = perms[role] || []
    return allowed.includes('*') || allowed.includes(permission)
  }

  // ---- Mock-mode ledger parity ----
  // The live backend posts every donation/expense to the Transactions sheet
  // ---- Donations ----
  async function addDonation(d: Omit<Donation, 'donationID' | 'receiptNumber'>): Promise<Donation> {
    const isLive = CONFIG_USE_LIVE
    try {
      if (!isLive) {
        const run = `DON-2026-${String(nextSeq() + 1).padStart(4, '0')}`
        const receipt = `${settings.receiptPrefix}-2026-${String(nextSeq()).padStart(4, '0')}`
        Object.assign(d, { donationID: run, receiptNumber: receipt, createdAt: new Date().toISOString() } as Partial<Donation>)
      }
      const created = (await dataService.persist('donations', 'create', { ...d })) as Donation
      if (isLive) {
        // Guarantee the donation is posted to the Transactions ledger before the
        // UI refreshes, so a donation never appears without its transaction.
        await dataService.resyncLedger().catch(() => {})
      }
      notify('success', 'Donation saved')
      await refreshAll()
      if (!isLive) audit('Create', 'Donations', created.donationID)
      return created
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }
  async function updateDonation(d: Donation): Promise<void> {
    const isLive = CONFIG_USE_LIVE
    try {
      await dataService.persist('donations', 'update', d)
      notify('success', 'Donation updated')
      await refreshAll()
      if (!isLive) audit('Update', 'Donations', d.donationID)
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }
  async function softDeleteDonation(id: string): Promise<void> {
    const isLive = CONFIG_USE_LIVE
    try {
      await dataService.persist('donations', 'softDelete', { donationID: id })
      notify('success', 'Donation marked as cancelled')
      await refreshAll()
      if (!isLive) audit('SoftDelete', 'Donations', id)
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }

  async function bulkAddDonations(items: Array<Omit<Donation, 'donationID' | 'receiptNumber'>>): Promise<Donation[]> {
    const isLive = CONFIG_USE_LIVE
    const created: Donation[] = []
    try {
      for (const item of items) {
        if (!isLive) {
          const run = `DON-2026-${String(nextSeq() + 1).padStart(4, '0')}`
          const receipt = `${settings.receiptPrefix}-2026-${String(nextSeq()).padStart(4, '0')}`
          Object.assign(item, { donationID: run, receiptNumber: receipt, createdAt: new Date().toISOString() } as Partial<Donation>)
        }
        created.push((await dataService.persist('donations', 'create', { ...item })) as Donation)
      }
      if (isLive) {
        // Ensure every imported donation is posted to the ledger before refresh.
        await dataService.resyncLedger().catch(() => {})
      }
      notify('success', `${created.length} donation${created.length === 1 ? '' : 's'} saved`)
      await refreshAll()
      if (!isLive) audit('BulkCreate', 'Donations', `${created.length} records`, `${created.map((c) => c.donationID).join(', ')}`)
      return created
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }

  // ---- Expenses ----
  async function addExpense(e: Omit<Expense, 'expenseID'>): Promise<Expense> {
    const isLive = CONFIG_USE_LIVE
    try {
      if (!isLive) {
        const id = `EXP-2026-${String(nextSeq()).padStart(4, '0')}`
        Object.assign(e, { expenseID: id, createdAt: new Date().toISOString() } as Partial<Expense>)
      }
      const created = (await dataService.persist('expenses', 'create', { ...e })) as Expense
      if (isLive) {
        // Ensure the expense is posted to the ledger before the UI refreshes.
        await dataService.resyncLedger().catch(() => {})
      }
      notify('success', 'Expense saved')
      await refreshAll()
      if (!isLive) audit('Create', 'Expenses', created.expenseID)
      return created
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }
  async function updateExpense(e: Expense): Promise<void> {
    const isLive = CONFIG_USE_LIVE
    try {
      await dataService.persist('expenses', 'update', e)
      notify('success', 'Expense updated')
      await refreshAll()
      if (!isLive) audit('Update', 'Expenses', e.expenseID)
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }
  async function softDeleteExpense(id: string): Promise<void> {
    const isLive = CONFIG_USE_LIVE
    try {
      await dataService.persist('expenses', 'softDelete', { expenseID: id })
      notify('success', 'Expense marked as cancelled')
      await refreshAll()
      if (!isLive) audit('SoftDelete', 'Expenses', id)
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }

  async function bulkAddExpenses(items: Array<Omit<Expense, 'expenseID'>>): Promise<Expense[]> {
    const isLive = CONFIG_USE_LIVE
    const created: Expense[] = []
    try {
      for (const item of items) {
        if (!isLive) {
          Object.assign(item, {
            expenseID: `EXP-2026-${String(nextSeq()).padStart(4, '0')}`,
            createdAt: new Date().toISOString(),
          } as Partial<Expense>)
        }
        created.push((await dataService.persist('expenses', 'create', { ...item })) as Expense)
      }
      if (isLive) {
        // Ensure imported expenses are posted to the ledger before refresh.
        await dataService.resyncLedger().catch(() => {})
      }
      notify('success', `${created.length} expense${created.length === 1 ? '' : 's'} saved`)
      await refreshAll()
      if (!isLive) audit('BulkCreate', 'Expenses', `${created.length} records`, `${created.map((c) => c.expenseID).join(', ')}`)
      return created
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }

  // ---- People ----
  async function addPerson(p: Omit<Person, 'personID'>): Promise<Person> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('people', 'create', { ...p })) as Person
        notify('success', 'Person saved')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `PER-${String(nextSeq()).padStart(4, '0')}`
    const person: Person = { ...p, personID: id }
    setPeople((prev) => [...prev, person])
    audit('Create', 'People', id)
    return person
  }
  async function updatePerson(p: Person): Promise<void> {
    setPeople((prev) => prev.map((x) => (x.personID === p.personID ? { ...x, ...p } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('people', 'update', p)
        notify('success', 'Person updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'People', p.personID)
    }
  }
  async function deletePerson(id: string): Promise<void> {
    setPeople((prev) => prev.filter((x) => x.personID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('people', 'delete', { personID: id })
        notify('success', 'Person deleted')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'People', id)
    }
  }

  async function bulkAddPeople(items: Array<Omit<Person, 'personID'>>): Promise<Person[]> {
    if (CONFIG_USE_LIVE) {
      const created: Person[] = []
      try {
        for (const item of items) {
          created.push((await dataService.persist('people', 'create', item)) as Person)
        }
        notify('success', `${created.length} person${created.length === 1 ? '' : 's'} saved`)
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const created = items.map((p) => ({ ...p, personID: `PER-${String(nextSeq()).padStart(4, '0')}` }))
    setPeople((prev) => [...prev, ...created])
    audit('BulkCreate', 'People', `${created.length} records`, `${created.map((c) => c.personID).join(', ')}`)
    return created
  }

  // ---- Vendors ----
  async function addVendor(v: Omit<Vendor, 'vendorID'>): Promise<Vendor> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('vendors', 'create', { ...v })) as Vendor
        notify('success', 'Vendor saved')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `VEN-${String(nextSeq()).padStart(4, '0')}`
    const vendor: Vendor = { ...v, vendorID: id }
    setVendors((prev) => [...prev, vendor])
    audit('Create', 'Vendors', id)
    return vendor
  }
  async function updateVendor(v: Vendor): Promise<void> {
    setVendors((prev) => prev.map((x) => (x.vendorID === v.vendorID ? { ...x, ...v } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('vendors', 'update', v)
        notify('success', 'Vendor updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Vendors', v.vendorID)
    }
  }
  async function deleteVendor(id: string): Promise<void> {
    setVendors((prev) => prev.filter((x) => x.vendorID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('vendors', 'delete', { vendorID: id })
        notify('success', 'Vendor deleted')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'Vendors', id)
    }
  }

  async function bulkAddVendors(items: Array<Omit<Vendor, 'vendorID'>>): Promise<Vendor[]> {
    if (CONFIG_USE_LIVE) {
      const created: Vendor[] = []
      try {
        for (const item of items) {
          created.push((await dataService.persist('vendors', 'create', item)) as Vendor)
        }
        notify('success', `${created.length} vendor${created.length === 1 ? '' : 's'} saved`)
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const created = items.map((v) => ({ ...v, vendorID: `VEN-${String(nextSeq()).padStart(4, '0')}` }))
    setVendors((prev) => [...prev, ...created])
    audit('BulkCreate', 'Vendors', `${created.length} records`, `${created.map((c) => c.vendorID).join(', ')}`)
    return created
  }

  // ---- Projects ----
  async function addProject(p: Omit<Project, 'projectID'>): Promise<Project> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('projects', 'create', { ...p })) as Project
        notify('success', 'Project saved')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `PRJ-${String(nextSeq()).padStart(4, '0')}`
    const project: Project = { ...p, projectID: id }
    setProjects((prev) => [...prev, project])
    audit('Create', 'Projects', id)
    return project
  }
  async function updateProject(p: Project): Promise<void> {
    setProjects((prev) => prev.map((x) => (x.projectID === p.projectID ? { ...x, ...p } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('projects', 'update', p)
        notify('success', 'Project updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Projects', p.projectID)
    }
  }

  // ---- Pending Payments ----
  async function addPendingPayment(p: Omit<PendingPayment, 'paymentID'>): Promise<PendingPayment> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('pendingPayments', 'create', { ...p })) as PendingPayment
        notify('success', 'Payment recorded')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `PAY-${String(nextSeq()).padStart(4, '0')}`
    const pp: PendingPayment = { ...p, paymentID: id }
    setPendingPayments((prev) => [...prev, pp])
    audit('Create', 'Pending Payments', id)
    return pp
  }
  async function updatePendingPayment(p: PendingPayment): Promise<void> {
    setPendingPayments((prev) => prev.map((x) => (x.paymentID === p.paymentID ? { ...x, ...p } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('pendingPayments', 'update', p)
        notify('success', 'Payment updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Pending Payments', p.paymentID)
    }
  }

  // ---- Accounts ----
  async function addAccount(a: Omit<Account, 'accountID'>): Promise<Account> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('accounts', 'create', { ...a })) as Account
        notify('success', 'Account saved')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `ACC-${String(nextSeq()).padStart(4, '0')}`
    const account: Account = { ...a, accountID: id }
    setAccounts((prev) => [...prev, account])
    audit('Create', 'Accounts', id)
    return account
  }
  async function updateAccount(a: Account): Promise<void> {
    setAccounts((prev) => prev.map((x) => (x.accountID === a.accountID ? { ...x, ...a } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('accounts', 'update', a)
        notify('success', 'Account updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Accounts', a.accountID)
    }
  }

  // ---- Users ----
  async function addUser(u: Omit<User, 'userID' | 'createdDate'>): Promise<User> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('users', 'create', { ...u })) as User
        notify('success', 'User created')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `USR-${String(nextSeq()).padStart(4, '0')}`
    const nu: User = { ...u, userID: id, createdDate: new Date().toISOString().slice(0, 10) }
    setUsers((prev) => [...prev, nu])
    audit('Create', 'Users', id)
    return nu
  }
  async function updateUser(u: User): Promise<void> {
    setUsers((prev) => prev.map((x) => (x.userID === u.userID ? { ...x, ...u } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('users', 'update', u)
        notify('success', 'User updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Users', u.userID)
    }
  }
  async function deleteUser(id: string): Promise<void> {
    setUsers((prev) => prev.filter((x) => x.userID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('users', 'delete', { userID: id })
        notify('success', 'User deleted')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'Users', id)
    }
  }

  async function addTransaction(t: Omit<Transaction, 'transactionID'>): Promise<Transaction> {
    const isLive = CONFIG_USE_LIVE
    try {
      if (!isLive) {
        const id = `TXN-2026-${String(nextSeq()).padStart(4, '0')}`
        Object.assign(t, { transactionID: id } as Partial<Transaction>)
      }
      const created = (await dataService.persist('transactions', 'create', { ...t })) as Transaction
      notify('success', 'Transaction recorded')
      await refreshAll()
      if (!isLive) audit('Create', 'Transactions', created.transactionID)
      return created
    } catch (err) {
      notify('error', errMsg(err))
      await refreshAllSafe()
      throw err
    }
  }

  async function updateSettings(s: Settings): Promise<void> {
    setSettings(s)
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.saveSettings(s)
        notify('success', 'Settings saved')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Settings', 'settings')
    }
  }

  async function refreshMessages(): Promise<void> {
    if (!user) return
    try {
      setMessages(await dataService.getMessages(user.email))
    } catch (err) {
      notify('error', errMsg(err))
    }
  }

  const unreadMessages = messages.filter(
    (m) => user && m.recipientEmail.toLowerCase() === user.email.toLowerCase() && !m.read
  )

  // ---- Announcements ----
  async function addAnnouncement(a: Omit<Announcement, 'announcementID' | 'postedAt' | 'postedBy'>): Promise<Announcement> {
    const record = { ...a, postedBy: user?.name || '' }
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('announcements', 'create', record)) as Announcement
        notify('success', 'Announcement posted')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const ann: Announcement = {
      ...record,
      announcementID: `ANN-${String(nextSeq()).padStart(4, '0')}`,
      postedAt: new Date().toISOString(),
    }
    setAnnouncements((prev) => [ann, ...prev])
    audit('Create', 'Announcements', ann.announcementID)
    return ann
  }
  async function updateAnnouncement(a: Announcement): Promise<void> {
    setAnnouncements((prev) => prev.map((x) => (x.announcementID === a.announcementID ? { ...x, ...a } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('announcements', 'update', a)
        notify('success', 'Announcement updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Announcements', a.announcementID)
    }
  }
  async function archiveAnnouncement(id: string): Promise<void> {
    setAnnouncements((prev) => prev.map((x) => (x.announcementID === id ? { ...x, status: 'archived' } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('announcements', 'softDelete', { announcementID: id })
        notify('success', 'Announcement archived')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Archive', 'Announcements', id)
    }
  }

  // ---- Messages ----
  async function sendMessage(m: Pick<Message, 'recipientEmail' | 'subject' | 'body'>): Promise<Message> {
    if (!user) throw new Error('Not logged in')
    const record: Message = {
      messageID: '',
      senderEmail: user.email,
      senderName: user.name,
      recipientEmail: m.recipientEmail.trim(),
      subject: m.subject.trim(),
      body: m.body.trim(),
      sentAt: '',
      read: false,
      readAt: '',
    }
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('messages', 'create', record)) as Message
        notify('success', 'Message sent')
        await refreshMessages()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshMessages()
        throw err
      }
    }
    const msg: Message = {
      ...record,
      messageID: `MSG-${String(nextSeq()).padStart(4, '0')}`,
      sentAt: new Date().toISOString(),
    }
    setMessages((prev) => [msg, ...prev])
    audit('Send', 'Messages', msg.messageID)
    return msg
  }
  async function markMessageRead(id: string): Promise<void> {
    const target = messages.find((m) => m.messageID === id)
    if (!target || target.read) return
    setMessages((prev) => prev.map((m) => (m.messageID === id ? { ...m, read: true, readAt: new Date().toISOString() } : m)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.markMessageRead(id)
      } catch (err) {
        notify('error', errMsg(err))
        await refreshMessages()
        throw err
      }
    } else {
      audit('Read', 'Messages', id)
    }
  }
  async function deleteMessage(id: string, side: 'sender' | 'recipient'): Promise<void> {
    setMessages((prev) => prev.filter((m) => m.messageID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        if (!user) throw new Error('Not logged in')
        await dataService.deleteMessage(id, user.email, side)
        notify('success', 'Message deleted')
        await refreshMessages()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshMessages()
        throw err
      }
    } else {
      audit('Delete', 'Messages', id, user?.email || '')
    }
  }

  // ---- Events ----
  async function addEvent(e: Omit<TempleEvent, 'eventID'>): Promise<TempleEvent> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('events', 'create', { ...e })) as TempleEvent
        notify('success', 'Event created')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const ev: TempleEvent = { ...e, eventID: `EVT-${String(nextSeq()).padStart(4, '0')}` }
    setEvents((prev) => [ev, ...prev])
    audit('Create', 'Events', ev.eventID)
    return ev
  }
  async function updateEvent(e: TempleEvent): Promise<void> {
    setEvents((prev) => prev.map((x) => (x.eventID === e.eventID ? { ...x, ...e } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('events', 'update', e)
        notify('success', 'Event updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Events', e.eventID)
    }
  }
  async function deleteEvent(id: string): Promise<void> {
    setEvents((prev) => prev.filter((x) => x.eventID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('events', 'hardDelete', { eventID: id })
        notify('success', 'Event deleted')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'Events', id)
    }
  }

  // ---- Event Volunteers ----
  async function addVolunteer(v: Omit<EventVolunteer, 'volunteerID' | 'registeredAt'>): Promise<EventVolunteer> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('eventVolunteers', 'create', { ...v })) as EventVolunteer
        notify('success', 'Volunteer registered')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const vol: EventVolunteer = {
      ...v,
      volunteerID: `VOL-${String(nextSeq()).padStart(4, '0')}`,
      registeredAt: new Date().toISOString(),
    }
    setEventVolunteers((prev) => [...prev, vol])
    audit('Create', 'Event Volunteers', vol.volunteerID)
    return vol
  }
  async function updateVolunteer(v: EventVolunteer): Promise<void> {
    setEventVolunteers((prev) => prev.map((x) => (x.volunteerID === v.volunteerID ? { ...x, ...v } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('eventVolunteers', 'update', v)
        notify('success', 'Volunteer updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Event Volunteers', v.volunteerID)
    }
  }
  async function removeVolunteer(id: string): Promise<void> {
    setEventVolunteers((prev) => prev.filter((x) => x.volunteerID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('eventVolunteers', 'hardDelete', { volunteerID: id })
        notify('success', 'Volunteer removed')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'Event Volunteers', id)
    }
  }

  // ---- Requests ----
  async function addRequest(r: Omit<PrayerRequest, 'requestID'>): Promise<PrayerRequest> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('requests', 'create', { ...r })) as PrayerRequest
        notify('success', 'Request recorded')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const req: PrayerRequest = { ...r, requestID: `REQ-${String(nextSeq()).padStart(4, '0')}` }
    setRequests((prev) => [req, ...prev])
    audit('Create', 'Requests', req.requestID)
    return req
  }
  async function updateRequest(r: PrayerRequest): Promise<void> {
    setRequests((prev) => prev.map((x) => (x.requestID === r.requestID ? { ...x, ...r } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('requests', 'update', r)
        notify('success', 'Request updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Requests', r.requestID)
    }
  }
  async function deleteRequest(id: string): Promise<void> {
    setRequests((prev) => prev.filter((x) => x.requestID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('requests', 'hardDelete', { requestID: id })
        notify('success', 'Request deleted')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'Requests', id)
    }
  }

  // ---- Donor Care: communication log + email ----
  async function addCommunication(c: Omit<Communication, 'communicationID'>): Promise<Communication> {
    if (CONFIG_USE_LIVE) {
      try {
        const created = (await dataService.persist('communications', 'create', { ...c })) as Communication
        notify('success', 'Communication logged')
        await refreshAll()
        return created
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    }
    const id = `COM-${String(nextSeq()).padStart(4, '0')}`
    const comm: Communication = { ...c, communicationID: id }
    setCommunications((prev) => [comm, ...prev])
    audit('Create', 'Donor Care', id)
    return comm
  }
  async function updateCommunication(c: Communication): Promise<void> {
    setCommunications((prev) => prev.map((x) => (x.communicationID === c.communicationID ? { ...x, ...c } : x)))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('communications', 'update', c)
        notify('success', 'Communication updated')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Update', 'Donor Care', c.communicationID)
    }
  }
  async function deleteCommunication(id: string): Promise<void> {
    setCommunications((prev) => prev.filter((x) => x.communicationID !== id))
    if (CONFIG_USE_LIVE) {
      try {
        await dataService.persist('communications', 'hardDelete', { communicationID: id })
        notify('success', 'Communication deleted')
        await refreshAll()
      } catch (err) {
        notify('error', errMsg(err))
        await refreshAllSafe()
        throw err
      }
    } else {
      audit('Delete', 'Donor Care', id)
    }
  }

  async function sendDonorEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; to: string; sentAt: string }> {
    return dataService.sendDonorEmail(to, subject, body)
  }

  async function sendBulkEmails(messages: BulkEmailPart[]): Promise<BulkSendResult> {
    return dataService.sendBulkEmails(messages)
  }

  async function sendBulkSms(messages: BulkSmsPart[]): Promise<BulkSendResult> {
    return dataService.sendBulkSms(messages)
  }

  async function sendBulkWhatsApp(messages: Array<{ to: string; params: string[] }>): Promise<BulkSendResult> {
    return dataService.sendBulkWhatsApp(messages)
  }

  async function logBulkCommunications(records: Array<Omit<Communication, 'communicationID'>>): Promise<{ created: number; errors: string[] }> {
    return dataService.logBulkCommunications(records)
  }

  const value: AppContextValue = {
    user,
    login,
    logout,
    can,
    loading,
    settings,
    updateSettings,
    donors: people,
    people,
    donations,
    expenses,
    vendors,
    projects,
    pendingPayments,
    accounts,
    transactions,
    users,
    auditLog,
    dashboard: dashboard as DashboardData,
    announcements,
    messages,
    events,
    eventVolunteers,
    requests,
    unreadMessages,
    refreshMessages,
    setMessagesPolling,
    addDonation,
    updateDonation,
    softDeleteDonation,
    bulkAddDonations,
    addExpense,
    updateExpense,
    softDeleteExpense,
    bulkAddExpenses,
    addPerson,
    updatePerson,
    deletePerson,
    bulkAddPeople,
    addVendor,
    updateVendor,
    deleteVendor,
    bulkAddVendors,
    addProject,
    updateProject,
    addPendingPayment,
    updatePendingPayment,
    addAccount,
    updateAccount,
    addUser,
    updateUser,
    deleteUser,
    addTransaction,
    addAnnouncement,
    updateAnnouncement,
    archiveAnnouncement,
    sendMessage,
    markMessageRead,
    deleteMessage,
    addEvent,
    updateEvent,
    deleteEvent,
    addVolunteer,
    updateVolunteer,
    removeVolunteer,
    addRequest,
    updateRequest,
    deleteRequest,
    communications,
    addCommunication,
    updateCommunication,
    deleteCommunication,
    sendDonorEmail,
    sendBulkEmails,
    sendBulkSms,
    sendBulkWhatsApp,
    logBulkCommunications,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastViewport toastList={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </AppContext.Provider>
  )
}

function ToastViewport({ toastList, onDismiss }: { toastList: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toastList.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toastList.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm bg-white ${
            t.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          )}
          <span className="flex-1 min-w-0 break-words font-medium">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}