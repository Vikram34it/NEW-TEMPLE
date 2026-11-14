import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileSpreadsheet, AlertTriangle, ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from '../components/ui'
import { parseBankStatement, reconcileStatement, type BankStatementRow } from '../utils/bankStatement'
import { formatCurrency, formatDate, normalizePhone } from '../utils/helpers'
import type { Donation, Expense, Person, Transaction } from '../types'
import { bankPurpose, isBankOnlyCategory } from '../utils/bankPurpose'
import { CONSTRUCTION_EXPENSE_CATEGORIES, DONATION_CATEGORIES, OPERATIONS_EXPENSE_CATEGORIES } from '../utils/constants'

interface PreviewRow extends BankStatementRow {
  key: string
  importIdentity: string
  include: boolean
  account: string
  category: string
  donorID: string
  donorName: string
  /** Free-text remark shown for debit (Dr) rows; used as the txn description. */
  remark: string
}

// Rough bank-channel detection from the statement narration, mapped onto the
// app's payment-method options so donations post to the right account.
function paymentMethodFromDescription(description: string): Donation['paymentMethod'] {
  const t = String(description || '').toLowerCase()
  if (t.includes('upi')) return 'UPI'
  if (t.includes('cheque') || t.includes('chq')) return 'Cheque'
  if (t.includes('card') || t.includes('pos') || t.includes('swipe')) return 'Card'
  if (t.includes('neft') || t.includes('imps') || t.includes('rtgs') || t.includes('ft') || t.includes('transfer')) return 'Bank Transfer'
  return 'Other'
}

const incomeCategories = [...DONATION_CATEGORIES, 'Fixed Deposit Closure', 'Bank Interest', 'Internal Transfer', 'Unclassified Credit', 'Other Bank Credit']
const expenseCategories = [...CONSTRUCTION_EXPENSE_CATEGORIES, ...OPERATIONS_EXPENSE_CATEGORIES, 'Internal Transfer']

