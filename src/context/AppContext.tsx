import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CONFIG } from '../config/apiConfig'
import { dataService } from '../services/apiService'
import type {
  Account,
  AuditLogEntry,
  DashboardData,
  Donation,
  Expense,
  PendingPayment,
  Person,
  Project,
  Settings,
  Transaction,
  User,
  Vendor,
} from '../types'

interface AppContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  can: (permission: string) => boolean

  loading: boolean
  settings: Settings
  updateSettings: (s: Settings) => void

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

  addDonation: (d: Omit<Donation, 'donationID' | 'receiptNumber'>) => Donation
  updateDonation: (d: Donation) => void
  softDeleteDonation: (id: string) => void
  bulkAddDonations: (items: Array<Omit<Donation, 'donationID' | 'receiptNumber'>>) => Donation[]

  addExpense: (e: Omit<Expense, 'expenseID'>) => Expense
  updateExpense: (e: Expense) => void
  softDeleteExpense: (id: string) => void
  bulkAddExpenses: (items: Array<Omit<Expense, 'expenseID'>>) => Expense[]

  addPerson: (p: Omit<Person, 'personID'>) => Person
  updatePerson: (p: Person) => void
  deletePerson: (id: string) => void
  bulkAddPeople: (items: Array<Omit<Person, 'personID'>>) => Person[]

  addVendor: (v: Omit<Vendor, 'vendorID'>) => Vendor
  updateVendor: (v: Vendor) => void
  deleteVendor: (id: string) => void
  bulkAddVendors: (items: Array<Omit<Vendor, 'vendorID'>>) => Vendor[]

  addProject: (p: Omit<Project, 'projectID'>) => Project
  updateProject: (p: Project) => void

  addPendingPayment: (p: Omit<PendingPayment, 'paymentID'>) => PendingPayment
  updatePendingPayment: (p: PendingPayment) => void

  addAccount: (a: Omit<Account, 'accountID'>) => Account
  updateAccount: (a: Account) => void

  addUser: (u: Omit<User, 'userID' | 'createdDate'>) => User
  updateUser: (u: User) => void
  deleteUser: (id: string) => void

  addTransaction: (t: Omit<Transaction, 'transactionID'>) => Transaction
}

const AppContext = createContext<AppContextValue | null>(null)

const CONFIG_USE_LIVE = !CONFIG.useMockData && !!CONFIG.webAppUrl

let seq = 100

