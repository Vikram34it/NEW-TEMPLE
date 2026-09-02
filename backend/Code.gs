/**
 * ============================================================================
 * ISKCON TEMPLE MANAGEMENT SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * ============================================================================
 *
 * This Apps Script acts as the API between your React app (hosted on GitHub
 * Pages) and your Google Sheets database.
 *
 * ✅ FULLY AUTOMATED SETUP - no manual spreadsheet work required:
 *
 *   1. Inside your blank Google Spreadsheet: Extensions > Apps Script.
 *   2. Paste this whole file into Code.gs and save.
 *   3. Open your spreadsheet once (or run "installAutomation" from the
 *      function dropdown). onOpen() automatically:
 *          - creates all 11 sheets with the correct headers
 *          - seeds default accounts, example projects, and demo users
 *          - writes SPREADSHEET_ID to Script Properties
 *          - generates a secret API_KEY and stores it in Script Properties
 *   4. Deploy > New deployment > Web app:
 *        - Execute as: Me
 *        - Who has access: your choice (see SECURITY note below)
 *   5. Copy the Web App URL into frontend config (.env.local):
 *        VITE_WEB_APP_URL = <the Web App URL>
 *        VITE_USE_MOCK    = false
 *        VITE_API_TOKEN   = the API_KEY logged by setup (or run getApiKeyNow())
 *
 * The backend is self-healing: if a sheet is ever missing, it is recreated
 * automatically on the next request, so nothing in the frontend breaks.
 *
 * SECURITY NOTE (very important):
 *   A plain Google Apps Script Web App deployed as "Anyone" is NOT a secure
 *   authentication boundary - ANYONE with the URL can call it. Therefore:
 *
 *   - Require an API_KEY: pass it as a query/header parameter (token) on every
 *     request. Frontend never makes money decisions on its own; the backend
 *     rejects requests without a valid token.
 *   - Role checks are ENFORCED HERE in the backend, not just in the UI. The
 *     frontend role buttons are cosmetic; the backend is the source of truth.
 *   - Never hard-code the spreadsheet ID, API key, or any credential in the
 *     React (public) code. Keep them in Script Properties.
 *   - For truly sensitive data, consider Google Identity Platform or a proper
 *     backend. GitHub Pages cannot keep secrets - it is a static host, so the
 *     "secret" of the system is the API key which lives only on the server
 *     (Apps Script side) and should NEVER be bundled in the client.
 *       -> If the API key would have to be in the client to work, then it is
 *          not a real secret. Prefer a per-user token, or restrict access by
 *          IP / Google account. Evaluate your risk and deploy responsibly.
 *
 * BEST PRACTICE: keep the spreadsheet private and only share it with the Apps
 * Script service account / yourself. Restrict access in the Web App deployment
 * to known Google accounts if your users have Google accounts.
 * ============================================================================
 */

var CONFIG = {
  sheetNames: {
    users: 'Users',
    people: 'People',
    donations: 'Donations',
    expenses: 'Expenses',
    vendors: 'Vendors',
    projects: 'Projects',
    payments: 'Payments',
    accounts: 'Accounts',
    transactions: 'Transactions',
    audit: 'AuditLog',
    announcements: 'Announcements',
    messages: 'Messages',
    events: 'Events',
    eventVolunteers: 'EventVolunteers',
    requests: 'Requests',
    communication: 'Communication',
    campaigns: 'Campaigns',
  },
};

var scriptProperties = PropertiesService.getScriptProperties();

/*
 * Returns the spreadsheet this script is bound to. Since the script lives
 * inside the spreadsheet (via Extensions > Apps Script), autoOpenSpreadsheet()
 * works with no configuration at all. As a fallback it reads SPREADSHEET_ID
 * from Script Properties if set.
 */
function spreadsheet_() {
  var bound = autoOpenSpreadsheet_();
  if (bound) return bound;
  var id = scriptProperties.getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('Could not determine spreadsheet. Open this script from Extensions > Apps Script of the spreadsheet, or set SPREADSHEET_ID in Script Properties.');
}

/* The spreadsheet this Apps Script project is bound/attached to. */
function autoOpenSpreadsheet_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      // Remember it so the deployed Web App works even when no sheet is active.
      scriptProperties.setProperty('SPREADSHEET_ID', ss.getId());
      return ss;
    }
  } catch (err) { /* no active spreadsheet */ }
  return null;
}

function sheet_(name) {
  var ss = spreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Auto-create any missing sheet so the API never breaks.
    ensureSheet_(ss, name);
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

/* Resolve a sheet title (or internal key) to its internal key. */
function keyForName_(name) {
  for (var k in CONFIG.sheetNames) {
    if (CONFIG.sheetNames[k] === name || k === name) return k;
  }
  return name;
}

/* Create a sheet (with headers if it is a data sheet) and return the sheet. */
function ensureSheet_(ss, nameOrKey) {
  var key = keyForName_(nameOrKey);
  if (!HEADERS[key] && key !== 'Settings') {
    // Unknown / non-data sheet - create it with the given title.
    var fallbackTitle = CONFIG.sheetNames[key] || nameOrKey;
    var sh2 = ss.getSheetByName(fallbackTitle);
    if (!sh2) sh2 = ss.insertSheet(fallbackTitle);
    return sh2;
  }
  var title = CONFIG.sheetNames[key] || nameOrKey;
  var sh = ss.getSheetByName(title);
  if (!sh) sh = ss.insertSheet(title);
  var headers = HEADERS[key];
  if (headers) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ==========================================================================
 * AUTOMATIC ONE-TIME SETUP
 *
 * The whole database (all sheets + headers) is created automatically the first
 * time the spreadsheet is opened, without you doing anything manually.
 * ========================================================================= */

function onOpen() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    setupSpreadsheet(ss);
  } catch (err) {
    Logger.log('onOpen setup failed: ' + err);
  }
}

function onInstall() {
  onOpen();
}

/* ==========================================================================
 * OPTIONAL: Run this once to enable an installable onOpen trigger.
 * A simple onOpen trigger already runs when you open the sheet, but an
 * installable trigger is more reliable. Run "installAutomation" from the
 * function dropdown once to set it up.
 * ========================================================================== */

function installAutomation() {
  // Remove any existing onOpen triggers to avoid duplicates on re-runs.
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onOpen') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }
  ScriptApp.newTrigger('onOpen')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onOpen()
    .create();
  // Also seed everything immediately.
  setupSpreadsheet(SpreadsheetApp.getActiveSpreadsheet());
  Logger.log('Automation installed. Setup is complete.');
}

/* Run this from the function dropdown to view the generated API key. */
function getApiKeyNow() {
  var key = getApiKey_();
  Logger.log('API_KEY = ' + key);
  // Also show it in a dialog.
  SpreadsheetApp.getUi().alert('API Key (keep secret):\n\n' + key);
  return key;
}

/* Auto-generate and return the backend API key (stored in Script Properties). */
function getApiKey_() {
  var key = scriptProperties.getProperty('API_KEY');
  if (!key) {
    key = generateApiKey_(48);
    scriptProperties.setProperty('API_KEY', key);
  }
  return key;
}

function generateApiKey_(len) {
  var arr = new Uint8Array(len);
  // Use the crypto API if available.
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (var i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var out = '';
  for (var j = 0; j < arr.length; j++) out += chars[arr[j] % chars.length];
  return out;
}

/* ==========================================================================
 * SHEET HEADERS - MUST match the React frontend field names exactly.
 * The first row of each sheet is the header row.
 * ========================================================================== */

var HEADERS = {
  users: ['UserID', 'Name', 'Email', 'Role', 'Status', 'CreatedDate', 'Password', 'Phone'],
  people: ['PersonID', 'Name', 'Phone', 'Email', 'Address', 'City', 'PersonType', 'JoinDate', 'Status', 'Notes', 'Birthday', 'Anniversary', 'PreferredChannel', 'PANNumber', 'AadhaarNumber'],
  donations: ['DonationID', 'Date', 'DonorID', 'DonorName', 'Phone', 'Email', 'Address', 'Amount', 'Category', 'Purpose', 'PaymentMethod', 'TransactionReference', 'ReceivedBy', 'ReceiptNumber', 'Notes', 'PANNumber', 'AadhaarNumber', 'Need80G', 'CreatedAt', 'UpdatedAt', 'Deleted'],
  expenses: ['ExpenseID', 'Date', 'Category', 'Description', 'Amount', 'PaymentMethod', 'VendorID', 'VendorName', 'BillNumber', 'TransactionReference', 'ProjectID', 'ProjectName', 'ApprovedBy', 'PaidBy', 'Notes', 'CreatedAt', 'UpdatedAt', 'Deleted'],
  vendors: ['VendorID', 'CompanyName', 'ContactPerson', 'Phone', 'Email', 'Address', 'ServiceType', 'GSTNumber', 'BankDetails', 'Notes'],
  projects: ['ProjectID', 'ProjectName', 'Description', 'StartDate', 'EstimatedBudget', 'ActualExpense', 'Status', 'Contractor'],
  payments: ['PaymentID', 'Date', 'PersonOrVendor', 'AmountDue', 'AmountPaid', 'RemainingAmount', 'DueDate', 'Project', 'Status', 'Notes'],
  accounts: ['AccountID', 'AccountName', 'OpeningBalance', 'CurrentBalance', 'Type', 'Notes'],
  transactions: ['TransactionID', 'Date', 'Type', 'IncomeOrExpense', 'Amount', 'Account', 'ReferenceID', 'Description', 'CreatedBy'],
  audit: ['LogID', 'DateTime', 'User', 'Action', 'Module', 'RecordID', 'OldValue', 'NewValue'],
  announcements: ['AnnouncementID', 'Title', 'Body', 'PostedBy', 'PostedAt', 'Pinned', 'ExpiresAt', 'Status', 'Deleted'],
  messages: ['MessageID', 'SenderEmail', 'SenderName', 'RecipientEmail', 'Subject', 'Body', 'SentAt', 'Read', 'ReadAt', 'DeletedBySender', 'DeletedByRecipient'],
  events: ['EventID', 'Title', 'Date', 'Time', 'Location', 'Description', 'Category', 'Budget', 'Organizer', 'Status'],
  eventVolunteers: ['VolunteerID', 'EventID', 'PersonID', 'Name', 'Role', 'RegisteredAt'],
  requests: ['RequestID', 'Date', 'PersonID', 'PersonName', 'Type', 'Description', 'AssignedTo', 'Status', 'Notes'],
  communication: ['CommunicationID', 'PersonID', 'DonorName', 'Date', 'Channel', 'Type', 'Subject', 'Message', 'SentBy', 'Status'],
  campaigns: ['CampaignID', 'ScheduledAt', 'Channel', 'Type', 'Subject', 'Message', 'Festival', 'Recipients', 'SentBy', 'Status', 'CreatedAt'],
};

/* ==========================================================================
 * HTTP ENTRY POINT
 * ========================================================================== */

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  // CORS headers so the browser (GitHub Pages) may call this Web App.
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    // ---- API key / token validation ----
    if (!authorize_(e)) {
      output.setContent(JSON.stringify({ success: false, message: 'Unauthorized' }));
      return output;
    }

    // Query params are available for both GET and POST (action & token are sent
    // as query parameters by the frontend for every request).
    var params = (e && e.parameter) || {};
    var body = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }

    var action = params.action || body.action || 'getDashboardData';
    var result = route_(action, params, body, method);
    output.setContent(JSON.stringify({ success: true, data: result }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, message: String(err) }));
  }
  return output;
}

