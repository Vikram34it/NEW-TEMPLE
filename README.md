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
- **Auth:** Simple role-based login (enforced client- and server-side)

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

### Step 1 — Create the spreadsheet (automated)
1. Create a new, **blank** Google Spreadsheet.
2. Open **Extensions → Apps Script**, create a new project.
3. Paste the contents of `backend/Code.gs` into `Code.gs`, and copy
   `backend/appsscript.json` as `appsscript.json`.
4. **Close and reopen the spreadsheet** (or run `installAutomation` /
   `setupSpreadsheet` from the Apps Script function dropdown). This runs `onOpen()`
   which **automatically**:
   - creates all 11 sheets with the correct headers,
   - seeds default accounts, example projects, and demo users,
   - writes `SPREADSHEET_ID` to Script Properties,
   - generates a secret `API_KEY` and stores it in Script Properties.

   You do **not** need to create any sheets, set `SPREADSHEET_ID`, or generate an
   API key by hand. If a sheet is ever deleted, the backend recreates it on the
   next API request automatically.

### Step 2 — Get your API key
Run `getApiKeyNow()` from the Apps Script **function dropdown**. It shows your
generated `API_KEY` in a dialog. Note it down (keep it secret).

### Step 3 — Deploy the Web App
1. Click **Deploy → New deployment → Web app**.
2. **Execute as:** Me (your account).
3. **Who has access:** pick an option (see Security notes below).
4. Copy the Web App URL.

### Step 4 — Point the frontend at the API
1. Copy `.env.example` to `.env.local`.
2. Set `VITE_WEB_APP_URL` to your deployed Apps Script URL.
3. Set `VITE_USE_MOCK=false`.
4. Set `VITE_API_TOKEN` to the `API_KEY` from Step 2.
5. Rebuild / redeploy.

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

## ⚠️ Security Notes: GitHub Pages + Google Sheets + Apps Script

This architecture has real limitations you must understand before storing
temple money data:

- **GitHub Pages is a static host.** It cannot keep secrets. Anything you put in
  the frontend bundle (React code) is publicly readable. Never put the
  spreadsheet ID, an OAuth token, or the backend API key in the source or build.
- **Google Apps Script Web Apps are not a hardened auth boundary.** A Web App
  deployed as *Anyone* can be called by anyone with its URL. The frontend role
  buttons are **cosmetic** — the backend (`Code.gs`) re-validates every request
  and rejects those without a valid `API_KEY` token.

### Safest practical approach within this stack
1. **Keep the spreadsheet private** and never share it publicly.
2. **Protect every backend call with an API key** (`API_KEY` in Script
   Properties). The backend checks the `token` on every request (fail-closed).
3. **Prefer restricted access:** under **Who has access**, choose *Only myself*
   or *Known Google accounts* if your users have Google accounts, instead of
   *Anyone with the link*.
4. **Enforce role checks server-side**, not only in the UI.
5. **Add Google Cloud IAP / Identity Platform** in front of the Apps Script if
   you need strong authentication for genuinely sensitive financial data.
6. For high-assurance deployments, move the API behind a real backend (e.g.
   Cloud Run + Firestore + Firebase Auth), which this UI is designed to be
   pointed at through the `services` layer.

> Treat "demo passwords" as placeholders. In a production deployment, change
> them, and strongly consider replacing the simple email/password check with a
> proper identity provider (e.g. Firebase Auth or Google Sign-In). The API key
> in the client is a convenience gate, not a replacement for true user
> authentication — the backend `login()` still validates credentials server-side.

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
