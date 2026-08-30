import type {
  Account,
  Announcement,
  AuditLogEntry,
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

const baseDonations: Donation[] = [
  { donationID: 'DON-2026-0001', date: '2026-01-05', donorID: 'PER-0001', donorName: 'Radha Krishna Das', phone: '9845012345', email: 'rkdas@example.com', address: '12 Main Road, Bengaluru', amount: 50000, category: 'Temple Construction', purpose: 'Main temple construction fund', paymentMethod: 'Bank Transfer', transactionReference: 'NEFT-44721', receivedBy: 'Admin', receiptNumber: 'REC-2026-0001', notes: '', createdAt: '2026-01-05T09:00:00Z' },
  { donationID: 'DON-2026-0002', date: '2026-01-12', donorID: 'PER-0002', donorName: 'Madhumati Devi Dasi', phone: '9987654321', email: 'madhumati@example.com', address: '45 Lake View, Mysuru', amount: 25000, category: 'Annadanam / Food Distribution', purpose: 'Monthly food distribution', paymentMethod: 'UPI', transactionReference: 'UPI-889312', receivedBy: 'Accountant', receiptNumber: 'REC-2026-0002', notes: '' },
  { donationID: 'DON-2026-0003', date: '2026-02-02', donorID: 'PER-0003', donorName: 'Gopal Charan Das', phone: '9012345678', email: 'gopal@example.com', address: '3 Temple Street, Hubli', amount: 100000, category: 'Deity Worship', purpose: 'Installation of deities', paymentMethod: 'Cheque', transactionReference: 'CHQ-223456', receivedBy: 'Admin', receiptNumber: 'REC-2026-0003', notes: 'Cheque from private bank' },
  { donationID: 'DON-2026-0004', date: '2026-02-18', donorID: 'PER-0004', donorName: 'Shyamasundar Devotee', phone: '9345678901', email: 'shyama@example.com', address: '7 Green Park, Bengaluru', amount: 15000, category: 'General Donation', purpose: 'General support', paymentMethod: 'Cash', transactionReference: '', receivedBy: 'Accountant', receiptNumber: 'REC-2026-0004', notes: '' },
  { donationID: 'DON-2026-0005', date: '2026-03-09', donorID: 'PER-0005', donorName: 'Narayanan Murthy', phone: '9441122334', email: 'narayanan@example.com', address: '22 Residency Road, Bengaluru', amount: 200000, category: 'Cow Protection', purpose: 'Goshala construction', paymentMethod: 'Bank Transfer', transactionReference: 'NEFT-99102', receivedBy: 'Admin', receiptNumber: 'REC-2026-0005', notes: '' },
  { donationID: 'DON-2026-0006', date: '2026-04-11', donorID: 'PER-0006', donorName: 'Amit Patel', phone: '9765432109', email: 'amit@example.com', address: '88 Diamond Colony, Ahmedabad', amount: 30000, category: 'Education', purpose: 'Gurukula books fund', paymentMethod: 'Card', transactionReference: 'CARD-556781', receivedBy: 'Accountant', receiptNumber: 'REC-2026-0006', notes: '' },
  { donationID: 'DON-2026-0007', date: '2026-05-07', donorID: 'PER-0001', donorName: 'Radha Krishna Das', phone: '9845012345', email: 'rkdas@example.com', address: '12 Main Road, Bengaluru', amount: 75000, category: 'Festivals', purpose: 'Ratha Yatra festival', paymentMethod: 'UPI', transactionReference: 'UPI-102938', receivedBy: 'Admin', receiptNumber: 'REC-2026-0007', notes: '' },
  { donationID: 'DON-2026-0008', date: '2026-06-03', donorID: 'PER-0007', donorName: 'Lakshmi Narasimha', phone: '9638527410', email: 'ln@example.com', address: '4 Lake Road, Chennai', amount: 120000, category: 'Seva', purpose: 'Sponsor devotee seva', paymentMethod: 'Bank Transfer', transactionReference: 'IMPS-778899', receivedBy: 'Accountant', receiptNumber: 'REC-2026-0008', notes: '' },
  { donationID: 'DON-2026-0009', date: '2026-07-14', donorID: 'PER-0008', donorName: 'Sita Devi', phone: '9876543210', email: 'sita@example.com', address: '15 Lotus Lane, Bengaluru', amount: 10000, category: 'General Donation', purpose: 'General offering', paymentMethod: 'Cash', transactionReference: '', receivedBy: 'Admin', receiptNumber: 'REC-2026-0009', notes: '' },
  { donationID: 'DON-2026-0010', date: '2026-08-19', donorID: 'PER-0003', donorName: 'Gopal Charan Das', phone: '9012345678', email: 'gopal@example.com', address: '3 Temple Street, Hubli', amount: 40000, category: 'Temple Construction', purpose: 'Cement purchase fund', paymentMethod: 'UPI', transactionReference: 'UPI-223344', receivedBy: 'Accountant', receiptNumber: 'REC-2026-0010', notes: '' },
]

const baseExpenses: Expense[] = [
  { expenseID: 'EXP-2026-0001', date: '2026-01-10', category: 'Cement', description: 'Purchase of 200 bags cement for foundation', amount: 85000, paymentMethod: 'Bank Transfer', vendorID: 'VEN-0001', vendorName: 'Ultra Cement Traders', billNumber: 'BL-1101', transactionReference: 'NEFT-55221', projectID: 'PRJ-0001', projectName: 'Main Temple Building', approvedBy: 'Admin', paidBy: 'Admin', notes: '' },
  { expenseID: 'EXP-2026-0002', date: '2026-01-22', category: 'Labour', description: 'Masonry labour for week 4 Jan', amount: 45000, paymentMethod: 'Cash', vendorID: 'VEN-0004', vendorName: 'Sharma Contractors', billNumber: '', transactionReference: '', projectID: 'PRJ-0001', projectName: 'Main Temple Building', approvedBy: 'Admin', paidBy: 'Accountant', notes: 'Weekly payment' },
  { expenseID: 'EXP-2026-0003', date: '2026-02-15', category: 'Steel', description: 'Structural steel for prayer hall', amount: 120000, paymentMethod: 'Bank Transfer', vendorID: 'VEN-0002', vendorName: 'Jindal Steel Co.', billNumber: 'BL-2203', transactionReference: 'NEFT-88123', projectID: 'PRJ-0002', projectName: 'Prayer Hall', approvedBy: 'Admin', paidBy: 'Admin', notes: '' },
  { expenseID: 'EXP-2026-0004', date: '2026-03-05', category: 'Electrical Work', description: 'Electrical wiring main building', amount: 60000, paymentMethod: 'Cheque', vendorID: 'VEN-0003', vendorName: 'Bright Electricals', billNumber: 'BL-3312', transactionReference: 'CHQ-55667', projectID: 'PRJ-0001', projectName: 'Main Temple Building', approvedBy: 'Admin', paidBy: 'Admin', notes: '' },
  { expenseID: 'EXP-2026-0005', date: '2026-04-12', category: 'Groceries', description: 'Monthly kitchen groceries', amount: 18000, paymentMethod: 'Cash', vendorID: 'VEN-0006', vendorName: 'Annapurna Grocers', billNumber: '', transactionReference: '', projectID: '', projectName: '', approvedBy: 'Manager', paidBy: 'Accountant', notes: 'Temple kitchen' },
  { expenseID: 'EXP-2026-0006', date: '2026-05-20', category: 'Electricity', description: 'Site electricity bill', amount: 5500, paymentMethod: 'UPI', vendorID: 'VEN-0005', vendorName: 'BESCOM', billNumber: 'EL-9901', transactionReference: 'UPI-908172', projectID: 'PRJ-0001', projectName: 'Main Temple Building', approvedBy: 'Admin', paidBy: 'Accountant', notes: '' },
  { expenseID: 'EXP-2026-0007', date: '2026-06-18', category: 'Plumbing', description: 'Water lines for guest rooms', amount: 35000, paymentMethod: 'Bank Transfer', vendorID: 'VEN-0003', vendorName: 'Bright Electricals', billNumber: 'BL-4410', transactionReference: 'NEFT-66554', projectID: 'PRJ-0004', projectName: 'Guest Rooms', approvedBy: 'Admin', paidBy: 'Admin', notes: '' },
  { expenseID: 'EXP-2026-0008', date: '2026-07-25', category: 'Salaries', description: 'Monthly salaries for staff', amount: 52000, paymentMethod: 'Bank Transfer', vendorID: '', vendorName: '', billNumber: '', transactionReference: 'NEFT-23456', projectID: '', projectName: '', approvedBy: 'Admin', paidBy: 'Admin', notes: '4 employees' },
  { expenseID: 'EXP-2026-0009', date: '2026-08-08', category: 'Transportation', description: 'Sand and gravel transport', amount: 12000, paymentMethod: 'Cash', vendorID: 'VEN-0004', vendorName: 'Sharma Contractors', billNumber: '', transactionReference: '', projectID: 'PRJ-0002', projectName: 'Prayer Hall', approvedBy: 'Manager', paidBy: 'Accountant', notes: '' },
]

const basePeople: Person[] = [
  { personID: 'PER-0001', name: 'Radha Krishna Das', phone: '9845012345', email: 'rkdas@example.com', address: '12 Main Road', city: 'Bengaluru', personType: ['Donor', 'Devotee'], joinDate: '2025-11-01', status: 'active', notes: 'Major donor, temple committee member' },
  { personID: 'PER-0002', name: 'Madhumati Devi Dasi', phone: '9987654321', email: 'madhumati@example.com', address: '45 Lake View', city: 'Mysuru', personType: ['Donor', 'Devotee'], joinDate: '2025-11-15', status: 'active', notes: '' },
  { personID: 'PER-0003', name: 'Gopal Charan Das', phone: '9012345678', email: 'gopal@example.com', address: '3 Temple Street', city: 'Hubli', personType: ['Donor', 'Committee Member'], joinDate: '2025-12-03', status: 'active', notes: '' },
  { personID: 'PER-0004', name: 'Shyamasundar Devotee', phone: '9345678901', email: 'shyama@example.com', address: '7 Green Park', city: 'Bengaluru', personType: ['Donor', 'Volunteer'], joinDate: '2025-12-10', status: 'active', notes: '' },
  { personID: 'PER-0005', name: 'Narayanan Murthy', phone: '9441122334', email: 'narayanan@example.com', address: '22 Residency Road', city: 'Bengaluru', personType: ['Donor'], joinDate: '2026-01-20', status: 'active', notes: 'Cow protection enthusiast' },
  { personID: 'PER-0006', name: 'Amit Patel', phone: '9765432109', email: 'amit@example.com', address: '88 Diamond Colony', city: 'Ahmedabad', personType: ['Donor'], joinDate: '2026-02-05', status: 'active', notes: '' },
  { personID: 'PER-0007', name: 'Lakshmi Narasimha', phone: '9638527410', email: 'ln@example.com', address: '4 Lake Road', city: 'Chennai', personType: ['Donor', 'Volunteer'], joinDate: '2026-03-18', status: 'active', notes: '' },
  { personID: 'PER-0008', name: 'Sita Devi', phone: '9876543210', email: 'sita@example.com', address: '15 Lotus Lane', city: 'Bengaluru', personType: ['Donor'], joinDate: '2026-04-22', status: 'active', notes: '' },
  { personID: 'PER-0009', name: 'Ramesh Kumar', phone: '9123456780', email: 'ramesh@example.com', address: 'Site Colony', city: 'Hubli', personType: ['Employee'], joinDate: '2025-12-01', status: 'active', notes: 'Site manager' },
  { personID: 'PER-0010', name: 'Suresh Patil', phone: '9456781230', email: 'suresh@example.com', address: 'Village Road', city: 'Hubli', personType: ['Construction Worker', 'Contractor'], joinDate: '2026-01-02', status: 'active', notes: 'Head mason' },
]

const baseVendors: Vendor[] = [
  { vendorID: 'VEN-0001', companyName: 'Ultra Cement Traders', contactPerson: 'Raj Sharma', phone: '9800011122', email: 'ultra@example.com', address: 'Industrial Area, Hubli', serviceType: 'Cement & Building Material', gstNumber: 'GST-29ABCDE1234F1Z5', bankDetails: 'HDFC ****0123', notes: 'Primary cement supplier' },
  { vendorID: 'VEN-0002', companyName: 'Jindal Steel Co.', contactPerson: 'Mohan Jindal', phone: '9888899999', email: 'jindal@example.com', address: 'Steel Market, Dharwad', serviceType: 'Steel & Structural Material', gstNumber: 'GST-29JKLMN5678P1Q5', bankDetails: 'SBI ****7788', notes: '' },
  { vendorID: 'VEN-0003', companyName: 'Bright Electricals', contactPerson: 'Vijay Kumar', phone: '9700011122', email: 'bright@example.com', address: 'Market Road, Hubli', serviceType: 'Electrical & Plumbing', gstNumber: '', bankDetails: '', notes: '' },
  { vendorID: 'VEN-0004', companyName: 'Sharma Contractors', contactPerson: 'Mahesh Sharma', phone: '9900022233', email: 'sharmac@example.com', address: 'Construction Lane, Hubli', serviceType: 'Construction Labour & Contracting', gstNumber: '', bankDetails: '', notes: 'Labour contractors' },
  { vendorID: 'VEN-0005', companyName: 'BESCOM', contactPerson: '', phone: '1912', email: 'bescom@example.com', address: 'Power Station Road', serviceType: 'Electricity Supply', gstNumber: '', bankDetails: '', notes: 'Electricity provider' },
  { vendorID: 'VEN-0006', companyName: 'Annapurna Grocers', contactPerson: 'Ravi Kumar', phone: '9600033344', email: 'annapurna@example.com', address: 'Vegetable Market, Hubli', serviceType: 'Groceries & Provisions', gstNumber: '', bankDetails: '', notes: 'Temple kitchen supplies' },
]

const baseProjects: Project[] = [
  { projectID: 'PRJ-0001', projectName: 'Main Temple Building', description: 'The main sanctum and temple structure', startDate: '2025-12-01', estimatedBudget: 5000000, actualExpense: 2250000, status: 'in-progress', contractor: 'Sharma Contractors' },
  { projectID: 'PRJ-0002', projectName: 'Prayer Hall', description: 'Community prayer and lecture hall', startDate: '2026-01-15', estimatedBudget: 1500000, actualExpense: 600000, status: 'in-progress', contractor: 'Sharma Contractors' },
  { projectID: 'PRJ-0003', projectName: 'Kitchen', description: 'Community kitchen for prasadam', startDate: '2026-02-01', estimatedBudget: 800000, actualExpense: 150000, status: 'not-started', contractor: '' },
  { projectID: 'PRJ-0004', projectName: 'Guest Rooms', description: 'Accommodation for visiting devotees', startDate: '2026-04-01', estimatedBudget: 1200000, actualExpense: 350000, status: 'in-progress', contractor: 'Bright Electricals' },
  { projectID: 'PRJ-0005', projectName: 'Electrical Work', description: 'Full electrical installation across campus', startDate: '2026-03-01', estimatedBudget: 300000, actualExpense: 60000, status: 'in-progress', contractor: 'Bright Electricals' },
  { projectID: 'PRJ-0006', projectName: 'Plumbing', description: 'Water supply and drainage', startDate: '2026-05-15', estimatedBudget: 250000, actualExpense: 35000, status: 'in-progress', contractor: 'Bright Electricals' },
]

const basePendingPayments: PendingPayment[] = [
  { paymentID: 'PAY-0001', date: '2026-07-01', personOrVendor: 'Ultra Cement Traders', amountDue: 50000, amountPaid: 20000, remainingAmount: 30000, dueDate: '2026-08-30', project: 'Main Temple Building', status: 'partially-paid', notes: 'Cement balance' },
  { paymentID: 'PAY-0002', date: '2026-07-15', personOrVendor: 'Sharma Contractors', amountDue: 80000, amountPaid: 0, remainingAmount: 80000, dueDate: '2026-08-20', project: 'Prayer Hall', status: 'pending', notes: 'Labour charges' },
  { paymentID: 'PAY-0003', date: '2026-06-25', personOrVendor: 'Bright Electricals', amountDue: 45000, amountPaid: 45000, remainingAmount: 0, dueDate: '2026-07-25', project: 'Electrical Work', status: 'paid', notes: '' },
  { paymentID: 'PAY-0004', date: '2026-05-10', personOrVendor: 'Jindal Steel Co.', amountDue: 120000, amountPaid: 80000, remainingAmount: 40000, dueDate: '2026-06-10', project: 'Prayer Hall', status: 'overdue', notes: 'Overdue, follow up' },
  { paymentID: 'PAY-0005', date: '2026-08-01', personOrVendor: 'Annapurna Grocers', amountDue: 18000, amountPaid: 18000, remainingAmount: 0, dueDate: '2026-08-15', project: '', status: 'paid', notes: '' },
]

const baseAccounts: Account[] = [
  { accountID: 'ACC-0001', accountName: 'Temple Cash', openingBalance: 50000, currentBalance: 75000, notes: 'Petty cash on site', type: 'cash' },
  { accountID: 'ACC-0002', accountName: 'Main Bank Account', openingBalance: 250000, currentBalance: 850000, notes: 'Primary bank account', type: 'bank' },
  { accountID: 'ACC-0003', accountName: 'Construction Account', openingBalance: 0, currentBalance: 320000, notes: 'Tracks all construction funds', type: 'construction' },
  { accountID: 'ACC-0004', accountName: 'Donation Account', openingBalance: 0, currentBalance: 450000, notes: 'Tracks all donations', type: 'donation' },
]

const baseTransactions: Transaction[] = [
  { transactionID: 'TXN-2026-0001', date: '2026-01-05', type: 'income', incomeOrExpense: 'income', amount: 50000, account: 'Donation Account', referenceID: 'DON-2026-0001', description: 'Donation - Radha Krishna Das', createdBy: 'Admin' },
  { transactionID: 'TXN-2026-0002', date: '2026-01-10', type: 'expense', incomeOrExpense: 'expense', amount: 85000, account: 'Construction Account', referenceID: 'EXP-2026-0001', description: 'Cement purchase', createdBy: 'Admin' },
  { transactionID: 'TXN-2026-0003', date: '2026-02-15', type: 'expense', incomeOrExpense: 'expense', amount: 120000, account: 'Construction Account', referenceID: 'EXP-2026-0003', description: 'Structural steel', createdBy: 'Admin' },
  { transactionID: 'TXN-2026-0004', date: '2026-03-05', type: 'expense', incomeOrExpense: 'expense', amount: 60000, account: 'Construction Account', referenceID: 'EXP-2026-0004', description: 'Electrical wiring', createdBy: 'Admin' },
  { transactionID: 'TXN-2026-0005', date: '2026-03-09', type: 'income', incomeOrExpense: 'income', amount: 200000, account: 'Donation Account', referenceID: 'DON-2026-0005', description: 'Donation - Narayanan Murthy', createdBy: 'Admin' },
]

const baseSettings: Settings = {
  templeName: 'ISKCON New Temple',
  templeAddress: 'Temple Road, Hubli, Karnataka 580020',
  templePhone: '0836-2200123',
  templeEmail: 'info@iskcontemple.org',
  receiptPrefix: 'REC',
  currentSequence: 11,
  defaultBankAccount: 'Main Bank Account',
  currency: 'INR',
}

const baseUsers: User[] = [
  { userID: 'USR-0001', name: 'Temple Administrator', email: 'admin@temple.org', role: 'admin', status: 'active', createdDate: '2025-11-01', password: 'admin123' },
  { userID: 'USR-0002', name: 'Chief Accountant', email: 'accountant@temple.org', role: 'accountant', status: 'active', createdDate: '2025-11-01', password: 'accountant123' },
  { userID: 'USR-0003', name: 'Projects Manager', email: 'manager@temple.org', role: 'manager', status: 'active', createdDate: '2025-11-01', password: 'manager123' },
  { userID: 'USR-0004', name: 'Committee Viewer', email: 'viewer@temple.org', role: 'viewer', status: 'active', createdDate: '2025-11-01', password: 'viewer123' },
]

const baseAnnouncements: Announcement[] = [
  { announcementID: 'ANN-0001', title: 'Ratha Yatra 2026 date announced', body: 'This year\u2019s Ratha Yatra will be held on 12 September 2026. Volunteers are requested to assemble from 7:00 AM at the temple. Please contact the Manager for seva assignments.', postedBy: 'Temple Administrator', postedAt: '2026-08-25T09:00:00Z', pinned: true, expiresAt: '2026-09-13', status: 'active' },
  { announcementID: 'ANN-0002', title: 'Monthly committee meeting this Sunday', body: 'The monthly management committee meeting is scheduled for Sunday at 6:00 PM in the office. All heads of departments please attend.', postedBy: 'Projects Manager', postedAt: '2026-08-28T14:30:00Z', pinned: false, expiresAt: '2026-08-31', status: 'active' },
  { announcementID: 'ANN-0003', title: 'New kitchen equipment arrived', body: 'The new cooking vessels sponsored by Mr. Narayanan Murthy have arrived. They will be installed in the kitchen next week.', postedBy: 'Chief Accountant', postedAt: '2026-08-20T11:00:00Z', pinned: false, expiresAt: '2026-09-01', status: 'active' },
]

const baseMessages: Message[] = [
  { messageID: 'MSG-0001', senderEmail: 'manager@temple.org', senderName: 'Projects Manager', recipientEmail: 'admin@temple.org', subject: 'Cement order approval', body: 'Ultra Cement has submitted a revised quote for 300 bags. Requesting your approval for the purchase order.', sentAt: '2026-08-29T10:15:00Z', read: true, readAt: '2026-08-29T10:20:00Z' },
  { messageID: 'MSG-0002', senderEmail: 'accountant@temple.org', senderName: 'Chief Accountant', recipientEmail: 'admin@temple.org', subject: 'Cash position update', body: 'Cash balance is now zero as requested. We should credit the petty cash soon before the Ratha Yatra advance purchases.', sentAt: '2026-08-29T15:40:00Z', read: false, readAt: '' },
  { messageID: 'MSG-0003', senderEmail: 'admin@temple.org', senderName: 'Temple Administrator', recipientEmail: 'accountant@temple.org', subject: 'Re: Cash position update', body: 'Approved. Please move 25,000 from the Main Bank Account to Temple Cash and log the transaction.', sentAt: '2026-08-29T16:05:00Z', read: false, readAt: '' },
]

const baseEvents: TempleEvent[] = [
  { eventID: 'EVT-0001', title: 'Ratha Yatra', date: '2026-09-12', time: '07:00', location: 'Temple compound to City Centre', description: 'Annual chariot festival with kirtan and prasadam distribution.', category: 'Festival', budget: 500000, organizer: 'Temple Administrator', status: 'upcoming' },
  { eventID: 'EVT-0002', title: 'Monthly Committee Meeting', date: '2026-08-30', time: '18:00', location: 'Temple office', description: 'Monthly management review.', category: 'Meeting', budget: 0, organizer: 'Projects Manager', status: 'upcoming' },
  { eventID: 'EVT-0003', title: 'Gita Study Circle', date: '2026-09-05', time: '17:30', location: 'Prayer Hall', description: 'Weekly Bhagavad-gita class.', category: 'Program', budget: 0, organizer: 'Committee Viewer', status: 'upcoming' },
  { eventID: 'EVT-0004', title: 'Kitchen Seva Day', date: '2026-09-06', time: '06:00', location: 'Kitchen', description: 'Group cooking seva for the Sunday feast.', category: 'Seva', budget: 5000, organizer: 'Chief Accountant', status: 'upcoming' },
  { eventID: 'EVT-0005', title: 'Janmashtami', date: '2026-09-04', time: '20:00', location: 'Main Hall', description: 'Birthday celebration of Lord Krishna with midnight abhishek.', category: 'Festival', budget: 120000, organizer: 'Temple Administrator', status: 'upcoming' },
]

const baseEventVolunteers: EventVolunteer[] = [
  { volunteerID: 'VOL-0001', eventID: 'EVT-0001', personID: 'PER-0004', name: 'Shyamasundar Devotee', role: 'Coordinator', registeredAt: '2026-08-20T09:00:00Z' },
  { volunteerID: 'VOL-0002', eventID: 'EVT-0001', personID: 'PER-0010', name: 'Suresh Patil', role: 'Lead', registeredAt: '2026-08-21T10:00:00Z' },
  { volunteerID: 'VOL-0003', eventID: 'EVT-0001', personID: 'PER-0007', name: 'Lakshmi Narasimha', role: 'Volunteer', registeredAt: '2026-08-22T11:00:00Z' },
  { volunteerID: 'VOL-0004', eventID: 'EVT-0004', personID: 'PER-0009', name: 'Ramesh Kumar', role: 'Lead', registeredAt: '2026-08-24T09:30:00Z' },
]

const baseRequests: PrayerRequest[] = [
  { requestID: 'REQ-0001', date: '2026-08-25', personID: 'PER-0005', personName: 'Narayanan Murthy', type: 'Seva Request', description: 'Requesting to sponsor daily cow feeding for one year.', assignedTo: 'Temple Administrator', status: 'open', notes: '' },
  { requestID: 'REQ-0002', date: '2026-08-27', personID: 'PER-0002', personName: 'Madhumati Devi Dasi', type: 'Prayer Request', description: 'Prayer for late husband\u2019s shraddha ceremony arrangements.', assignedTo: '', status: 'open', notes: '' },
  { requestID: 'REQ-0003', date: '2026-08-28', personID: 'PER-0008', personName: 'Sita Devi', type: 'Assistance', description: 'Needs help reaching temple for the Sunday feast.', assignedTo: 'Projects Manager', status: 'in-progress', notes: 'Arranged pickup with volunteer' },
]

export const mockData = {
  users: baseUsers,
  people: basePeople,
  donations: baseDonations,
  expenses: baseExpenses,
  vendors: baseVendors,
  projects: baseProjects,
  pendingPayments: basePendingPayments,
  accounts: baseAccounts,
  transactions: baseTransactions,
  settings: baseSettings,
  auditLog: [] as AuditLogEntry[],
  announcements: baseAnnouncements,
  messages: baseMessages,
  events: baseEvents,
  eventVolunteers: baseEventVolunteers,
  requests: baseRequests,
}

export function buildDashboardData(
  donations: Donation[],
  expenses: Expense[],
  accounts: Account[],
  pendingPayments: PendingPayment[],
  projects: Project[]
): DashboardData {
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  const constructionCategories = [
    'Cement', 'Steel', 'Sand', 'Bricks', 'Labour', 'Electrical Work',
    'Plumbing', 'Painting', 'Marble', 'Woodwork', 'Equipment', 'Transportation',
  ]
  const totalConstructionExpenses = expenses
    .filter((e) => constructionCategories.includes(e.category))
    .reduce((s, e) => s + e.amount, 0)

  const cashAccount = accounts.find((a) => a.type === 'cash')
  const bankAccount = accounts.find((a) => a.type === 'bank')

  const pendingTotal = pendingPayments
    .filter((p) => p.status !== 'paid')
    .reduce((s, p) => s + p.remainingAmount, 0)

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthDonations = donations
    .filter((d) => d.date.startsWith(thisMonth))
    .reduce((s, d) => s + d.amount, 0)
  const thisMonthExpenses = expenses
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0)

  const monthMap = new Map<string, { donations: number; expenses: number }>()
  donations.forEach((d) => {
    const m = d.date.slice(0, 7)
    const cur = monthMap.get(m) || { donations: 0, expenses: 0 }
    cur.donations += d.amount
    monthMap.set(m, cur)
  })
  expenses.forEach((e) => {
    const m = e.date.slice(0, 7)
    const cur = monthMap.get(m) || { donations: 0, expenses: 0 }
    cur.expenses += e.amount
    monthMap.set(m, cur)
  })
  const monthlyTrend = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month,
      donations: v.donations,
      expenses: v.expenses,
    }))

  const donCatMap = new Map<string, number>()
  donations.forEach((d) => donCatMap.set(d.category, (donCatMap.get(d.category) || 0) + d.amount))
  const donationsByCategory = [...donCatMap.entries()].map(([name, value]) => ({ name, value }))

  const expCatMap = new Map<string, number>()
  expenses.forEach((e) => expCatMap.set(e.category, (expCatMap.get(e.category) || 0) + e.amount))
  const expensesByCategory = [...expCatMap.entries()].map(([name, value]) => ({ name, value }))

  const constructionBudgets = projects.map((p) => ({
    name: p.projectName,
    budget: p.estimatedBudget,
    actual: p.actualExpense,
  }))

  return {
    totalDonations,
    totalExpenses,
    totalConstructionExpenses,
    cashBalance: cashAccount ? cashAccount.currentBalance : 0,
    bankBalance: bankAccount ? bankAccount.currentBalance : 0,
    pendingPayments: pendingTotal,
    thisMonthDonations,
    thisMonthExpenses,
    monthlyTrend,
    donationsByCategory,
    expensesByCategory,
    constructionBudgets,
  }
}