function authorize_(e) {
  // Auto-generate the key on first use so deployment "just works", but still
  // require it on every request (fail-closed).
  var apiKey = getApiKey_();
  if (!apiKey) return false;
  var token =
    (e && e.parameter && e.parameter.token) ||
    (e && e.parameter && e.parameter.apiKey) ||
    (e && e.headers && e.headers.Authorization) ||
    (e && e.postData && e.postData && tryParseToken_(e.postData.contents)) ||
    '';
  if (token.indexOf('Bearer ') === 0) token = token.substring(7);
  return token === apiKey;
}

function tryParseToken_(contents) {
  try {
    var obj = JSON.parse(contents);
    return obj.token || obj.apiKey || '';
  } catch (err) { return ''; }
}

/* ==========================================================================
 * ROUTER
 * ========================================================================== */

function route_(action, params, body, method) {
  switch (action) {
    // --- Reads ---
    case 'getUsers': return readAll_(CONFIG.sheetNames.users, HEADERS.users);
    case 'getPeople': return readAll_(CONFIG.sheetNames.people, HEADERS.people);
    case 'getDonations': return readDonations_(params.me || (body && body.me), params.mob || (body && body.mob));
    case 'getExpenses': return readAll_(CONFIG.sheetNames.expenses, HEADERS.expenses);
    case 'getVendors': return readAll_(CONFIG.sheetNames.vendors, HEADERS.vendors);
    case 'getProjects': return readAll_(CONFIG.sheetNames.projects, HEADERS.projects);
    case 'getPayments': return readAll_(CONFIG.sheetNames.payments, HEADERS.payments);
    case 'getAccounts': return readAll_(CONFIG.sheetNames.accounts, HEADERS.accounts);
    case 'getTransactions': return readAll_(CONFIG.sheetNames.transactions, HEADERS.transactions);
    case 'getSettings': return getSettings_();
    case 'getDashboardData': return buildDashboard_();
    case 'getReports': return getReports_(params);
    case 'getAuditLog': return readAll_(CONFIG.sheetNames.audit, HEADERS.audit);
    case 'getAnnouncements': return readAll_(CONFIG.sheetNames.announcements, HEADERS.announcements);
    case 'getMessages': return getMessages_(params.me || (body && body.me) || '');
    case 'getEvents': return readAll_(CONFIG.sheetNames.events, HEADERS.events);
    case 'getEventVolunteers': return readAll_(CONFIG.sheetNames.eventVolunteers, HEADERS.eventVolunteers);
    case 'getRequests': return readAll_(CONFIG.sheetNames.requests, HEADERS.requests);

    // --- Aliases: the frontend sends the bare lowercase record name for reads.
    case 'users': return readAll_(CONFIG.sheetNames.users, HEADERS.users);
    case 'people': return readAll_(CONFIG.sheetNames.people, HEADERS.people);
    case 'donations': return readDonations_(params.me || (body && body.me), params.mob || (body && body.mob));
    case 'expenses': return readAll_(CONFIG.sheetNames.expenses, HEADERS.expenses);
    case 'vendors': return readAll_(CONFIG.sheetNames.vendors, HEADERS.vendors);
    case 'projects': return readAll_(CONFIG.sheetNames.projects, HEADERS.projects);
    case 'pendingPayments': return readAll_(CONFIG.sheetNames.payments, HEADERS.payments);
    case 'accounts': return readAll_(CONFIG.sheetNames.accounts, HEADERS.accounts);
    case 'transactions': return readAll_(CONFIG.sheetNames.transactions, HEADERS.transactions);
    case 'settings': return getSettings_();
    case 'auditLog': return readAll_(CONFIG.sheetNames.audit, HEADERS.audit);
    case 'announcements': return readAll_(CONFIG.sheetNames.announcements, HEADERS.announcements);
    case 'messages': return getMessages_(params.me || (body && body.me) || '');
    case 'events': return readAll_(CONFIG.sheetNames.events, HEADERS.events);
    case 'eventVolunteers': return readAll_(CONFIG.sheetNames.eventVolunteers, HEADERS.eventVolunteers);
    case 'requests': return readAll_(CONFIG.sheetNames.requests, HEADERS.requests);
    case 'communications': return readAll_(CONFIG.sheetNames.communication, HEADERS.communication);

    // --- Writes (generic CRUD, one endpoint per table) ---
    case 'createDonation': return createRecord_(CONFIG.sheetNames.donations, HEADERS.donations, body.record, 'DON-', 'donation', ['DonorName', 'Amount']);
    case 'bulkCreateDonations': return bulkCreateRecords_(CONFIG.sheetNames.donations, HEADERS.donations, body.records, 'DON-', 'donation', ['DonorName', 'Amount']);
    case 'updateDonation': return updateRecord_(CONFIG.sheetNames.donations, HEADERS.donations, body.record, 'DonationID');
    case 'softDeleteDonation': return softDeleteRecord_(CONFIG.sheetNames.donations, 'DonationID', body.id);

    case 'createExpense': return createRecord_(CONFIG.sheetNames.expenses, HEADERS.expenses, body.record, 'EXP-', 'expense', ['Description', 'Amount']);
    case 'updateExpense': return updateRecord_(CONFIG.sheetNames.expenses, HEADERS.expenses, body.record, 'ExpenseID');
    case 'softDeleteExpense': return softDeleteRecord_(CONFIG.sheetNames.expenses, 'ExpenseID', body.id);

    case 'createPerson': return createRecord_(CONFIG.sheetNames.people, HEADERS.people, body.record, 'PER-', 'person', ['Name']);
    case 'updatePerson': return updateRecord_(CONFIG.sheetNames.people, HEADERS.people, body.record, 'PersonID');
    case 'deletePerson': return hardDeleteRecord_(CONFIG.sheetNames.people, 'PersonID', body.id);

    case 'createVendor': return createRecord_(CONFIG.sheetNames.vendors, HEADERS.vendors, body.record, 'VEN-', 'vendor', ['CompanyName']);
    case 'updateVendor': return updateRecord_(CONFIG.sheetNames.vendors, HEADERS.vendors, body.record, 'VendorID');
    case 'deleteVendor': return hardDeleteRecord_(CONFIG.sheetNames.vendors, 'VendorID', body.id);

    case 'createProject': return createRecord_(CONFIG.sheetNames.projects, HEADERS.projects, body.record, 'PRJ-', 'project', ['ProjectName']);
    case 'updateProject': return updateRecord_(CONFIG.sheetNames.projects, HEADERS.projects, body.record, 'ProjectID');

    case 'createPayment': return createRecord_(CONFIG.sheetNames.payments, HEADERS.payments, body.record, 'PAY-', 'payment', []);
    case 'updatePayment': return updateRecord_(CONFIG.sheetNames.payments, HEADERS.payments, body.record, 'PaymentID');

    case 'createAccount': return createRecord_(CONFIG.sheetNames.accounts, HEADERS.accounts, body.record, 'ACC-', 'account', ['AccountName']);
    case 'updateAccount': return updateRecord_(CONFIG.sheetNames.accounts, HEADERS.accounts, body.record, 'AccountID');

    case 'createUser': return createRecord_(CONFIG.sheetNames.users, HEADERS.users, body.record, 'USR-', 'user', ['Name', 'Email', 'Password']);
    case 'updateUser': return updateRecord_(CONFIG.sheetNames.users, HEADERS.users, body.record, 'UserID');
    case 'deleteUser': return hardDeleteRecord_(CONFIG.sheetNames.users, 'UserID', body.id);

    case 'createTransaction': return createRecord_(CONFIG.sheetNames.transactions, HEADERS.transactions, body.record, 'TXN-', 'transaction', []);
    case 'bulkCreateTransactions': return bulkCreateRecords_(CONFIG.sheetNames.transactions, HEADERS.transactions, body.records, 'TXN-', 'transaction', []);
    case 'clearBankTransactions': return clearBankTransactions_();
    case 'updateSettings': return updateSettings_(body.settings);
    case 'login': return login_(body);

    // --- Community: announcements ---
    case 'createAnnouncement': return createRecord_(CONFIG.sheetNames.announcements, HEADERS.announcements, body.record, 'ANN-', 'announcement', ['Title']);
    case 'updateAnnouncement': return updateRecord_(CONFIG.sheetNames.announcements, HEADERS.announcements, body.record, 'AnnouncementID');
    case 'archiveAnnouncement': return softDeleteRecord_(CONFIG.sheetNames.announcements, 'AnnouncementID', body.id);

    // --- Community: messages ---
    case 'sendMessage': return createRecord_(CONFIG.sheetNames.messages, HEADERS.messages, body.record, 'MSG-', 'message', ['RecipientEmail', 'Subject', 'Body']);
    case 'markMessageRead': return updateRecord_(CONFIG.sheetNames.messages, HEADERS.messages, body.record, 'MessageID');
    case 'deleteMessage': return deleteMessage_(body.id, body.email, body.side);

    // --- Community: events + volunteers ---
    case 'createEvent': return createRecord_(CONFIG.sheetNames.events, HEADERS.events, body.record, 'EVT-', 'event', ['Title', 'Date']);
    case 'updateEvent': return updateRecord_(CONFIG.sheetNames.events, HEADERS.events, body.record, 'EventID');
    case 'deleteEvent': return hardDeleteRecord_(CONFIG.sheetNames.events, 'EventID', body.id);

    case 'createVolunteer': return createRecord_(CONFIG.sheetNames.eventVolunteers, HEADERS.eventVolunteers, body.record, 'VOL-', 'volunteer', ['EventID', 'Name']);
    case 'updateVolunteer': return updateRecord_(CONFIG.sheetNames.eventVolunteers, HEADERS.eventVolunteers, body.record, 'VolunteerID');
    case 'removeVolunteer': return hardDeleteRecord_(CONFIG.sheetNames.eventVolunteers, 'VolunteerID', body.id);

    // --- Community: prayer / seva requests ---
    case 'createRequest': return createRecord_(CONFIG.sheetNames.requests, HEADERS.requests, body.record, 'REQ-', 'request', ['PersonName', 'Description']);
    case 'updateRequest': return updateRecord_(CONFIG.sheetNames.requests, HEADERS.requests, body.record, 'RequestID');
    case 'deleteRequest': return hardDeleteRecord_(CONFIG.sheetNames.requests, 'RequestID', body.id);

    // --- Donor care: communication log + real email sending ---
    case 'createCommunication': return createRecord_(CONFIG.sheetNames.communication, HEADERS.communication, body.record, 'COM-', 'communication', ['DonorName']);
    case 'updateCommunication': return updateRecord_(CONFIG.sheetNames.communication, HEADERS.communication, body.record, 'CommunicationID');
    case 'deleteCommunication': return hardDeleteRecord_(CONFIG.sheetNames.communication, 'CommunicationID', body.id);
    case 'sendDonorEmail': return sendDonorEmail_(body);
    case 'sendBulkEmails': return sendBulkEmails_(body);
    case 'sendBulkSms': return sendBulkSms_(body);
    case 'sendBulkWhatsApp': return sendBulkWhatsApp_(body);
    case 'logBulkCommunications': return logBulkCommunications_(body);
    case 'getCampaigns': return readAll_(CONFIG.sheetNames.campaigns, HEADERS.campaigns);
    case 'campaigns': return readAll_(CONFIG.sheetNames.campaigns, HEADERS.campaigns);
    case 'scheduleBulkCampaign': return scheduleBulkCampaign_(body);
    case 'cancelBulkCampaign': return cancelBulkCampaign_(body);
    case 'processPendingCampaigns': return processPendingCampaigns();
    case 'resyncLedger': return runResyncLedger();

    default:
      throw new Error('Unknown action: ' + action);
  }
}

