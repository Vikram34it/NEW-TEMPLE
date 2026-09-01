# Google Sheets Database Structure

This app uses a single Google Spreadsheet with 11 sheets. Create each sheet and
put these exact headers in row 1 (the API reads and writes by these column names).

## 1. Users
| UserID | Name | Email | Role | Status | CreatedDate | Password | Phone |
|--------|------|-------|------|--------|-------------|----------|-------|
| USR-1 | Temple Administrator | admin@temple.org | admin | active | 2025-11-01 | admin123 | |

Roles: `admin`, `accountant`, `manager`, `viewer`, `donor`. Status: `active` / `inactive`.

> A `donor` role signs in through the donor portal and can only view their own
> donations. Their donations are matched by **mobile number first** (the `Phone`
> column on the user record against the donation's `Phone`), then by **email**
> as a fallback. Set the donor's `Phone` when creating their account so mobile
> matching works.

> Note: In production you should change the demo passwords and ideally handle
> authentication differently (see SECURITY in Code.gs).

## 2. People
PersonID | Name | Phone | Email | Address | City | PersonType | JoinDate | Status | Notes | Birthday | Anniversary | PreferredChannel | PANNumber | AadhaarNumber

`PersonType` can hold multiple values separated by `,` (e.g. `Donor,Devotee`).

`Birthday` / `Anniversary` are dates (YYYY-MM-DD; year optional). `PreferredChannel` is one of `WhatsApp`, `Email`, `SMS`, `Call`, `In Person`, `None` (used by Donor Care for greeting lists). `PANNumber` / `AadhaarNumber` are stored for donors who need an 80G tax-exemption receipt.

## 3. Donations
DonationID | Date | DonorID | DonorName | Phone | Email | Address | Amount | Category | Purpose | PaymentMethod | TransactionReference | ReceivedBy | ReceiptNumber | Notes | PANNumber | AadhaarNumber | Need80G | CreatedAt | UpdatedAt | Deleted

- `DonationID` auto-generated: `DON-2026-0001`
- `ReceiptNumber` auto-generated: `REC-2026-0001`
- `Deleted` = `TRUE` marks the record soft-deleted (cancelled) instead of hard-removed.

## 4. Expenses
ExpenseID | Date | Category | Description | Amount | PaymentMethod | VendorID | VendorName | BillNumber | TransactionReference | ProjectID | ProjectName | ApprovedBy | PaidBy | Notes | CreatedAt | UpdatedAt | Deleted

## 5. Vendors
VendorID | CompanyName | ContactPerson | Phone | Email | Address | ServiceType | GSTNumber | BankDetails | Notes

## 6. Projects
ProjectID | ProjectName | Description | StartDate | EstimatedBudget | ActualExpense | Status | Contractor

Status: `not-started`, `in-progress`, `on-hold`, `completed`.

## 7. Payments
PaymentID | Date | PersonOrVendor | AmountDue | AmountPaid | RemainingAmount | DueDate | Project | Status | Notes

Status: `pending`, `partially-paid`, `paid`, `overdue`.

## 8. Accounts
AccountID | AccountName | OpeningBalance | CurrentBalance | Type | Notes

Account types: `cash`, `bank`, `construction`, `donation`.

## 9. Transactions
TransactionID | Date | Type | IncomeOrExpense | Amount | Account | ReferenceID | Description | CreatedBy

Every donation creates an `income` transaction; every expense creates an
`expense` transaction. Balances are derived from these (not manually edited).

## 10. AuditLog
LogID | DateTime | User | Action | Module | RecordID | OldValue | NewValue

## 11. Settings
Key | Value
----|------
templeName | ISKCON Temple
receiptPrefix | REC
currency | INR

SMS / WhatsApp gateway keys also live here (set via the app's Settings page):
`smsProvider`, `smsApiKey`, `smsAccountSid`, `smsSenderId`, `smsFrom`, `smsCustomUrl`,
`waApiToken`, `waPhoneNumberId`, `waTemplateName`, `waTemplateLanguage`, `waTemplateParamMap`.
The official WhatsApp integration posts approved template messages to the Meta Cloud API
(`graph.facebook.com/v20.0/{phoneNumberId}/messages`); `waTemplateParamMap` is a
comma-separated token order (e.g. `Name,Message`) mapping to the template's `{{1}}`, `{{2}}`…

## 12. Communication
CommunicationID | PersonID | DonorName | Date | Channel | Type | Subject | Message | SentBy | Status

Donor Care touchpoint log. `Channel`: WhatsApp, Email, SMS, Phone Call, In Person, Post, Other.
`Type`: Thank You, Receipt, Festival Greeting, Birthday Wish, Anniversary Wish, Invitation,
Update/News, Re-engagement, Follow-up, Other. `Status`: Sent / Done.

## 13. Campaigns
CampaignID | ScheduledAt | Channel | Type | Subject | Message | Festival | Recipients | SentBy | Status | CreatedAt

Scheduled bulk-messaging runs (emails / SMS). `ScheduledAt` is an ISO timestamp;
when it passes, a one-per-minute Apps Script trigger (`processPendingCampaigns`)
sends each recipient a personalised message, logs every send to Communication,
and updates `Status` (`scheduled` → `sent` / `partial` / `failed`, or `cancelled`).
`Recipients` is a JSON array of `{personID, name, email, phone, city}`.

---

## How to set it up — FULLY AUTOMATED (no manual sheet work)

1. Create a new, **blank** Google Spreadsheet.
2. Open **Extensions → Apps Script**.
3. Paste the contents of `backend/Code.gs` into `Code.gs` and save.
4. **Close and reopen the spreadsheet** (or run `installAutomation` / `setupSpreadsheet`
   from the Apps Script function dropdown). On open, the script automatically:
   - creates **all 11 sheets** with the correct headers (frozen row 1),
   - seeds **default accounts**, **example projects**, and **demo users**,
   - writes `SPREADSHEET_ID` to Script Properties,
   - generates a secret `API_KEY` and stores it in Script Properties.
5. Run `getApiKeyNow()` from the function dropdown to view the generated API key.
6. Deploy as a Web App (see README) and copy the Web App URL.

> The backend is self-healing: if any sheet is ever deleted or missing, it is
> recreated automatically on the next API request. No manual intervention needed.
