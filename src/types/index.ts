export type Role = 'admin' | 'accountant' | 'manager' | 'viewer'

export interface User {
  userID: string
  name: string
  email: string
  role: Role
  status: 'active' | 'inactive'
  createdDate: string
  password: string
}

export interface Person {
  personID: string
  name: string
  phone: string
  email: string
  address: string
  city: string
  personType: string[]
  joinDate: string
  status: 'active' | 'inactive'
  notes: string
}

export interface Donation {
  donationID: string
  date: string
  donorID: string
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
  receiptNumber: string
  notes: string
  createdAt?: string
  updatedAt?: string
  deleted?: boolean
}

export interface Expense {
  expenseID: string
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
  createdAt?: string
  updatedAt?: string
  deleted?: boolean
}

export interface Vendor {
  vendorID: string
  companyName: string
  contactPerson: string
  phone: string
  email: string
  address: string
  serviceType: string
  gstNumber: string
  bankDetails: string
  notes: string
}

export interface Project {
  projectID: string
  projectName: string
  description: string
  startDate: string
  estimatedBudget: number
  actualExpense: number
  status: 'not-started' | 'in-progress' | 'on-hold' | 'completed'
  contractor: string
}

export interface PendingPayment {
  paymentID: string
  date: string
  personOrVendor: string
  amountDue: number
  amountPaid: number
  remainingAmount: number
  dueDate: string
  project: string
  status: 'pending' | 'partially-paid' | 'paid' | 'overdue'
  notes: string
}

export interface Account {
  accountID: string
  accountName: string
  openingBalance: number
  currentBalance: number
  notes: string
  type: 'cash' | 'bank' | 'donation' | 'construction'
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  transactionID: string
  date: string
  type: TransactionType
  incomeOrExpense: 'income' | 'expense'
  amount: number
  account: string
  referenceID: string
  description: string
  createdBy: string
}

export interface AuditLogEntry {
  logID: string
  dateTime: string
  user: string
  action: string
  module: string
  recordID: string
  oldValue: string
  newValue: string
}

export interface Settings {
  templeName: string
  templeAddress: string
  templePhone: string
  templeEmail: string
  receiptPrefix: string
  currentSequence: number
  defaultBankAccount: string
  currency: string
}

export interface DashboardData {
  totalDonations: number
  totalExpenses: number
  totalConstructionExpenses: number
  cashBalance: number
  bankBalance: number
  pendingPayments: number
  thisMonthDonations: number
  thisMonthExpenses: number
  monthlyTrend: { month: string; donations: number; expenses: number }[]
  donationsByCategory: { name: string; value: number }[]
  expensesByCategory: { name: string; value: number }[]
  constructionBudgets: { name: string; budget: number; actual: number }[]
}

export interface Announcement {
  announcementID: string
  title: string
  body: string
  postedBy: string
  postedAt: string
  pinned: boolean
  expiresAt: string
  status: 'active' | 'archived'
  deleted?: boolean
}

export interface Message {
  messageID: string
  senderEmail: string
  senderName: string
  recipientEmail: string
  subject: string
  body: string
  sentAt: string
  read: boolean
  readAt: string
  deletedBySender?: boolean
  deletedByRecipient?: boolean
}

export interface TempleEvent {
  eventID: string
  title: string
  date: string
  time: string
  location: string
  description: string
  category: string
  budget: number
  organizer: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

export interface EventVolunteer {
  volunteerID: string
  eventID: string
  personID: string
  name: string
  role: string
  registeredAt: string
}

export interface PrayerRequest {
  requestID: string
  date: string
  personID: string
  personName: string
  type: string
  description: string
  assignedTo: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  notes: string
}

export type { Settings as AppSettings }