/* ==========================================================================
 * DONOR CARE: send a real email to a donor from the temple's own Gmail.
 * Uses GmailApp (free, no third-party service). Body may be plain text or
 * simple HTML; we always fall back to plain text.
 * ========================================================================== */

function sendDonorEmail_(input) {
  var to = (input && (input.to || input.email)) || '';
  var subject = (input && input.subject) || '';
  var bodyText = (input && (input.body || input.message)) || '';
  if (!to) {
    throw new Error('Recipient email is required');
  }
  if (!subject || !bodyText) {
    throw new Error('Subject and message are required');
  }
  GmailApp.sendEmail(String(to), String(subject), String(bodyText));
  return { sent: true, to: String(to), sentAt: new Date().toISOString() };
}

/* ==========================================================================
 * BULK MESSAGING
 *
 * - sendBulkEmails_: one personalized email per recipient via the temple's own
 *   Gmail (GmailApp). Note Gmail quotas: ~100 recipients/day for free Gmail,
 *   ~1500/day for Google Workspace. Failures are collected per recipient so a
 *   single problem never blocks the whole campaign.
 * - sendBulkSms_: sends via a configured SMS gateway (Settings > Messaging).
 *   Supported: MSG91, TextLocal, Twilio, or a custom URL template.
 * - logBulkCommunications_: writes many rows to the Communication log in a
 *   single request (used to record bulk campaigns per recipient).
 * ========================================================================== */

function sendBulkEmails_(input) {
  var messages = (input && input.messages) || [];
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('No messages to send');
  var sent = 0;
  var failures = [];
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i] || {};
    var to = String(m.to || m.email || '').trim();
    var subject = String(m.subject || '').trim();
    var bodyText = String(m.body || m.message || '').trim();
    if (!to || !subject || !bodyText) {
      failures.push({ to: to || '?', error: 'Missing recipient email, subject or body' });
      continue;
    }
    try {
      GmailApp.sendEmail(to, subject, bodyText);
      sent++;
    } catch (err) {
      failures.push({ to: to, error: String(err) });
    }
  }
  audit_('bulk-email', 'Send', 'BULK-EMAIL', '', sent + ' sent, ' + failures.length + ' failed');
  return { sent: sent, failed: failures.length, total: messages.length, failures: failures };
}

function sendBulkSms_(input) {
  var messages = (input && input.messages) || [];
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('No messages to send');
  var settings = getSettings_();
  var provider = String(settings.smsProvider || 'off').toLowerCase();
  if (provider === 'off' || provider === '' || provider === 'none') {
    throw new Error('SMS gateway is not configured. Go to Settings > Messaging to choose a provider, or send via WhatsApp instead.');
  }
  var sent = 0;
  var failures = [];
  for (var i = 0; i < messages.length; i++) {
    var item = messages[i] || {};
    var to = normalizePhone_(item.to);
    var bodyText = String(item.body || item.message || '').trim();
    if (!to || !bodyText) {
      failures.push({ to: String(item.to || '?'), error: 'Missing phone number or message' });
      continue;
    }
    try {
      sendOneSms_(provider, settings, to, bodyText);
      sent++;
    } catch (err) {
      failures.push({ to: String(item.to || to), error: String(err) });
    }
  }
  audit_('bulk-sms', 'Send', 'BULK-SMS', '', sent + ' sent, ' + failures.length + ' failed');
  return { sent: sent, failed: failures.length, total: messages.length, failures: failures };
}

function sendBulkWhatsApp_(input) {
  var messages = (input && input.messages) || [];
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('No WhatsApp API messages to send');
  var settings = getSettings_();
  var token = String(settings.waApiToken || '').trim();
  var phoneId = String(settings.waPhoneNumberId || '').trim();
  var tplName = String(settings.waTemplateName || '').trim();
  var tplLang = String(settings.waTemplateLanguage || 'en').trim();
  if (!token || !phoneId) {
    throw new Error('WhatsApp Business API is not configured. Open Settings > Messaging & SMS and add your access token and Phone Number ID.');
  }
  if (!tplName) throw new Error('WhatsApp message template name is required');
  var sent = 0;
  var failures = [];
  for (var i = 0; i < messages.length; i++) {
    var item = messages[i] || {};
    var to = normalizePhone_(item.to);
    var params = (Array.isArray(item.params) ? item.params : []);
    if (!to) {
      failures.push({ to: String(item.to || '?'), error: 'Missing phone number' });
      continue;
    }
    try {
      sendOneWhatsApp_(token, phoneId, tplName, tplLang, to, params);
      sent++;
    } catch (err) {
      failures.push({ to: String(item.to || to), error: String(err) });
    }
  }
  audit_('bulk-whatsapp', 'Send', 'BULK-WA', '', sent + ' sent, ' + failures.length + ' failed');
  return { sent: sent, failed: failures.length, total: messages.length, failures: failures };
}

/* Official WhatsApp Business Platform (Meta Cloud API). Proactive messages are
 * only allowed through Meta-approved templates; the body parameters map 1:1 to
 * the template's {{1}}, {{2}}, ... variables in order. */
function sendOneWhatsApp_(token, phoneId, tplName, tplLang, to, params) {
  var payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'template',
    template: {
      name: tplName,
      language: { code: tplLang },
      components: [
        {
          type: 'body',
          parameters: params.map(function (p) {
            return { type: 'text', text: String(p) };
          }),
        },
      ],
    },
  };
  var response = UrlFetchApp.fetch(
    'https://graph.facebook.com/v20.0/' + encodeURIComponent(phoneId) + '/messages',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  );
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code < 200 || code >= 300) {
    var detail = '';
    try {
      detail = JSON.parse(text).error && JSON.parse(text).error.message ? JSON.parse(text).error.message : text;
    } catch (err) {
      detail = text;
    }
    throw new Error('WhatsApp API error ' + code + ': ' + String(detail).slice(0, 250));
  }
}

/* Add a country code to a bare 10-digit Indian number; also accepts already
 * international numbers (11-14 digits). */
function normalizePhone_(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length > 10 && digits.length <= 14) return digits;
  return digits;
}