export function BankStatementPage() {
  const { accounts, people, bulkAddDonations, bulkAddExpenses, bulkAddTransactions, user, can } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [allAccount, setAllAccount] = useState('')
  const [filter, setFilter] = useState('all')

  const donors = useMemo<Person[]>(
    () =>
      people
        .filter((p) => Array.isArray(p.personType) && p.personType.includes('Donor'))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  )

  const bankAccounts = useMemo(() => accounts.filter((account) => account.type === 'bank'), [accounts])
  const defaultAccount = useMemo(
    () => bankAccounts[0]?.accountID ?? '',
    [bankAccounts],
  )

  const incomeTotal = useMemo(
    () => (rows || []).filter((r) => r.include && r.type === 'income').reduce((s, r) => s + r.amount, 0),
    [rows],
  )
  const expenseTotal = useMemo(
    () => (rows || []).filter((r) => r.include && r.type === 'expense').reduce((s, r) => s + r.amount, 0),
    [rows],
  )
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const donorTaggedCount = useMemo(
    () => (rows || []).filter((r) => r.include && r.type === 'income' && !isBankOnlyCategory(r.category) && r.donorID).length,
    [rows],
  )
  const reconciliation = useMemo(() => reconcileStatement(rows || []), [rows])
  const hasStatementBalances = rows?.some((row) => row.runningBalance !== undefined)
  const selectedCount = useMemo(() => (rows || []).filter((r) => r.include).length, [rows])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Please upload the bank statement as an .xls or .xlsx file.')
      return
    }
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = await parseBankStatement(buffer)
      if (parsed.length === 0) {
        throw new Error(
          'No transaction rows were recognised. Make sure the sheet has date and amount columns (e.g. Value Date, Description, Cr/Dr and Transaction Amount).',
        )
      }
      const account = defaultAccount
      // The statement's "Donor Name" column (when present) pre-fills the editable
      // text field so each credit is already tagged; users can correct it freely.
      const occurrences = new Map<string, number>()
      setRows(
        parsed.map((r, i) => {
          const identity = r.bankTransactionID ? JSON.stringify(['bank-transaction', r.bankTransactionID]) : JSON.stringify([r.date, r.type, r.amount, r.reference, r.description])
          const occurrence = (occurrences.get(identity) ?? 0) + 1
          occurrences.set(identity, occurrence)
          const phone = normalizePhone(r.donorPhone || '')
          const matches = phone ? donors.filter((donor) => normalizePhone(donor.phone) === phone) : []
          return {
            ...r,
            category: bankPurpose(r.type, (r.type === 'income' ? r.purpose : r.remark) || '', r.description, Boolean(r.donorName || phone)),
            donorID: matches.length === 1 ? matches[0].personID : '',
            key: `row-${i}`,
            include: true,
            account,
            donorName: r.type === 'income' ? (r.donorName || '').trim() : '',
            remark: (r.remark || '').trim(),
            importIdentity: r.bankTransactionID ? identity : JSON.stringify([identity, occurrence]),
          }
        }),
      )
      setFilter('all')
      setQuery('')
      setPage(0)
      setAllAccount(account)
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the statement file.')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const applyAccountToAll = (account: string) => {
    setAllAccount(account)
    setRows((rs) => (rs || []).map((r) => (r.include ? { ...r, account } : r)))
  }

  const toggleRow = (key: string) => {
    setRows((rs) => (rs || []).map((r) => (r.key === key ? { ...r, include: !r.include } : r)))
  }

  const toggleAll = (checked: boolean) => {
    const visible = new Set(visibleRows.map((row) => row.key))
    setRows((rs) => (rs || []).map((row) => visible.has(row.key) ? { ...row, include: checked } : row))
  }

  const changeRow = (key: string, changes: Partial<PreviewRow>) => {
    setRows((rs) => (rs || []).map((r) => r.key === key ? { ...r, ...changes } : r))
  }

  const setRemark = (key: string, remark: string) => {
    setRows((rs) => (rs || []).map((r) => (r.key === key ? { ...r, remark } : r)))
  }

  const importRows = async () => {
    const selected = (rows || []).filter((r) => r.include && r.date && r.amount > 0)
    if (selected.length === 0) return
    setError('')
    setImporting(true)
    try {
      const donations: Array<Omit<Donation, 'donationID' | 'receiptNumber'>> = []
      const expenses: Array<Omit<Expense, 'expenseID'>> = []
      const bankMovements: Array<Omit<Transaction, 'transactionID'>> = []
      const donorsByID = new Map(donors.map((donor) => [donor.personID, donor]))

      const paymentMethodFor = (r: PreviewRow): Expense['paymentMethod'] => {
        const acct = accounts.find((a) => a.accountID === r.account)
        if (acct?.type === 'cash') return 'Cash'
        return paymentMethodFromDescription(r.description)
      }

      const importFields = await Promise.all(selected.map(async (row) => {
        if (!bankAccounts.some((account) => account.accountID === row.account)) {
          throw new Error('Choose a valid account for each selected row.')
        }
        const identity = new TextEncoder().encode(JSON.stringify([row.account, row.importIdentity]))
        const hash = await crypto.subtle.digest('SHA-256', identity)
        const bankImportKey = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
        return { accountID: row.account, bankImportKey }
      }))
      for (const [index, r] of selected.entries()) {
        if (isBankOnlyCategory(r.category)) {
          bankMovements.push({ ...importFields[index], date: r.date, type: r.type, incomeOrExpense: r.type,
            amount: r.amount, account: accounts.find((a) => a.accountID === r.account)!.accountName,
            referenceID: r.reference, description: r.description, bankCategory: r.category, createdBy: user?.name || '' })
        } else if (r.type === 'income') {
          const typedName = (r.donorName || '').trim()
          const donor = donorsByID.get(r.donorID)
          donations.push({
            ...importFields[index],
            date: r.date,
            donorID: donor ? donor.personID : '',
            donorName: donor?.name || typedName || 'Unknown Donor',
            phone: donor?.phone || '',
            email: donor?.email || '',
            address: donor?.address || '',
            amount: r.amount,
            category: r.category,
            purpose: r.purpose || '',
            paymentMethod: paymentMethodFor(r),
            transactionReference: r.reference || '',
            receivedBy: user?.name || '',
            notes: '',
          })
        } else {
          expenses.push({
            ...importFields[index],
            date: r.date,
            category: r.category,
            description: (r.remark || '').trim() || r.description || 'Bank debit',
            amount: r.amount,
            paymentMethod: paymentMethodFor(r),
            vendorID: '',
            vendorName: '',
            billNumber: '',
            transactionReference: r.reference || '',
            projectID: '',
            projectName: '',
            approvedBy: user?.name || '',
            paidBy: user?.name || '',
            notes: r.description,
          })
        }
      }

      if (donations.length > 0) await bulkAddDonations(donations)
      if (expenses.length > 0) await bulkAddExpenses(expenses)
      if (bankMovements.length > 0) await bulkAddTransactions(bankMovements)
      setRows(null)
      setFileName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statement import failed.')
    } finally {
      setImporting(false)
    }
  }

  const statementAccount = bankAccounts.find((account) => account.accountID === allAccount)
  const singleAccount = !!statementAccount && !!rows?.every((row) => row.include && row.account === statementAccount.accountID)
  const openingDifference = reconciliation && statementAccount ? Math.round((reconciliation.opening - statementAccount.openingBalance) * 100) / 100 : 0
  const search = query.trim().toLowerCase()
  const filteredRows = (rows || []).filter((row) => !search || [row.reference, row.description, row.donorName, row.category, row.purpose, row.remark].some((value) => value?.toLowerCase().includes(search))).filter((r) => filter === 'all' || (filter === 'unlinked' ? r.type === 'income' && !r.donorID && !isBankOnlyCategory(r.category) : filter === 'review' ? r.category.startsWith('Unclassified') : r.type === filter))
  const visibleRows = filteredRows.slice(page * 50, (page + 1) * 50)
  const allChecked = visibleRows.length > 0 && visibleRows.every((r) => r.include)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank Statement Import"
        subtitle="Review and import bank credits, debits, and their purposes."
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {!rows && (
        <Card className="p-8">
          <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 transition-colors cursor-pointer py-12 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              {parsing ? <FileSpreadsheet size={26} className="animate-pulse" /> : <Upload size={26} />}
            </div>
            <div>
              <p className="font-semibold text-slate-700">{parsing ? 'Reading statement…' : 'Click to choose the statement file'}</p>
              <p className="text-xs text-slate-400 mt-1">Excel (.xls or .xlsx) export from your bank / netbanking</p>
            </div>
            <p className="text-[11px] text-slate-400 max-w-md">
              Columns are auto-detected — the sheet needs a <strong>Date</strong> column (e.g. Value Date), a{' '}
              <strong>Description / Narration</strong> column, and either separate <strong>Credit / Debit</strong>{' '}
              columns or a single <strong>Transaction Amount</strong> column with a <strong>Cr/Dr</strong> column.
              A <strong>Transaction ID</strong> column is used as the reference, and a <strong>Donor Name</strong>{' '}
              column pre-fills the donor name box for each credit.
              Title and total rows are skipped automatically.
            </p>
          </label>
        </Card>
      )}

      {rows && (
        <>
          {hasStatementBalances && !reconciliation && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              The running balances in this workbook do not reconcile with the parsed transactions. Review the statement before importing.
            </p>
          )}
          {reconciliation && (
            <Card className="p-4">
              <h2 className="font-semibold text-slate-800">Bank statement reconciliation</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div><dt>Statement opening</dt><dd className="font-semibold">{formatCurrency(reconciliation.opening)}</dd></div>
                <div><dt>Statement closing</dt><dd className="font-semibold">{formatCurrency(reconciliation.closing)}</dd></div>
                {singleAccount && statementAccount && (
                  <>
                    <div><dt>Account opening</dt><dd className="font-semibold">{formatCurrency(statementAccount.openingBalance)}</dd></div>
                    <div><dt>Account opening + statement movement</dt><dd className="font-semibold">{formatCurrency(statementAccount.openingBalance + incomeTotal - expenseTotal)}</dd></div>
                  </>
                )}
              </dl>
              {singleAccount && openingDifference !== 0 && (
                <p className="mt-3 text-sm text-amber-800" role="status">
                  The statement opening differs from the account opening by {formatCurrency(Math.abs(openingDifference))}.
                  Check for transactions before this statement. If this statement starts your ledger, compare the opening balance in <Link className="underline" to="/accounts">Accounts</Link>.
                </p>
              )}
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Rows</p>
              <p className="text-2xl font-bold text-slate-800">{rows.length}</p>
              <p className="text-[11px] text-slate-400">{fileName}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Selected</p>
              <p className="text-2xl font-bold text-slate-800">{selectedCount}</p>
              <p className="text-[11px] text-slate-400">
                <span className="text-emerald-600 inline-flex items-center gap-1"><ArrowUpCircle size={12} /> {formatCurrency(incomeTotal)} credits</span>
                {' · '}
                <span className="text-red-600 inline-flex items-center gap-1"><ArrowDownCircle size={12} /> {formatCurrency(expenseTotal)} debits</span>
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Linked to a donor</p>
              <p className="text-2xl font-bold text-slate-800">{donorTaggedCount}</p>
              <p className="text-[11px] text-slate-400">can appear in the donor portal once the mobile number matches</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Bank account for selected rows</p>
              <Select value={allAccount} onChange={(e) => applyAccountToAll(e.target.value)} className="mt-1.5">
                {bankAccounts.map((a) => (
                  <option key={a.accountID} value={a.accountID}>{a.accountName}</option>
                ))}
              </Select>
              <div className="mt-2">
                {can('*') ? (
                  <Button onClick={() => void importRows()} disabled={importing || selectedCount === 0} className="w-full">
                    {importing ? 'Importing…' : `Import ${selectedCount || ''} row${selectedCount === 1 ? '' : 's'}`}
                  </Button>
                ) : (
                  <p className="text-xs text-slate-400">Only admins can import.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
          <Input value={query} aria-label="Search statement" placeholder="Find by transaction ID, donor or purpose" onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          <Select aria-label="Filter statement preview" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0) }}>
            <option value="all">All statement rows</option><option value="income">Credits (CR)</option><option value="expense">Debits (DR)</option><option value="review">Unclassified</option><option value="unlinked">Donations without a donor profile</option>
          </Select>
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 w-10">
                      <input aria-label="Select rows on this page" type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                    </th>
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">Description</th>
                    <th className="text-left py-3 px-2 font-medium">Type</th>
                    <th className="text-right py-3 px-2 font-medium">Amount</th>
                    <th className="text-left py-3 px-2 font-medium">Account</th>
                    <th className="text-left py-3 px-2 font-medium">Purpose category</th>
                    <th className="text-left py-3 px-4 font-medium">Donor / Expense details</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.key} className={`border-t border-slate-100 ${r.include ? '' : 'opacity-50'}`}>
                      <td className="py-2 px-4">
                        <input type="checkbox" checked={r.include} onChange={() => toggleRow(r.key)} />
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-slate-700">{formatDate(r.date)}</td>
                      <td className="py-2 px-2 max-w-[280px]" title={r.description}>
                        <span className="block truncate text-slate-600">{r.description || r.reference || '—'}</span>
                        {r.reference && <span className="text-[11px] text-slate-400">Ref: {r.reference}</span>}
                      </td>
                      <td className="py-2 px-2">
                        <Badge color={r.type === 'income' ? 'green' : 'red'}>{r.type === 'income' ? 'CR' : 'DR'}</Badge>
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-2 px-2">
                        <Select value={r.account} onChange={(e) => setRows((rs) => (rs || []).map((x) => (x.key === r.key ? { ...x, account: e.target.value } : x)))} className="!py-1 text-xs">
                          {bankAccounts.map((a) => (
                            <option key={a.accountID} value={a.accountID}>{a.accountName}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 px-2">
                        <Select aria-label="Purpose category" value={r.category} onChange={(e) => changeRow(r.key, { category: e.target.value })}>
                          {(r.type === 'income' ? incomeCategories : expenseCategories).map((category) => <option key={category}>{category}</option>)}
                        </Select>
                        {r.type === 'income' && r.purpose && <small>{r.purpose}</small>}
                      </td>
                      <td className="py-2 px-4">
                        {r.type === 'income' ? (
                          <>
                            {r.donorName && <div className="text-xs mb-1">{r.donorName}</div>}
                            {!isBankOnlyCategory(r.category) && <Select aria-label="Link donor profile" value={r.donorID} onChange={(e) => changeRow(r.key, { donorID: e.target.value })}>
                              <option value="">Unlinked</option>
                              {donors.map((donor) => <option key={donor.personID} value={donor.personID}>{donor.name}{donor.phone ? ' · ' + donor.phone : ''}</option>)}
                            </Select>}
                          </>
                        ) : (
                          <Input
                            value={r.remark}
                            onChange={(e) => setRemark(r.key, e.target.value)}
                            placeholder="Remark"
                            className="!py-1 text-xs"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <EmptyState title="No matching rows" subtitle="Choose another preview filter." />
              )}
            </div>
            {filteredRows.length > 50 && <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-slate-600">Page {page + 1} of {Math.ceil(filteredRows.length / 50)}</span>
              <Button size="sm" variant="ghost" disabled={(page + 1) * 50 >= filteredRows.length} onClick={() => setPage(page + 1)}>Next</Button>
            </div>}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Review categories and donor links before importing. Confirm the mobile number before linking a name-only row.
              </p>
              <Button variant="ghost" size="sm" onClick={() => { setRows(null); setFileName(''); setError('') }}>
                Start over
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}