import { useMemo, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Button, Card, EmptyState, PageHeader, Select } from '../components/ui'
import { parseBankStatementXlsx, type BankStatementRow } from '../utils/bankStatement'
import { formatCurrency, formatDate } from '../utils/helpers'
import type { Donation, Person, Transaction } from '../types'

interface PreviewRow extends BankStatementRow {
  key: string
  include: boolean
  account: string
  donorID: string
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

export function BankStatementPage() {
  const { accounts, people, bulkAddDonations, bulkAddTransactions, user, can } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [allAccount, setAllAccount] = useState('')

  const donors = useMemo<Person[]>(
    () =>
      people
        .filter((p) => Array.isArray(p.personType) && p.personType.includes('Donor'))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  )

  const defaultAccount = useMemo(
    () => accounts.find((a) => a.type === 'bank')?.accountName ?? accounts[0]?.accountName ?? 'Main Bank Account',
    [accounts],
  )

  const incomeTotal = useMemo(
    () => (rows || []).filter((r) => r.include && r.type === 'income').reduce((s, r) => s + r.amount, 0),
    [rows],
  )
  const expenseTotal = useMemo(
    () => (rows || []).filter((r) => r.include && r.type === 'expense').reduce((s, r) => s + r.amount, 0),
    [rows],
  )
  const donorTaggedCount = useMemo(
    () => (rows || []).filter((r) => r.include && r.type === 'income' && r.donorID).length,
    [rows],
  )
  const selectedCount = useMemo(() => (rows || []).filter((r) => r.include).length, [rows])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Please upload the bank statement saved as an .xlsx (Excel) file.')
      return
    }
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = await parseBankStatementXlsx(buffer)
      if (parsed.length === 0) {
        throw new Error(
          'No transaction rows were recognised. Make sure the sheet has date and amount columns (e.g. Value Date, Description, Cr/Dr and Transaction Amount).',
        )
      }
      const account = defaultAccount
      setRows(parsed.map((r, i) => ({ ...r, key: `row-${i}`, include: true, account, donorID: '' })))
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
    setRows((rs) => (rs || []).map((r) => ({ ...r, include: checked })))
  }

  const setRowDonor = (key: string, donorID: string) => {
    setRows((rs) => (rs || []).map((r) => (r.key === key ? { ...r, donorID } : r)))
  }

  const importRows = async () => {
    const selected = (rows || []).filter((r) => r.include && r.date && r.amount > 0)
    if (selected.length === 0) return
    setImporting(true)
    try {
      // Credits with a donor picked become proper donation records (receipts,
      // donor portal, reports). Everything else becomes a plain ledger entry.
      const donations: Array<Omit<Donation, 'donationID' | 'receiptNumber'>> = []
      let bankSeq = 1
      const txns: Array<Omit<Transaction, 'transactionID'>> = []
      const donorById = new Map(donors.map((d) => [d.personID, d]))

      for (const r of selected) {
        if (r.type === 'income' && r.donorID) {
          const donor = donorById.get(r.donorID)
          if (!donor) continue
          donations.push({
            date: r.date,
            donorID: donor.personID,
            donorName: donor.name,
            phone: donor.phone || '',
            email: donor.email || '',
            address: donor.address || '',
            amount: r.amount,
            category: 'General Donation',
            purpose: '',
            paymentMethod: paymentMethodFromDescription(r.description),
            transactionReference: r.reference || '',
            receivedBy: user?.name || '',
            notes: '',
          })
        } else {
          txns.push({
            date: r.date,
            type: r.type,
            incomeOrExpense: r.type,
            amount: r.amount,
            account: r.account,
            referenceID: r.reference || `BANK-${String(bankSeq++).padStart(4, '0')}`,
            description: r.description || `Bank ${r.type === 'income' ? 'credit' : 'debit'}`,
            createdBy: user?.name || 'system',
          })
        }
      }

      if (donations.length > 0) await bulkAddDonations(donations)
      if (txns.length > 0) await bulkAddTransactions(txns)
      setRows(null)
      setFileName('')
    } catch {
      // error messages are toasted by the context; keep the preview so nothing is lost
    } finally {
      setImporting(false)
    }
  }

  const allChecked = (rows || []).length > 0 && (rows || []).every((r) => r.include)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bank Statement Import"
        subtitle="Upload the bank's Excel statement — every credit becomes an income transaction and every debit an expense. Pick a donor for each credit to record it as a donation."
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
              accept=".xlsx"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              {parsing ? <FileSpreadsheet size={26} className="animate-pulse" /> : <Upload size={26} />}
            </div>
            <div>
              <p className="font-semibold text-slate-700">{parsing ? 'Reading statement…' : 'Click to choose the statement file'}</p>
              <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) export from your bank / netbanking</p>
            </div>
            <p className="text-[11px] text-slate-400 max-w-md">
              Columns are auto-detected — the sheet needs a <strong>Date</strong> column (e.g. Value Date), a{' '}
              <strong>Description / Narration</strong> column, and either separate <strong>Credit / Debit</strong>{' '}
              columns or a single <strong>Transaction Amount</strong> column with a <strong>Cr/Dr</strong> column.
              Title and total rows are skipped automatically.
            </p>
          </label>
        </Card>
      )}

      {rows && (
        <>
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
              <p className="text-xs text-slate-500">Donor tagged</p>
              <p className="text-2xl font-bold text-slate-800">{donorTaggedCount}</p>
              <p className="text-[11px] text-slate-400">become donation records with receipts</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Book untagged rows to account</p>
              <Select value={allAccount} onChange={(e) => applyAccountToAll(e.target.value)} className="mt-1.5">
                {accounts.map((a) => (
                  <option key={a.accountID} value={a.accountName}>{a.accountName}</option>
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

          <Card className="p-0 overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 w-10">
                      <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                    </th>
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">Description</th>
                    <th className="text-left py-3 px-2 font-medium">Type</th>
                    <th className="text-right py-3 px-2 font-medium">Amount</th>
                    <th className="text-left py-3 px-2 font-medium">Account</th>
                    <th className="text-left py-3 px-4 font-medium">Donor (for credits)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
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
                        <Badge color={r.type === 'income' ? 'green' : 'red'}>{r.type}</Badge>
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-2 px-2">
                        <Select value={r.account} onChange={(e) => setRows((rs) => (rs || []).map((x) => (x.key === r.key ? { ...x, account: e.target.value } : x)))} className="!py-1 text-xs">
                          {accounts.map((a) => (
                            <option key={a.accountID} value={a.accountName}>{a.accountName}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 px-4">
                        {r.type === 'income' ? (
                          <Select value={r.donorID} onChange={(e) => setRowDonor(r.key, e.target.value)} className="!py-1 text-xs">
                            <option value="">— General income —</option>
                            {donors.map((d) => (
                              <option key={d.personID} value={d.personID}>{d.name}</option>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <EmptyState title="No rows recognised" subtitle="Try a different export format or check the column names." />
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Preview only — nothing is saved until you click Import. Donor-tagged credits are recorded as donations; the rest as transactions.
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