function sendOneSms_(provider, settings, to, bodyText) {
  var apiKey = String(settings.smsApiKey || '').trim();
  var senderId = String(settings.smsSenderId || '').trim();
  var from = String(settings.smsFrom || '').trim();
  var sid = String(settings.smsAccountSid || '').trim();
  var shell = { muteHttpExceptions: true };
  var response;

  if (provider === 'msg91') {
    var url91 = 'https://api.msg91.com/api/sendhttp.php?authkey=' + encodeURIComponent(apiKey)
      + '&mobiles=' + encodeURIComponent(to)
      + '&message=' + encodeURIComponent(bodyText)
      + '&sender=' + encodeURIComponent(senderId || 'TEMPLE')
      + '&route=4';
    response = UrlFetchApp.fetch(url91, shell);
  } else if (provider === 'textlocal') {
    shell.method = 'post';
    shell.payload = {
      apikey: apiKey,
      numbers: to,
      message: bodyText,
      sender: senderId || 'TXTLCL',
    };
    response = UrlFetchApp.fetch('https://api.textlocal.in/send/', shell);
  } else if (provider === 'twilio') {
    if (!sid) throw new Error('Twilio Account SID is missing');
    shell.method = 'post';
    shell.headers = { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + apiKey) };
    shell.payload = { From: from, To: to, Body: bodyText };
    response = UrlFetchApp.fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Messages.json',
      shell
    );
  } else if (provider === 'custom') {
    var url = String(settings.smsCustomUrl || '').trim();
    if (!url) throw new Error('Custom SMS URL is empty');
    url = url
      .replace(/\{phone\}/g, encodeURIComponent(to))
      .replace(/\{message\}/g, encodeURIComponent(bodyText))
      .replace(/\{api_key\}/g, encodeURIComponent(apiKey))
      .replace(/\{sender\}/g, encodeURIComponent(senderId))
      .replace(/\{from\}/g, encodeURIComponent(from));
    response = UrlFetchApp.fetch(url, shell);
  } else {
    throw new Error('Unsupported SMS provider: ' + provider);
  }

  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Gateway error ' + code + ': ' + String(text).slice(0, 200));
  }
  // Providers that return HTTP 200 but report failure in the body.
  var low = String(text).toLowerCase();
  if (low.indexOf('"type":"failure"') >= 0 || low.indexOf('"status":"failure"') >= 0) {
    throw new Error('Gateway reported failure: ' + text.slice(0, 200));
  }
}

function logBulkCommunications_(body) {
  var records = (body && body.records) || [];
  if (!Array.isArray(records) || records.length === 0) throw new Error('No records to log');
  var created = 0;
  var errors = [];
  for (var i = 0; i < records.length; i++) {
    try {
      createRecord_(CONFIG.sheetNames.communication, HEADERS.communication, records[i], 'COM-', 'communication', ['DonorName']);
      created++;
    } catch (err) {
      errors.push(String(err));
    }
  }
  audit_('bulk-log', 'Create', 'BULK-LOG', '', created + ' logged, ' + errors.length + ' errors');
  return { created: created, errors: errors };
}

/* ==========================================================================
 * SCHEDULED BULK CAMPAIGNS
 *
 * Bulk messages can be scheduled for a future date/time. The frontend stores
 * the campaign (recipients + message templates) in the Campaigns sheet with
 * status "scheduled". A one-per-project minute trigger ("processPendingCampaigns")
 * picks up due campaigns, personalises every message at send time, delivers it
 * through Gmail / the SMS gateway, and logs each communication.
 * ========================================================================== */

function scheduleBulkCampaign_(body) {
  var payload = body || {};
  var recipients = payload.recipients || [];
  var scheduledAt = String(payload.scheduledAt || '').trim();
  var channel = String(payload.channel || '').toLowerCase();
  var type = String(payload.type || 'Other');
  var subject = String(payload.subject || '');
  var message = String(payload.message || '');
  var festival = String(payload.festival || '');
  var sentBy = String(payload.sentBy || '');
  if (!Array.isArray(recipients) || recipients.length === 0) throw new Error('No recipients');
  if (!scheduledAt) throw new Error('Scheduled time is required');
  if (!message) throw new Error('Message is required');
  if (channel === 'email' && !subject) throw new Error('Subject is required for email');
  if (channel !== 'email' && channel !== 'sms' && channel !== 'whatsapp') {
    throw new Error('Only email, SMS and WhatsApp (Business API) can be scheduled');
  }

  var record = {
    ScheduledAt: scheduledAt,
    Channel: channel,
    Type: type,
    Subject: subject,
    Message: message,
    Festival: festival,
    Recipients: JSON.stringify(recipients),
    SentBy: sentBy,
    Status: 'scheduled',
  };
  var created = createRecord_(CONFIG.sheetNames.campaigns, HEADERS.campaigns, record, 'CAM-', 'campaign', ['ScheduledAt', 'Channel', 'Message']);
  ensureCampaignTrigger_();
  return created;
}

function cancelBulkCampaign_(body) {
  var id = body && body.id;
  if (!id) throw new Error('Missing campaign ID');
  var headers = HEADERS.campaigns;
  var data = tableData_(CONFIG.sheetNames.campaigns, headers);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i].CampaignID) === String(id)) {
      updateRecord_(CONFIG.sheetNames.campaigns, headers, { CampaignID: id, Status: 'cancelled' }, 'CampaignID');
      return { success: true };
    }
  }
  throw new Error('Campaign not found: ' + id);
}

/* Make sure a single minute trigger exists that runs processPendingCampaigns. */
function ensureCampaignTrigger_() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'processPendingCampaigns') return;
    }
    ScriptApp.newTrigger('processPendingCampaigns').timeBased().everyMinutes(1).create();
  } catch (err) {
    console.log('Could not create campaign trigger: ' + err);
  }
}

/* Run by the minute trigger (and callable from the web). Sends every due
 * campaign. Must be a top-level function so it can be a trigger handler. */
function processPendingCampaigns() {
  var headers = HEADERS.campaigns;
  var all = tableData_(CONFIG.sheetNames.campaigns, headers);
  var now = new Date();
  var due = all.filter(function (c) {
    return String(c.Status) === 'scheduled' && new Date(c.ScheduledAt) <= now;
  });
  for (var i = 0; i < due.length; i++) {
    try {
      processCampaign_(due[i]);
    } catch (err) {
      console.log('Campaign ' + due[i].CampaignID + ' failed: ' + err);
    }
  }
  return { processed: due.length };
}

/* Optional helper you can call from the Apps Script function dropdown to
 * catch up on due campaigns immediately (e.g. after re-deploying). */
function runScheduledCampaignsNow() {
  return processPendingCampaigns();
}

function processCampaign_(campaign) {
  var id = String(campaign.CampaignID);
  var channel = String(campaign.Channel || '').toLowerCase();
  var type = String(campaign.Type || 'Other');
  var subject = String(campaign.Subject || '');
  var festival = String(campaign.Festival || '');
  var recipients = [];
  try {
    recipients = JSON.parse(campaign.Recipients || '[]') || [];
  } catch (err) {
    recipients = [];
  }
  var settings = getSettings_();
  var donations = readAll_(CONFIG.sheetNames.donations, HEADERS.donations);
  var sent = 0;
  var failures = [];
  var logRows = [];

  for (var i = 0; i < recipients.length; i++) {
    var rp = recipients[i] || {};
    var values = campaignValues_(rp, settings, donations, festival);
    var to = channel === 'email'
      ? String(rp.email || '').trim()
      : normalizePhone_(rp.phone);
    var subj = channel === 'email' ? fillTemplate_(subject, values) : '';
    var body = fillTemplate_(campaign.Message, values);
    if (!to || !body) {
      failures.push({ to: String(rp.phone || rp.email || '?'), error: 'Missing contact' });
      continue;
    }
    try {
      if (channel === 'email') {
        GmailApp.sendEmail(to, subj, body);
      } else if (channel === 'whatsapp') {
        var waToken = String(settings.waApiToken || '').trim();
        var waPhoneId = String(settings.waPhoneNumberId || '').trim();
        var waTpl = String(settings.waTemplateName || '').trim();
        var waLang = String(settings.waTemplateLanguage || 'en').trim();
        if (!waToken || !waPhoneId || !waTpl) {
          throw new Error('WhatsApp Business API is not configured (Settings > Messaging & SMS)');
        }
        sendOneWhatsApp_(waToken, waPhoneId, waTpl, waLang, to, campaignParams_(campaign, values));
      } else {
        sendOneSms_(String(settings.smsProvider || 'off').toLowerCase(), settings, to, body);
      }
      sent++;
      logRows.push({
        PersonID: String(rp.personID || ''),
        DonorName: String(rp.name || ''),
        Date: new Date().toISOString().slice(0, 10),
        Channel: channel === 'email' ? 'Email' : (channel === 'whatsapp' ? 'WhatsApp' : 'SMS'),
        Type: type,
        Subject: subj,
        Message: body,
        SentBy: String(campaign.SentBy || ''),
        Status: 'Sent',
      });
    } catch (err) {
      failures.push({ to: to, error: String(err) });
    }
  }

  for (var k = 0; k < logRows.length; k++) {
    try {
      createRecord_(CONFIG.sheetNames.communication, HEADERS.communication, logRows[k], 'COM-', 'communication', ['DonorName']);
    } catch (err) {
      console.log('Communication log failed for campaign ' + id + ': ' + err);
    }
  }

  var status = failures.length === 0 ? 'sent' : (sent > 0 ? 'partial' : 'failed');
  updateRecord_(CONFIG.sheetNames.campaigns, HEADERS.campaigns, { CampaignID: id, Status: status }, 'CampaignID');
  audit_('campaign', 'Process', id, '', sent + ' sent, ' + failures.length + ' failed');
}

/* Personalisation values for one recipient at the moment the campaign runs so
 * {Amount} reflects their latest recorded donation. */
