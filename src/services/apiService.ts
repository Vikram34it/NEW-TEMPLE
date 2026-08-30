import { CONFIG } from '../config/apiConfig'
import { buildDashboardData, mockData } from '../data/mockData'
import type {
  Account,
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

// A lightweight, mock-safe data layer. When the Apps Script backend URL is
// configured (useMockData = false), every "load" call fetches from the API.
// When not configured, it returns bundled sample data so the UI can be
// developed and demoed fully offline.

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

async function apiFetch(path: string, params: Record<string, string> = {}, body?: unknown) {
  if (!CONFIG.webAppUrl) {
    throw new Error('API not configured')
  }
  const qs = new URLSearchParams(params).toString()
  const url = `${CONFIG.webAppUrl}?action=${path}${qs ? `&${qs}` : ''}${TOKEN ? `&token=${TOKEN}` : ''}`
  const res = await fetch(url, body ? {
    method: 'POST',
    body: JSON.stringify(body),
  } : undefined)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const json = await res.json()
  if (json.success === false) {
    throw new Error(json.message || 'API request failed')
  }
  return json.data
}

// Optional token sent to the backend (e.g. the API_KEY from Apps Script).
// Configure it via an environment variable at build time where appropriate.
const TOKEN = import.meta.env.VITE_API_TOKEN || ''

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
      return apiFetch(record)
    }
    return mockStore.data[record]
  },

  async save(record: RecordName, action: string, payload: unknown): Promise<unknown> {
    if (!CONFIG.useMockData && CONFIG.webAppUrl) {
      return apiFetch(action, { record, payload: JSON.stringify(payload) }, payload)
    }
    // For mock mode, mutations are persisted to localStorage so the demo
    // remembers changes between refreshes.
    return persistMock(record, action, payload)
  },
}

function persistMock(record: RecordName, action: string, payload: unknown) {
  const store = mockStore.data
  let result: unknown
  // Reflection-free manual handling for the records we support mutating.
  if (record === 'donations') {
    result = mutateArray(store.donations as Donation[], action, payload as Donation)
  } else if (record === 'expenses') {
    result = mutateArray(store.expenses as Expense[], action, payload as Expense)
  } else if (record === 'people') {
    result = mutateArray(store.people as Person[], action, payload as Person)
  } else if (record === 'vendors') {
    result = mutateArray(store.vendors as Vendor[], action, payload as Vendor)
  } else if (record === 'projects') {
    result = mutateArray(store.projects as Project[], action, payload as Project)
  } else if (record === 'pendingPayments') {
    result = mutateArray(store.pendingPayments as PendingPayment[], action, payload as PendingPayment)
  } else if (record === 'accounts') {
    result = mutateArray(store.accounts as Account[], action, payload as Account)
  } else if (record === 'transactions') {
    result = mutateArray(store.transactions as Transaction[], action, payload as Transaction)
  } else if (record === 'users') {
    result = mutateArray(store.users as User[], action, payload as User)
  } else if (record === 'settings') {
    store.settings = payload as Settings
    result = store.settings
  }
  return result
}

function mutateArray<T extends object>(arr: T[], action: string, record: T) {
  const cast = arr as Record<string, unknown>[]
  const rec = record as Record<string, unknown>
  const idKey = Object.keys(rec)[0]
  const id = rec[idKey!] as string
  if (action === 'create') {
    arr.push(record)
    return record
  }
  if (action === 'update') {
    const idx = cast.findIndex((r) => r[idKey!] === id)
    if (idx !== -1) {
      cast[idx] = { ...cast[idx], ...rec }
      return cast[idx]
    }
    return record
  }
  if (action === 'delete' || action === 'softDelete') {
    if (action === 'softDelete') {
      const idx = cast.findIndex((r) => r[idKey!] === id)
      if (idx !== -1) {
        cast[idx] = { ...cast[idx], deleted: true }
        return cast[idx]
      }
    } else {
      const idx = cast.findIndex((r) => r[idKey!] === id)
      if (idx !== -1) arr.splice(idx, 1)
    }
    return null
  }
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