function nextSeq() {
  seq += 1
  return seq
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
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
  const [settings, setSettings] = useState<Settings>({
    templeName: 'ISKCON New Temple',
    templeAddress: '',
    templePhone: '',
    templeEmail: '',
    receiptPrefix: 'REC',
    currentSequence: 1,
    defaultBankAccount: '',
    currency: 'INR',
  })
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  useEffect(() => {
    let active = true
    async function loadAll() {
      try {
        const [u, p, d, e, v, pr, pp, ac, t, s] = await Promise.all([
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
        ])
        if (!active) return
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
        const dash = await dataService.getDashboard()
        if (active) setDashboard(dash)
      } catch (err) {
        console.error('Failed to load app data', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadAll()
    return () => {
      active = false
    }
  }, [])

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
          audit('Login', 'Auth', u.userID)
        }
        resolve(msg)
      }
      if (!CONFIG_USE_LIVE) {
        // Local demo: match against loaded users
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
  }

  const can = (permission: string): boolean => {
    if (!user) return false
    const role = user.role
    const perms: Record<string, string[]> = {
      admin: ['*'],
      accountant: ['donations:write', 'expenses:write', 'transactions:read', 'reports:read', 'people:read', 'vendors:read', 'projects:read', 'accounts:read', 'receipts:write'],
      manager: ['projects:read', 'people:read', 'people:write', 'vendors:read', 'vendors:write', 'reports:read', 'dashboard:read'],
      viewer: ['dashboard:read', 'reports:read'],
    }
    const allowed = perms[role] || []
    return allowed.includes('*') || allowed.includes(permission)
  }

  // ---- Donations ----
  function addDonation(d: Omit<Donation, 'donationID' | 'receiptNumber'>): Donation {
    const run = `DON-2026-${String(nextSeq() + 1).padStart(4, '0')}`
    const id = run
    const receipt = `${settings.receiptPrefix}-2026-${String(nextSeq()).padStart(4, '0')}`
    const donation: Donation = { ...d, donationID: id, receiptNumber: receipt, createdAt: new Date().toISOString() }
    setDonations((prev) => [donation, ...prev])
    audit('Create', 'Donations', id)
    return donation
  }
  function updateDonation(d: Donation) {
    setDonations((prev) => prev.map((x) => (x.donationID === d.donationID ? { ...x, ...d } : x)))
    audit('Update', 'Donations', d.donationID)
  }
  function softDeleteDonation(id: string) {
    setDonations((prev) => prev.map((x) => (x.donationID === id ? { ...x, deleted: true } : x)))
    audit('SoftDelete', 'Donations', id)
  }

  function bulkAddDonations(items: Array<Omit<Donation, 'donationID' | 'receiptNumber'>>): Donation[] {
    const created = items.map((d) => {
      const run = `DON-2026-${String(nextSeq() + 1).padStart(4, '0')}`
      const receipt = `${settings.receiptPrefix}-2026-${String(nextSeq()).padStart(4, '0')}`
      return { ...d, donationID: run, receiptNumber: receipt, createdAt: new Date().toISOString() }
    })
    setDonations((prev) => [...created, ...prev])
    audit('BulkCreate', 'Donations', `${created.length} records`, `${created.map((c) => c.donationID).join(', ')}`)
    return created
  }

  // ---- Expenses ----
  function addExpense(e: Omit<Expense, 'expenseID'>): Expense {
    const id = `EXP-2026-${String(nextSeq()).padStart(4, '0')}`
    const expense: Expense = { ...e, expenseID: id, createdAt: new Date().toISOString() }
    setExpenses((prev) => [expense, ...prev])
    audit('Create', 'Expenses', id)
    return expense
  }
  function updateExpense(e: Expense) {
    setExpenses((prev) => prev.map((x) => (x.expenseID === e.expenseID ? { ...x, ...e } : x)))
    audit('Update', 'Expenses', e.expenseID)
  }
  function softDeleteExpense(id: string) {
    setExpenses((prev) => prev.map((x) => (x.expenseID === id ? { ...x, deleted: true } : x)))
    audit('SoftDelete', 'Expenses', id)
  }

  function bulkAddExpenses(items: Array<Omit<Expense, 'expenseID'>>): Expense[] {
    const created = items.map((e) => ({
      ...e,
      expenseID: `EXP-2026-${String(nextSeq()).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    }))
    setExpenses((prev) => [...created, ...prev])
    audit('BulkCreate', 'Expenses', `${created.length} records`, `${created.map((c) => c.expenseID).join(', ')}`)
    return created
  }

  // ---- People ----
  function addPerson(p: Omit<Person, 'personID'>): Person {
    const id = `PER-${String(nextSeq()).padStart(4, '0')}`
    const person: Person = { ...p, personID: id }
    setPeople((prev) => [...prev, person])
    audit('Create', 'People', id)
    return person
  }
  function updatePerson(p: Person) {
    setPeople((prev) => prev.map((x) => (x.personID === p.personID ? { ...x, ...p } : x)))
    audit('Update', 'People', p.personID)
  }
  function deletePerson(id: string) {
    setPeople((prev) => prev.filter((x) => x.personID !== id))
    audit('Delete', 'People', id)
  }

  function bulkAddPeople(items: Array<Omit<Person, 'personID'>>): Person[] {
    const created = items.map((p) => ({ ...p, personID: `PER-${String(nextSeq()).padStart(4, '0')}` }))
    setPeople((prev) => [...prev, ...created])
    audit('BulkCreate', 'People', `${created.length} records`, `${created.map((c) => c.personID).join(', ')}`)
    return created
  }

  // ---- Vendors ----
  function addVendor(v: Omit<Vendor, 'vendorID'>): Vendor {
    const id = `VEN-${String(nextSeq()).padStart(4, '0')}`
    const vendor: Vendor = { ...v, vendorID: id }
    setVendors((prev) => [...prev, vendor])
    audit('Create', 'Vendors', id)
    return vendor
  }
  function updateVendor(v: Vendor) {
    setVendors((prev) => prev.map((x) => (x.vendorID === v.vendorID ? { ...x, ...v } : x)))
    audit('Update', 'Vendors', v.vendorID)
  }
  function deleteVendor(id: string) {
    setVendors((prev) => prev.filter((x) => x.vendorID !== id))
    audit('Delete', 'Vendors', id)
  }

  function bulkAddVendors(items: Array<Omit<Vendor, 'vendorID'>>): Vendor[] {
    const created = items.map((v) => ({ ...v, vendorID: `VEN-${String(nextSeq()).padStart(4, '0')}` }))
    setVendors((prev) => [...prev, ...created])
    audit('BulkCreate', 'Vendors', `${created.length} records`, `${created.map((c) => c.vendorID).join(', ')}`)
    return created
  }

  // ---- Projects ----
  function addProject(p: Omit<Project, 'projectID'>): Project {
    const id = `PRJ-${String(nextSeq()).padStart(4, '0')}`
    const project: Project = { ...p, projectID: id }
    setProjects((prev) => [...prev, project])
    audit('Create', 'Projects', id)
    return project
  }
  function updateProject(p: Project) {
    setProjects((prev) => prev.map((x) => (x.projectID === p.projectID ? { ...x, ...p } : x)))
    audit('Update', 'Projects', p.projectID)
  }

  // ---- Pending Payments ----
  function addPendingPayment(p: Omit<PendingPayment, 'paymentID'>): PendingPayment {
    const id = `PAY-${String(nextSeq()).padStart(4, '0')}`
    const pp: PendingPayment = { ...p, paymentID: id }
    setPendingPayments((prev) => [...prev, pp])
    audit('Create', 'Pending Payments', id)
    return pp
  }
  function updatePendingPayment(p: PendingPayment) {
    setPendingPayments((prev) => prev.map((x) => (x.paymentID === p.paymentID ? { ...x, ...p } : x)))
    audit('Update', 'Pending Payments', p.paymentID)
  }

  // ---- Accounts ----
  function addAccount(a: Omit<Account, 'accountID'>): Account {
    const id = `ACC-${String(nextSeq()).padStart(4, '0')}`
    const account: Account = { ...a, accountID: id }
    setAccounts((prev) => [...prev, account])
    audit('Create', 'Accounts', id)
    return account
  }
  function updateAccount(a: Account) {
    setAccounts((prev) => prev.map((x) => (x.accountID === a.accountID ? { ...x, ...a } : x)))
    audit('Update', 'Accounts', a.accountID)
  }

  // ---- Users ----
  function addUser(u: Omit<User, 'userID' | 'createdDate'>): User {
    const id = `USR-${String(nextSeq()).padStart(4, '0')}`
    const nu: User = { ...u, userID: id, createdDate: new Date().toISOString().slice(0, 10) }
    setUsers((prev) => [...prev, nu])
    audit('Create', 'Users', id)
    return nu
  }
  function updateUser(u: User) {
    setUsers((prev) => prev.map((x) => (x.userID === u.userID ? { ...x, ...u } : x)))
    audit('Update', 'Users', u.userID)
  }
  function deleteUser(id: string) {
    setUsers((prev) => prev.filter((x) => x.userID !== id))
    audit('Delete', 'Users', id)
  }

  function addTransaction(t: Omit<Transaction, 'transactionID'>): Transaction {
    const id = `TXN-2026-${String(nextSeq()).padStart(4, '0')}`
    const tx: Transaction = { ...t, transactionID: id }
    setTransactions((prev) => [tx, ...prev])
    audit('Create', 'Transactions', id)
    return tx
  }

  function updateSettings(s: Settings) {
    setSettings(s)
    audit('Update', 'Settings', 'settings')
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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