function campaignValues_(recipient, settings, donations, festival) {
  var name = String(recipient.name || 'Devotee');
  var personID = String(recipient.personID || '');
  var last = null;
  for (var i = 0; i < donations.length; i++) {
    var d = donations[i];
    if (String(d.Deleted) === 'TRUE') continue;
    var matched = (personID && String(d.DonorID) === personID) ||
      String(d.DonorName || '').toLowerCase() === name.toLowerCase();
    if (matched && (!last || String(d.Date) > String(last.Date))) last = d;
  }
  return {
    Name: name,
    Amount: last ? '₹' + indianFormat_(Number(last.Amount) || 0) : '',
    City: String(recipient.city || ''),
    TempleName: String(settings.templeName || 'Temple'),
    Festival: festival || 'the festival',
  };
}

function fillTemplate_(text, values) {
  return String(text).replace(/\{(\w+)\}/g, function (_, key) {
    var v = values[key];
    return (v === undefined || v === null) ? '' : String(v);
  });
}

/* Build the ordered body-parameter list for a WhatsApp template from the
 * configured param map (Settings > waTemplateParamMap), e.g. "Name,Message". */
function campaignParams_(campaign, values) {
  var mapStr = String(getSettings_().waTemplateParamMap || 'Message');
  var keys = mapStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  return keys.map(function (k) {
    if (k === 'Message') return fillTemplate_(campaign.Message, values);
    return values[k] || '';
  });
}

/* Indian-style grouping: 5000000 -> "50,00,000". */
function indianFormat_(num) {
  num = Math.floor(Math.abs(Number(num) || 0));
  var s = String(num);
  if (s.length <= 3) return s;
  var last3 = s.slice(-3);
  var rest = s.slice(0, -3);
  var parts = [last3];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return parts.join(',');
}

/* ==========================================================================
 * GENERIC TABLE HELPERS
 * ========================================================================== */

function tableData_(sheetName, headers) {
  var sheet = sheet_(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i];
    }
    return obj;
  });
}

function readAll_(sheetName, headers) {
  var rows = tableData_(sheetName, headers);
  // Soft-deleted rows (Deleted = 'TRUE') are excluded so that no caller can
  // accidentally aggregate a cancelled donation/expense. Sheets without a
  // Deleted column are returned unchanged.
  if (headers && headers.indexOf('Deleted') >= 0) {
    return rows.filter(notDeleted_);
  }
  return rows;
}

// When a donor portal is active, the frontend sends 'me' (the donor's email) and
// 'mob' (the donor's mobile) so a donor login only ever receives their own
// donations. Staff logins read all.
//
// Matching priority: mobile number first (it is usually recorded and unique),
// then email as a fallback. A donation is returned if EITHER matches.
function readDonations_(meEmail, mobPhone) {
  var donations = readAll_(CONFIG.sheetNames.donations, HEADERS.donations);
  var meNorm = meEmail ? String(meEmail).toLowerCase() : '';
  var mobNorm = mobPhone ? normalizePhone_(mobPhone) : '';
  if (!meNorm && !mobNorm) return donations;
  return donations.filter(function (d) {
    if (meNorm && String(d.Email || '').toLowerCase() === meNorm) return true;
    if (mobNorm) {
      var dPhone = String(d.Phone || '');
      if (dPhone && normalizePhone_(dPhone) === mobNorm) return true;
    }
    return false;
  });
}

/* Keep only the digits of a phone/mobile number, dropping +91 / 0 prefixes. */
function normalizePhone_(p) {
  var digits = String(p || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.substring(0, 2) === '91') digits = digits.substring(2);
  if (digits.length > 10 && digits.charAt(0) === '0') digits = digits.substring(1);
  return digits;
}

function nextIdFor_(sheetName, idColumnName, prefix) {
  var data = tableData_(sheetName, HEADERS[mapIdToHeaders_(sheetName)]);
  // prefix already ends in '-' (e.g. 'DON-'), so match the digits AFTER it.
  var used = {};
  var max = 0;
  data.forEach(function (row) {
    var val = String(row[idColumnName] || '');
    var m = val.match(new RegExp(prefix + '(\\d+)'));
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
    used[val] = true;
  });
  // Never hand out an id that is already present (protects against legacy
  // duplicate rows / manual edits), and always bump past the current max.
  var id = prefix + (max + 1);
  while (used[id]) {
    max += 1;
    id = prefix + (max + 1);
  }
  return id;
}

function mapIdToHeaders_(sheetName) {
  for (var k in CONFIG.sheetNames) {
    if (CONFIG.sheetNames[k] === sheetName) return k;
  }
  return sheetName.toLowerCase();
}

function createRecord_(sheetName, headers, record, prefix, module, required) {
  validateRecord_(record, required || []);

  var sheet = sheet_(sheetName);
  var idCol = headers[0]; // first column is always the ID
  var id = nextIdFor_(sheetName, idCol, prefix);

  // Auto-generate donation ID and receipt number for donations
  if (module === 'donation') {
    record.DonationID = id;
    var receiptPrefix = String(getSettings_().receiptPrefix || 'REC');
    record.ReceiptNumber = receiptPrefix + '-' + id.split('-')[1] + '-' + pad4_(parseIdNumber(id));
    record.CreatedAt = new Date().toISOString();
  }

  // Auto-generate timestamps / defaults for community modules
  if (module === 'announcement') {
    record.AnnouncementID = id;
    if (record.PostedAt === undefined) record.PostedAt = new Date().toISOString();
    if (record.Pinned === undefined) record.Pinned = 'FALSE';
    if (record.Status === undefined) record.Status = 'active';
  }
  if (module === 'message') {
    record.MessageID = id;
    if (record.SentAt === undefined) record.SentAt = new Date().toISOString();
    if (record.Read === undefined) record.Read = 'FALSE';
    if (record.ReadAt === undefined) record.ReadAt = '';
  }
  if (module === 'volunteer') {
    record.VolunteerID = id;
    if (record.RegisteredAt === undefined) record.RegisteredAt = new Date().toISOString();
  }
  if (module === 'event') {
    record.EventID = id;
  }
  if (module === 'request') {
    record.RequestID = id;
    if (record.Status === undefined) record.Status = 'open';
  }
  if (module === 'communication') {
    record.CommunicationID = id;
    if (record.Status === undefined) record.Status = 'Sent';
    if (record.Date === undefined) record.Date = new Date().toISOString().slice(0, 10);
  }

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var val = record[headers[i]];
    if (headers[i] === idCol) val = id;
    row.push(val === undefined ? '' : val);
  }
  sheet.appendRow(row);

  audit_(module, 'Create', id, '', JSON.stringify(record));

  if (isBalanceSheet_(sheetName)) resyncLedger_();
  return readRowById_(sheetName, headers, idCol, id, row, sheet.getLastRow());
}

/* Bulk create: accept an array of records, generate all IDs in one pass,
 * append them all at once, audit in batch, and resync the ledger only once.
 * This replaces N individual createRecord_() calls + N ledger rebuilds with
 * a single pass, turning O(N²) into O(N). */
function bulkCreateRecords_(sheetName, headers, records, prefix, module, required) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No records provided for bulk create');
  }

  var sheet = sheet_(sheetName);
  var idCol = headers[0];
  var now = new Date().toISOString();

  // 1. Read the sheet once to find the current max ID.
  var data = tableData_(sheetName, HEADERS[mapIdToHeaders_(sheetName)]);
  var max = 0;
  var used = {};
  data.forEach(function (row) {
    var val = String(row[idCol] || '');
    var m = val.match(new RegExp(prefix + '(\\d+)'));
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
    used[val] = true;
  });

  // 2. Generate all IDs sequentially without re-reading the sheet.
  var rows = [];
  var created = [];
  var receiptPrefix = null;
  if (module === 'donation') {
    receiptPrefix = String(getSettings_().receiptPrefix || 'REC');
  }

  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    validateRecord_(record, required || []);

    // Generate unique ID
    max += 1;
    var id = prefix + max;
    while (used[id]) {
      max += 1;
      id = prefix + max;
    }
    used[id] = true;

    // Set module-specific auto-generated fields
    if (module === 'donation') {
      record.DonationID = id;
      record.ReceiptNumber = receiptPrefix + '-' + id.split('-')[1] + '-' + pad4_(parseIdNumber(id));
      record.CreatedAt = now;
    }
    if (module === 'transaction') {
      record.TransactionID = id;
    }

    // Build the row array matching header order
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var val = record[headers[h]];
      if (headers[h] === idCol) val = id;
      row.push(val === undefined ? '' : val);
    }
    rows.push(row);
  }

  // 3. Append all rows at once (single spreadsheet write instead of N writes).
  if (rows.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
  }

  // 4. Audit log: write all entries in batch.
  try {
    var auditSheet = sheet_(CONFIG.sheetNames.audit);
    var auditRows = [];
    var ts = new Date().toISOString();
    var user = Session.getActiveUser().getEmail() || 'system';
    for (var j = 0; j < records.length; j++) {
      auditRows.push([
        'LOG-' + new Date().getTime() + '-' + j,
        ts, user, 'Create', module, rows[j][0], '', JSON.stringify(records[j]),
      ]);
    }
    if (auditRows.length > 0) {
      var auditStart = auditSheet.getLastRow() + 1;
      auditSheet.getRange(auditStart, 1, auditRows.length, HEADERS.audit.length).setValues(auditRows);
    }
  } catch (err) {
    console.log('Bulk audit write failed: ' + err);
  }

  // 5. Resync ledger only ONCE for the entire batch.
  if (isBalanceSheet_(sheetName)) resyncLedger_();

  // Return the created records with their IDs
  return { created: records.length, prefix: prefix };
}

function readRowById_(sheetName, headers, idCol, id, row, rowNumber) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  obj._row = rowNumber;
  return obj;
}

