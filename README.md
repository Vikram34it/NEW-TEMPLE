# ISKCON Temple Finance & People Management System

A modern, mobile-friendly web application to manage all financial activities,
donors, devotees, vendors, construction projects, and people connected to a new
ISKCON temple. Built to handle temple money carefully using soft-deletes, an
audit log, role-based access, and automatic balance calculations.

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Database:** Google Sheets
- **Backend / API:** Google Apps Script Web App
- **Hosting:** GitHub Pages
- **Auth:** Simple per-user sessions and server-side role checks

## Project Structure

```
├── backend/
│   ├── Code.gs              # Google Apps Script backend (the API)
│   ├── appsscript.json      # Apps Script deployment manifest
│   └── SHEET_STRUCTURE.md   # Google Sheets schema
├── .github/workflows/deploy.yml  # GitHub Pages CI/CD
├── src/
│   ├── components/          # Reusable UI (sidebar, tables, modals, forms)
│   ├── pages/               # Dashboard, Donations, Expenses, People, etc.
│   ├── services/            # API layer (Apps Script bridge w/ mock fallback)
│   ├── context/             # Global app state (auth + data)
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Helpers, constants, formatting
│   ├── types/               # TypeScript interfaces
│   └── config/              # API configuration
├── src/data/mockData.ts     # Sample data for offline/demo mode
└── index.html
```

## Demo Mode (no backend required)

