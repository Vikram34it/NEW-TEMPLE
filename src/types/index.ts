export type Role = 'admin' | 'accountant' | 'manager' | 'viewer' | 'donor'

export interface User {
  userID: string
  name: string
  email: string
  role: Role
  status: 'active' | 'inactive'
  createdDate: string
  password: string
  phone?: string
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
  birthday?: string
  anniversary?: string
  preferredChannel?: string
  panNumber?: string
  aadhaarNumber?: string
}

export interface Communication {
  communicationID: string
  personID: string
  donorName: string
  date: string
  channel: string
  type: string
  subject: string
  message: string
  sentBy: string
  status: string
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
  panNumber?: string
  aadhaarNumber?: string
  need80G?: boolean
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
  smsProvider?: string
  smsApiKey?: string
  smsAccountSid?: string
  smsSenderId?: string
  smsFrom?: string
  smsCustomUrl?: string
  waApiToken?: string
  waPhoneNumberId?: string
  waTemplateName?: string
  waTemplateLanguage?: string
  waTemplateParamMap?: string
}

export interface DashboardData {
  totalDonations: number
  totalExpenses: number
  totalAssets: number
  totalConstructionExpenses: number
  constructionDonations: number
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

export interface BulkEmailPart {
  to: string
  subject: string
  body: string
}

export interface BulkSmsPart {
  to: string
  body: string
}

export interface BulkSendResult {
  sent: number
  failed: number
  total: number
  failures: { to: string; error: string }[]
}

export type CommunicationChannel = 'Email' | 'SMS' | 'WhatsApp'

export type CampaignChannel = 'email' | 'sms' | 'whatsapp'
export type CampaignStatus = 'scheduled' | 'sent' | 'partial' | 'failed' | 'cancelled'

export interface CampaignRecipient {
  personID?: string
  name: string
  email?: string
  phone?: string
  city?: string
}

export interface Campaign {
  campaignID: string
  scheduledAt: string
  channel: CampaignChannel
  type: string
  subject: string
  message: string
  festival: string
  recipients: string
  sentBy: string
  status: CampaignStatus
  createdAt: string
}

export interface BulkCampaignPayload {
  recipients: CampaignRecipient[]
  subject: string
  message: string
  festival: string
  channel: CampaignChannel
  type: string
  scheduledAt: string
  sentBy: string
}

export type { Settings as AppSettings }