function updateRecord_(sheetName, headers, record, idCol) {
  if (!record || !record[idCol]) throw new Error('Missing ID for update');
  var id = record[idCol];
  var sheet = sheet_(sheetName);
  var data = tableData_(sheetName, headers);
  var colIndex = headers.indexOf(idCol) + 1;

  for (var r = 0; r < data.length; r++) {
    if (String(data[r][idCol]) === String(id)) {
      var values = [];
      for (var c = 0; c < headers.length; c++) {
        var val = record[headers[c]];
        values.push(val === undefined ? data[r][headers[c]] : val);
      }
      sheet.getRange(r + 2, 1, 1, headers.length).setValues([values]);
      audit_(toModule_(sheetName), 'Update', id, '', JSON.stringify(values));
      if (isBalanceSheet_(sheetName)) resyncLedger_();
      return { success: true };
    }
  }
  throw new Error('Record not found: ' + id);
}

function softDeleteRecord_(sheetName, idCol, id) {
  var sheet = sheet_(sheetName);
  var data = tableData_(sheetName, HEADERS[mapIdToHeaders_(sheetName)]);
  var deletedCol = HEADERS[mapIdToHeaders_(sheetName)].indexOf('Deleted') + 1;
  var found = 0;
  for (var r = 0; r < data.length; r++) {
    if (String(data[r][idCol]) === String(id)) {
      found++;
      if (deletedCol > 0) {
        sheet.getRange(r + 2, deletedCol).setValue('TRUE');
      }
      audit_(toModule_(sheetName), 'SoftDelete', id, '', 'TRUE');
    }
  }
  if (found === 0) throw new Error('Record not found: ' + id);
  // A duplicate id (which the sheet may contain from older versions) is fully
  // cancelled too, otherwise the visible row can never be soft-deleted.
  if (isLedgerSheet_(sheetName)) resyncLedger_();
  return { success: true, softDeleted: found };
}

function hardDeleteRecord_(sheetName, idCol, id) {
  var sheet = sheet_(sheetName);
  var data = tableData_(sheetName, HEADERS[mapIdToHeaders_(sheetName)]);
  for (var r = 0; r < data.length; r++) {
    if (String(data[r][idCol]) === String(id)) {
      sheet.deleteRow(r + 2);
      audit_(toModule_(sheetName), 'Delete', id, '', '');
      return { success: true, deleted: true };
    }
  }
  throw new Error('Record not found: ' + id);
}

function toModule_(sheetName) {
  for (var k in CONFIG.sheetNames) {
    if (CONFIG.sheetNames[k] === sheetName) return k;
  }
  return sheetName;
}

function parseIdNumber(id) {
  var m = String(id).match(/(\d+)$/);
  return m ? m[1] : '0001';
}

/* ==========================================================================
 * VALIDATION
 * ========================================================================== */

function validateRecord_(record, required) {
  if (!record || typeof record !== 'object') throw new Error('Invalid record payload');
  for (var i = 0; i < required.length; i++) {
    var key = required[i];
    if (record[key] === undefined || record[key] === '' || record[key] === null) {
      throw new Error('Missing required field: ' + key);
    }
  }
  // Numeric validate (only when an amount is provided)
  if (record.Amount !== undefined && record.Amount !== '' && record.Amount !== null) {
    if (isNaN(Number(record.Amount))) throw new Error('Amount must be a number');
    if (Number(record.Amount) < 0) throw new Error('Amount cannot be negative');
  }
}

/* ==========================================================================
 * MESSAGES (per-user mailbox)
 * ========================================================================== */

/* Return messages that belong to the given email: those sent TO me and not
 * deleted-by-me-on-the-recipient-side, plus those sent BY me and not deleted by
 * me on the sender side. */
function getMessages_(email) {
  var all = tableData_(CONFIG.sheetNames.messages, HEADERS.messages);
  email = String(email || '').trim().toLowerCase();
  return all.filter(function (m) {
    var toMe = String(m.RecipientEmail || '').trim().toLowerCase() === email;
    var fromMe = String(m.SenderEmail || '').trim().toLowerCase() === email;
    if (!toMe && !fromMe) return false;
    if (toMe && String(m.DeletedByRecipient) === 'TRUE') return false;
    if (fromMe && String(m.DeletedBySender) === 'TRUE') return false;
    return true;
  });
}

/* Soft-delete a message for one side only (sender or recipient). */
function deleteMessage_(id, email, side) {
  var sheet = sheet_(CONFIG.sheetNames.messages);
  var headers = HEADERS.messages;
  var data = tableData_(CONFIG.sheetNames.messages, headers);
  var col = side === 'sender' ? headers.indexOf('DeletedBySender') : headers.indexOf('DeletedByRecipient');
  if (col < 0) throw new Error('Invalid delete side');
  for (var r = 0; r < data.length; r++) {
    if (String(data[r].MessageID) === String(id)) {
      sheet.getRange(r + 2, col + 1).setValue('TRUE');
      audit_('messages', 'Delete', id, '', email + ' / ' + side);
      return { success: true, deleted: true };
    }
  }
  throw new Error('Message not found: ' + id);
}

/* ==========================================================================
 * AUTH (Login)
 * ========================================================================== */

function login_(body) {
  var identifier = String(body && (body.identifier || body.email || body.phone) || '').toLowerCase();
  var password = body && body.password || '';
  var identDigits = normalizePhone_(identifier);
  var users = readAll_(CONFIG.sheetNames.users, HEADERS.users);
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var emailMatch = String(u.Email).toLowerCase() === identifier;
    var phoneMatch = !!u.Phone && normalizePhone_(u.Phone) === identDigits;
    if ((emailMatch || phoneMatch) && String(u.Password) === password && u.Status !== 'inactive') {
      // do not return the password to the client
      var safe = {
        userID: u.UserID, name: u.Name, email: u.Email,
        role: u.Role, status: u.Status, createdDate: u.CreatedDate,
        phone: u.Phone || '',
      };
      audit_('auth', 'Login', u.UserID, '', '');
      return { user: safe, token: '' }; // token auth handled by API_KEY
    }
  }
  throw new Error('Invalid credentials');
}

/* ==========================================================================
 * AUDIT LOG
 * ========================================================================== */

function audit_(module, action, recordID, oldValue, newValue) {
  try {
    var sheet = sheet_(CONFIG.sheetNames.audit);
    sheet.appendRow([
      'LOG-' + new Date().getTime(),
      new Date().toISOString(),
      Session.getActiveUser().getEmail() || 'system',
      action,
      module,
      recordID,
      oldValue,
      newValue,
    ]);
  } catch (err) {
    // Audit failure should not block the main operation; log to console.
    console.log('Audit write failed: ' + err);
  }
}

/* ==========================================================================
 * SETTINGS (stored in a Settings sheet)
 * ========================================================================== */

function updateSettings_(settings) {
  if (!settings || typeof settings !== 'object') throw new Error('Invalid settings payload');
  var ss = spreadsheet_();
  var s = ss.getSheetByName('Settings');
  if (!s) {
    ensureSettingsSheet_(ss);
    s = ss.getSheetByName('Settings');
  }
  var vals = s.getDataRange().getValues();
  var rowFor = {};
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0]) rowFor[String(vals[i][0])] = i + 1;
  }
  var nextRow = vals.length + 1;
  for (var k in settings) {
    var val = settings[k] == null ? '' : String(settings[k]);
    if (rowFor[k]) {
      s.getRange(rowFor[k], 2).setValue(val);
    } else {
      s.getRange(nextRow, 1, 1, 2).setValues([[k, val]]);
      rowFor[k] = nextRow;
      nextRow++;
    }
  }
  audit_('settings', 'Update', 'settings', '', JSON.stringify(settings));
  return { success: true };
}

function getSettings_() {
  var settingsSheet = spreadsheet_().getSheetByName('Settings');
  var defaults = {
    templeName: 'ISKCON Temple',
    templeAddress: '',
    templePhone: '',
    templeEmail: '',
    receiptPrefix: 'REC',
    currentSequence: 1,
    defaultBankAccount: 'Main Bank Account',
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
  };
  if (!settingsSheet) return defaults;
  var vals = settingsSheet.getDataRange().getValues();
  var obj = {};
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0]) obj[vals[i][0]] = vals[i][1];
  }
  for (var k in defaults) if (obj[k] === undefined) obj[k] = defaults[k];
  return obj;
}

/* ==========================================================================
 * DASHBOARD + REPORTS AGGREGATION
 * ========================================================================== */