The app ships with bundled sample data so you can preview every screen right away:

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`

Use these demo logins:

| Role        | Email                 | Password        |
|-------------|-----------------------|-----------------|
| Admin       | `admin@temple.org`    | `admin123`      |
| Accountant  | `accountant@temple.org` | `accountant123` |
| Manager     | `manager@temple.org`  | `manager123`    |
| Viewer      | `viewer@temple.org`   | `viewer123`     |

## Connecting the Real Google Sheets Backend

1. Keep the Google spreadsheet private. Open **Extensions > Apps Script** and copy in `backend/Code.gs` and the manifest.
2. Run `setupSpreadsheet` from the Apps Script editor. This installs the table headers, including the new trailing import columns, and records the spreadsheet ID. Existing rows stay in place.
3. In the private Users sheet, make sure one active admin has a unique email and a strong temporary password. Fresh setups have no default accounts for signing in. The admin can create additional users under Settings after signing in.
4. Deploy a new Apps Script version as a web app and configure `VITE_WEB_APP_URL` and `VITE_USE_MOCK=false` for the frontend build. Deploy both sides together. Retire any old Apps Script deployments that still accept the former shared key and remove `VITE_API_TOKEN` from the build configuration.
5. Reset existing user passwords before restoring access if the old API was deployed. Rotate any exposed SMS and WhatsApp credentials. Sign in with each role on a test spreadsheet before switching over the live app.

## Resetting All Entered Transactions

To wipe everything you have entered (transactions, donations, expenses,
payments) and start the books fresh, you can use a built-in one-click reset:

### Option A — from the temple app (admin only)

1. Sign in as an **admin** and go to **Settings → Users → Danger Zone →
   Reset All Transactions**.
2. Open Apps Script once and run **`getResetKeyNow`** to view the *reset
   password* (generated on first use). Enter it in the dialog's **Reset password** field and click
   **Preview** to see exactly how many rows will be deleted, per sheet.
3. Type **RESET** to confirm, then click **Delete everything permanently**.

Both web actions require an active admin session and the reset password. The reset is written to the AuditLog
with your email as the actor.

### Option B — from the Apps Script editor

1. Open the spreadsheet → **Extensions → Apps Script**.
2. *(Optional, safest first step)* Pick **`resetAllTransactionsPreview`** from the
   function dropdown and hit **Run** — it logs how many rows would be deleted,
   per sheet, without deleting anything.
3. Pick **`resetAllTransactions`** from the function dropdown and hit **Run**.

This deletes all data rows (headers kept) in Donations, Expenses, Payments and
Transactions, resets the receipt counter so the next receipt is `REC-0001`,
recomputes every account balance back to its OpeningBalance, and writes an
AuditLog entry of the reset. A **confirmation dialog** shows the exact row
counts before anything is deleted — choosing **No** (or cancelling) aborts.
Users, people, vendors, projects and account definitions are untouched, and
IDs restart at 0001 automatically.

The web reset requires an active admin session, the separate reset password, and the typed confirmation. Google Sheets version history can be used to restore data.

## Deploying to GitHub Pages

Push the repository to GitHub, then create a `gh-pages` branch release, or use
the provided workflow in `.github/workflows/deploy.yml` (enabled via
**Settings → Pages → Source → GitHub Actions**). The workflow builds the app and
publishes the `dist/` folder on every push to `main`.

The app uses a `HashRouter`, so it works on GitHub Pages without any special
server rewrites.

## User Roles

| Role        | Can do                                                                                        |
|-------------|-----------------------------------------------------------------------------------------------|
| Admin       | Everything: users, donations, expenses, people, vendors, projects, reports, settings, export   |
| Accountant  | Add donations/expenses, manage transactions, generate receipts, view reports. Cannot delete financial records permanently or manage admins |
| Manager     | View dashboard & construction, manage workers/vendors, view reports                            |
| Viewer      | View permitted reports and information only                                                    |

## Important Accounting Rules (implemented)

1. **No permanent loss of financial records** — donations and expenses use
   **soft-delete** (flagged as cancelled) rather than hard removal.
2. **Audit log** — every create/update/delete/login is written to the AuditLog.
3. **Automatic balances** — account balances and dashboard figures are computed
   from donation/expense/transaction records, never hand-edited from the UI.
4. **Every donation → income transaction**, **every expense → expense transaction**.
5. **Unique IDs** — auto-generated (`DON-2026-0001`, `EXP-2026-0001`,
   `REC-2026-0001`, `PER-0001`, `VEN-0001`, `PRJ-0001`, `PAY-0001`,
   `TXN-2026-0001`). Generated server-side in the backend.

## Security and Bank Imports

- The API accepts POST requests and checks a per-user session and role on every protected action. Login is rate-limited. Sessions expire after up to six hours and can end early if Apps Script evicts a cached session.
- Live user lists omit password verifiers. Existing passwords are converted to salted, server-keyed verifiers on successful sign-in. Public demo passwords are rejected in live mode. Keep the script project private and preserve its `PASSWORD_KEY` when moving a deployment.
- The donor portal uses the email and phone on the authenticated donor account. Keep donor identities unique. Settings and audit responses withhold secret values where applicable.
- Bank imports store the selected account ID with each row and skip previously imported matching rows, including on retries after a partial save. The match uses account, date, direction, amount, bank reference, narration, and the occurrence among identical rows. Older imports have no stored key, so reconcile those entries before reimporting old statements.

## Available Features

- **Dashboard** — financial summary cards, 5 charts, quick actions
- **Donations** — full fields, search/filter/export, receipts, donor history
- **Expenses** — construction & operations categories, project/vendor tracking
- **People** — multi-role profiles with total donations & payment history
- **Bulk Messaging** — personalised bulk emails (via the temple's Gmail), bulk SMS (MSG91 / TextLocal / Twilio / custom gateway), and a free WhatsApp fallback, with smart templates that auto-fill {Name}, {Amount} per person. Campaigns can also be **scheduled for a future date/time** — a one-per-minute Apps Script trigger sends them automatically, and a campaign list tracks each run (sent / partial / failed / cancelled). The **official WhatsApp Business API (Meta)** can also be used for branded, template-based messages (config under Settings → Messaging & SMS)
- **Vendors & Contractors** — paid/pending totals, expense history, projects
- **Projects** — construction budget vs actual tracking
- **Pending Payments** — pending / partially paid / paid / overdue
- **Accounts** — cash & bank balances, received/spent per account
- **Transactions** — income/expense ledger, filters
- **Reports** — Daily, Monthly, Donor, Construction, Expense (with CSV export)
- **Settings** — temple details, user management, audit log
- **Every table** — search, sorting, pagination, CSV export

## Development Scripts

```bash
npm install       # install dependencies
npm run dev       # start dev server
npm run build     # typecheck + production build (outputs dist/)
npm run preview   # preview the production build locally
npm run lint      # run the linter
```