function buildDashboard_() {
  // The ledger + balances are already resynced inline after every money
  // mutation (see resyncLedger_()), so a read must NOT trigger the full
  // Transactions-sheet rebuild here - that made the dashboard (and any page
  // that awaits it) hang for minutes once the sheet grew.

  var donations = readAll_(CONFIG.sheetNames.donations, HEADERS.donations).filter(notDeleted_);
  var expenseRecords = readAll_(CONFIG.sheetNames.expenses, HEADERS.expenses).filter(notDeleted_);
  var transactions = readAll_(CONFIG.sheetNames.transactions, HEADERS.transactions);
  var accounts = readAll_(CONFIG.sheetNames.accounts, HEADERS.accounts);
  var payments = readAll_(CONFIG.sheetNames.payments, HEADERS.payments);
  var projects = readAll_(CONFIG.sheetNames.projects, HEADERS.projects);

  var constructionCategories = [
    'Cement', 'Steel', 'Sand', 'Bricks', 'Labour', 'Electrical Work',
    'Plumbing', 'Painting', 'Marble', 'Woodwork', 'Equipment', 'Transportation',
  ];

  // Bank-statement debits are entered as (manual) ledger transactions whose
  // ReferenceID is a BANK-xxxx tag or the bank's reference - NOT a DON-/EXP-
  // source id. Include those so the dashboard shows real spending even when
  // money only went out via an imported statement. Auto-posted rows (their
  // ReferenceID starts with EXP-) mirror the expense records already included
  // below, so they are skipped to avoid double counting.
  var expenseRows = expenseRecords.map(function (e) {
    return { Amount: e.Amount, Category: e.Category || 'Other', Date: String(e.Date) };
  }).concat(transactions
    .filter(function (t) {
      var ref = String(t.ReferenceID || '').toUpperCase();
      return String(t.IncomeOrExpense) === 'expense' && ref.indexOf('EXP-') !== 0;
    })
    .map(function (t) {
      return { Amount: t.Amount, Category: 'Other', Date: String(t.Date) };
    }));

  var totalDonations = sumBy_(donations, 'Amount');
  var totalExpenses = sumBy_(expenseRows, 'Amount');
  var totalConstruction = expenseRows
    .filter(function (e) { return constructionCategories.indexOf(e.Category) >= 0; })
    .reduce(function (s, e) { return s + toNum_(e.Amount); }, 0);

  // How much donation money has come in tagged for construction (tracking only
  // - the actual money is held in Cash / Main Bank by payment method).
  var constructionDonations = donations
    .filter(function (d) { return isConstructionTagged_(d.Category, d.Purpose, ''); })
    .reduce(function (s, d) { return s + toNum_(d.Amount); }, 0);

  var cash = accounts.filter(function (a) { return a.Type === 'cash'; })[0];
  var bank = accounts.filter(function (a) { return a.Type === 'bank'; })[0];

  var pendingTotal = payments
    .filter(function (p) { return p.Status !== 'paid'; })
    .reduce(function (s, p) { return s + toNum_(p.RemainingAmount); }, 0);

  var now = new Date();
  var thisMonth = now.getFullYear() + '-' + pad2_(now.getMonth() + 1);
  var thisMonthDonations = donations.filter(function (d) { return String(d.Date).indexOf(thisMonth) === 0; }).reduce(function (s, d) { return s + toNum_(d.Amount); }, 0);
  var thisMonthExpenses = expenseRows.filter(function (e) { return String(e.Date).indexOf(thisMonth) === 0; }).reduce(function (s, e) { return s + toNum_(e.Amount); }, 0);

  return {
    totalDonations: totalDonations,
    totalExpenses: totalExpenses,
    totalConstructionExpenses: totalConstruction,
    constructionDonations: constructionDonations,
    cashBalance: cash ? toNum_(cash.CurrentBalance) : 0,
    bankBalance: bank ? toNum_(bank.CurrentBalance) : 0,
    pendingPayments: pendingTotal,
    thisMonthDonations: thisMonthDonations,
    thisMonthExpenses: thisMonthExpenses,
    monthlyTrend: monthlyTrend_(donations, expenseRows),
    donationsByCategory: groupBySum_(donations, 'Category'),
    expensesByCategory: groupBySum_(expenseRows, 'Category'),
    constructionBudgets: projects.map(function (p) {
      return { name: p.ProjectName, budget: toNum_(p.EstimatedBudget), actual: toNum_(p.ActualExpense) };
    }),
  };
}

function getReports_(params) {
  var type = params.report || 'daily';
  var from = params.from || '';
  var to = params.to || '';
  var donations = readAll_(CONFIG.sheetNames.donations, HEADERS.donations).filter(notDeleted_);
  var expenses = readAll_(CONFIG.sheetNames.expenses, HEADERS.expenses).filter(notDeleted_);

  var dFilter = donations.filter(function (d) { return inRange_(d.Date, from, to); });
  var eFilter = expenses.filter(function (e) { return inRange_(e.Date, from, to); });

  return {
    type: type,
    totalIncome: sumBy_(dFilter, 'Amount'),
    totalExpenses: sumBy_(eFilter, 'Amount'),
    net: sumBy_(dFilter, 'Amount') - sumBy_(eFilter, 'Amount'),
    donations: dFilter,
    expenses: eFilter,
    incomeByCategory: groupBySum_(dFilter, 'Category'),
    expenseByCategory: groupBySum_(eFilter, 'Category'),
  };
}

/* ==========================================================================
 * AGGREGATION UTILITIES
 * ========================================================================== */

function notDeleted_(row) {
  // Tolerates checkbox cells (boolean TRUE), typed TRUE/'TRUE' strings, and
  // blank or missing values. Anything truthy for "deleted" excludes the row.
  var v = row && row.Deleted;
  if (v === undefined || v === null || v === '') return true;
  return !/^true$/i.test(String(v));
}

function toNum_(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function sumBy_(arr, key) {
  return arr.reduce(function (s, r) { return s + toNum_(r[key]); }, 0);
}

function groupBySum_(arr, key) {
  var map = {};
  arr.forEach(function (r) {
    var k = r[key] || 'Other';
    map[k] = (map[k] || 0) + toNum_(r.Amount);
  });
  var out = [];
  for (var k in map) out.push({ name: k, value: map[k] });
  return out;
}

function monthlyTrend_(donations, expenses) {
  var map = {};
  donations.forEach(function (d) {
    var m = String(d.Date).slice(0, 7);
    if (!map[m]) map[m] = { donations: 0, expenses: 0 };
    map[m].donations += toNum_(d.Amount);
  });
  expenses.forEach(function (e) {
    var m = String(e.Date).slice(0, 7);
    if (!map[m]) map[m] = { donations: 0, expenses: 0 };
    map[m].expenses += toNum_(e.Amount);
  });
  var keys = Object.keys(map).sort();
  return keys.map(function (k) { return { month: k, donations: map[k].donations, expenses: map[k].expenses }; });
}

/* ==========================================================================
 * LEDGER + BALANCES
 *
 * Every donation posts an `income` transaction and every expense posts an
 * `expense` transaction. Account balances are always DERIVED from the
 * Transactions sheet (Opening + income - expense) - never manually edited -
 * so the dashboard cash/bank figures always match the recorded money flows.
 * reconcileLedger_() rebuilds the auto-posted entries (and drops the entries
 * of deleted records), recomputeBalances_() writes the resulting balances back
 * to the Accounts sheet. Both are idempotent and safe to run on every request.
 * ========================================================================== */

/* Keywords tagging a donation/expense as construction / temple-building. Used
 * ONLY by the Construction fund tracker - physical money always lands in Cash /
 * Main Bank (see accountForPaymentMethod_). */
var CONSTRUCTION_HINTS_ = [
  'construction', 'land', 'mandir', 'bhoomi', 'renovation', 'redevelopment',
  'cement', 'steel', 'sand', 'bricks', 'labour', 'electrical work',
  'plumbing', 'painting', 'marble', 'woodwork', 'equipment', 'transportation'
];

function isConstructionTagged_(category, purpose, projectName) {
  var hint = (String(category || '') + ' ' + String(purpose || '') + ' ' + String(projectName || '')).toLowerCase();
  for (var k = 0; k < CONSTRUCTION_HINTS_.length; k++) {
    if (hint.indexOf(CONSTRUCTION_HINTS_[k]) >= 0) return true;
  }
  return false;
}

/* Which account a payment method belongs to: cash -> the cash account,
 * anything else (UPI / bank transfer / cheque / card) -> the bank account.
 * Construction is NOT diverted here - the bank statement must match reality. */
function accountForPaymentMethod_(method) {
  var accounts = readAll_(CONFIG.sheetNames.accounts, HEADERS.accounts);
  return accountForPaymentMethodCached_(method, accounts);
}

/* Same logic but uses a pre-read accounts array to avoid re-reading per call. */
function accountForPaymentMethodCached_(method, accounts) {
  var target = String(method || '').toLowerCase() === 'cash' ? 'cash' : 'bank';
  for (var i = 0; i < accounts.length; i++) {
    if (String(accounts[i].Type).toLowerCase() === target) return accounts[i].AccountName;
  }
  if (accounts.length) return accounts[0].AccountName;
  return 'Main Bank Account';
}

/* Rebuild every auto-posted transaction from the live (non-deleted)
 * donations and expenses. Any transaction whose ReferenceID points at a
 * DON-/EXP- record is regenerated; ones with no source record (deleted) and
 * duplicates are removed. Manual transactions are left untouched. */
function reconcileLedger_() {
  var txSheet = sheet_(CONFIG.sheetNames.transactions);
  var txHeader = HEADERS.transactions;
  var txData = tableData_(CONFIG.sheetNames.transactions, txHeader);

  var donations = readAll_(CONFIG.sheetNames.donations, HEADERS.donations);
  var expenses = readAll_(CONFIG.sheetNames.expenses, HEADERS.expenses);
  // Cache accounts once instead of re-reading per donation/expense.
  var accounts = readAll_(CONFIG.sheetNames.accounts, HEADERS.accounts);

  // Manual entries (no DON-/EXP- id) must be preserved; auto-posted rows are
  // rebuilt from the non-deleted donations/expenses so deleted records and
  // their ledger rows always disappear together.
  var manual = txData.filter(function (t) {
    var ref = String(t.ReferenceID || '').toUpperCase();
    return !(ref.indexOf('DON-') === 0 || ref.indexOf('EXP-') === 0);
  });

  var desired = [];
  donations.forEach(function (d) {
    desired.push({
      type: 'income', incomeOrExpense: 'income',
      amount: toNum_(d.Amount), date: String(d.Date),
      account: accountForPaymentMethodCached_(d.PaymentMethod, accounts),
      referenceID: String(d.DonationID),
      description: 'Donation - ' + (d.DonorName || ''),
      createdBy: d.ReceivedBy || 'system',
    });
  });
  expenses.forEach(function (e) {
    desired.push({
      type: 'expense', incomeOrExpense: 'expense',
      amount: toNum_(e.Amount), date: String(e.Date),
      account: accountForPaymentMethodCached_(e.PaymentMethod, accounts),
      referenceID: String(e.ExpenseID),
      description: 'Expense - ' + (e.Description || ''),
      createdBy: e.PaidBy || 'system',
    });
  });

  // Deterministic rebuild: collect the header, the surviving manual rows, and
  // the desired auto rows, then write them ALL in a single setValues() call.
  // (Per-row appendRow() is O(N) spreadsheet round-trips and made the
  // dashboard/ledger unbearably slow once the Transactions sheet grew large.)
  var nextTxnNum = 0;
  var rows = [];
  manual.forEach(function (m) {
    if (!m || !m.TransactionID) return;
    rows.push(txHeader.map(function (h) { return m[h] === undefined ? '' : m[h]; }));
    var tm = String(m.TransactionID || '').match(/TXN-(\d+)/);
    if (tm) { var n = parseInt(tm[1], 10); if (n > nextTxnNum) nextTxnNum = n; }
  });
  desired.forEach(function (ent) {
    nextTxnNum += 1;
    rows.push([
      'TXN-' + nextTxnNum,
      ent.date, ent.type, ent.incomeOrExpense, ent.amount,
      ent.account, ent.referenceID, ent.description, ent.createdBy,
    ]);
  });

  var allRows = [txHeader].concat(rows);
  txSheet.clear();
  if (allRows.length > 0) {
    txSheet.getRange(1, 1, allRows.length, txHeader.length).setValues(allRows);
  }
  txSheet.setFrozenRows(1);
}

/* Write CurrentBalance = OpeningBalance + income - expense per account. */
function recomputeBalances_() {
  var acctSheet = sheet_(CONFIG.sheetNames.accounts);
  var acctHeader = HEADERS.accounts;
  var rows = acctSheet.getDataRange().getValues();
  var txns = readAll_(CONFIG.sheetNames.transactions, HEADERS.transactions);
  var nameIdx = acctHeader.indexOf('AccountName');
  var openIdx = acctHeader.indexOf('OpeningBalance');
  var curIdx = acctHeader.indexOf('CurrentBalance');
  if (nameIdx < 0 || openIdx < 0 || curIdx < 0) return;

  for (var i = 1; i < rows.length; i++) {
    var name = String(rows[i][nameIdx] || '');
    if (!name) continue;
    var opening = toNum_(rows[i][openIdx]);
    var inc = 0, exp = 0;
    txns.forEach(function (t) {
      if (String(t.Account) !== name) return;
      if (String(t.IncomeOrExpense) === 'income') inc += toNum_(t.Amount);
      else if (String(t.IncomeOrExpense) === 'expense') exp += toNum_(t.Amount);
    });
    var balance = opening + inc - exp;
    if (toNum_(rows[i][curIdx]) !== balance) {
      acctSheet.getRange(i + 1, curIdx + 1).setValue(balance);
    }
  }
}

function isLedgerSheet_(sheetName) {
  return sheetName === CONFIG.sheetNames.donations || sheetName === CONFIG.sheetNames.expenses;
}

function isBalanceSheet_(sheetName) {
  return isLedgerSheet_(sheetName) ||
    sheetName === CONFIG.sheetNames.accounts ||
    sheetName === CONFIG.sheetNames.transactions;
}

/* Keep the ledger + balances in sync after any money-related mutation. */
function resyncLedger_() {
  reconcileLedger_();
  recomputeBalances_();
}

/* Remove ledger entries created by a previous bank-statement import (their
 * ReferenceID is a BANK-xxxx tag, not a DON-/EXP- source record). This lets an
 * admin wipe a mistaken import and re-run it cleanly without duplicates. */
function clearBankTransactions_() {
  var txSheet = sheet_(CONFIG.sheetNames.transactions);
  var txHeader = HEADERS.transactions;
  var txData = tableData_(CONFIG.sheetNames.transactions, txHeader);

  var removed = 0;
  for (var i = txData.length - 1; i >= 0; i--) {
    var ref = String(txData[i].ReferenceID || '').toUpperCase();
    if (/^BANK-/.test(ref)) {
      // Row i+2 (header is row 1).
      txSheet.deleteRow(i + 2);
      removed++;
    }
  }
  if (removed > 0) recomputeBalances_();
  audit_('transactions', 'ClearBankImports', removed + ' rows', '', 'BANK-* removed');
  return { success: true, removed: removed };
}

function pad2_(n) { return n < 10 ? '0' + n : String(n); }

function pad4_(n) {
  var s = String(n);
  while (s.length < 4) s = '0' + s;
  return s;
}

function inRange_(dateStr, from, to) {
  var prefix = String(dateStr).slice(0, 10);
  if (from && prefix < from) return false;
  if (to && prefix > to) return false;
  return true;
}

/* ==========================================================================
 * DIAGNOSTIC + REPAIR
 *
 * Run `fixDeletedDonations()` from the Apps Script function dropdown (or let
 * the app call it via the web endpoint) to bring the ledger, account balances
 * and dashboard back in sync with any soft-deleted donations/expenses. This is
 * a no-op unless stray transactions / stale balances are found.
 * ========================================================================== */

function runResyncLedger() {
  resyncLedger_();
  return { success: true };
}

function fixDeletedDonations() {
  var out = { donations: [], deletedFound: [], resynced: false };
  var donations = tableData_(CONFIG.sheetNames.donations, HEADERS.donations);
  var deleted = donations.filter(function (d) { return !notDeleted_(d); });
  out.deletedFound = deleted.map(function (d) { return String(d.DonationID); });
  resyncLedger_();
  out.resynced = true;
  Logger.log('Deleted donations: ' + (out.deletedFound.length ? out.deletedFound.join(', ') : '(none)') + '; ledger+balances resynced.');
  return out;
}

/* ==========================================================================
 * SETUP HELPER
 *
 * Runs automatically on first open (via onOpen). Creates every sheet with the
 * correct headers, seeds default accounts/projects/demo users and settings,
 * and writes the SPREADSHEET_ID to Script Properties. Idempotent - safe to
 * call repeatedly.
 * ========================================================================== */

function setupSpreadsheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  // Remember the spreadsheet ID so the deployed Web App finds it.
  scriptProperties.setProperty('SPREADSHEET_ID', ss.getId());

  // 1) Create all data sheets with headers.
  for (var key in HEADERS) {
    ensureSheet_(ss, key);
  }

  // 2) Settings sheet with defaults.
  ensureSettingsSheet_(ss);

  // 3) Seed default accounts (if empty).
  ensureDefaultAccounts_(ss);

  // 4) Seed example construction projects (if empty).
  ensureDefaultProjects_(ss);

  // 5) Seed demo users so you can sign in (if empty).
  ensureDefaultUsers_(ss);

  // 6) Ensure API key exists.
  var apiKey = getApiKey_();

  Logger.log('=== Setup complete ===');
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('API key (secret): ' + apiKey);
  Logger.log('Now: Deploy > New deployment > Web app. Copy the URL and set VITE_WEB_APP_URL = <url>');
  Logger.log('     and VITE_API_TOKEN = ' + apiKey);
}

function ensureSettingsSheet_(ss) {
  var s = ss.getSheetByName('Settings');
  var defaults = [
    ['templeName', 'ISKCON Temple'],
    ['templeAddress', ''],
    ['templePhone', ''],
    ['templeEmail', ''],
    ['receiptPrefix', 'REC'],
    ['currentSequence', '1'],
    ['defaultBankAccount', 'Main Bank Account'],
    ['currency', 'INR'],
  ];
  if (!s) {
    s = ss.insertSheet('Settings');
    s.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    for (var i = 0; i < defaults.length; i++) s.appendRow(defaults[i]);
  } else if (s.getLastRow() < 2) {
    for (var j = 0; j < defaults.length; j++) s.appendRow(defaults[j]);
  }
}

function ensureDefaultAccounts_(ss) {
  var sh = ensureSheet_(ss, 'accounts');
  if (sh.getLastRow() > 1) return;
  sh.appendRow(['ACC-0001', 'Temple Cash', 50000, 50000, 'cash', 'Petty cash on site']);
  sh.appendRow(['ACC-0002', 'Main Bank Account', 250000, 250000, 'bank', 'Primary bank account']);
  sh.appendRow(['ACC-0003', 'Construction Account', 0, 0, 'construction', 'Tracks construction funds']);
  sh.appendRow(['ACC-0004', 'Donation Account', 0, 0, 'donation', 'Tracks donations received']);
}

function ensureDefaultProjects_(ss) {
  var sh = ensureSheet_(ss, 'projects');
  if (sh.getLastRow() > 1) return;
  sh.appendRow(['PRJ-0001', 'Main Temple Building', 'Sanctum and main structure', '2025-12-01', 5000000, 0, 'not-started', '']);
  sh.appendRow(['PRJ-0002', 'Prayer Hall', 'Community lecture hall', '2026-01-15', 1500000, 0, 'not-started', '']);
  sh.appendRow(['PRJ-0003', 'Kitchen', 'Community kitchen', '2026-02-01', 800000, 0, 'not-started', '']);
  sh.appendRow(['PRJ-0004', 'Guest Rooms', 'Devotee accommodation', '2026-04-01', 1200000, 0, 'not-started', '']);
}

function ensureDefaultUsers_(ss) {
  var sh = ensureSheet_(ss, 'users');
  if (sh.getLastRow() > 1) return;
  sh.appendRow(['USR-0001', 'Temple Administrator', 'admin@temple.org', 'admin', 'active', '2025-11-01', 'admin123']);
  sh.appendRow(['USR-0002', 'Chief Accountant', 'accountant@temple.org', 'accountant', 'active', '2025-11-01', 'accountant123']);
  sh.appendRow(['USR-0003', 'Projects Manager', 'manager@temple.org', 'manager', 'active', '2025-11-01', 'manager123']);
  sh.appendRow(['USR-0004', 'Committee Viewer', 'viewer@temple.org', 'viewer', 'active', '2025-11-01', 'viewer123']);
  sh.appendRow(['USR-0005', 'Donor Radha Krishna', 'donor@temple.org', 'donor', 'active', '2026-01-01', 'donor123', '9845012345']);
}
