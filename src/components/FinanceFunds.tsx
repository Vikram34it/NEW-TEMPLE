import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { dataService } from '../services/apiService'
import type { FinanceFund, FinanceFundMovement, FinanceOpeningAccount } from '../types'
import { formatCurrency, formatDate } from '../utils/helpers'
import { DataTable, type Column } from './DataTable'
import { Button, Card, CardHeader, Field, Input, Modal, Select } from './ui'

export function FinanceFunds() {
  const { dashboard, refreshCollectionsLedger } = useApp()
  const [fund, setFund] = useState<FinanceFund | null>(null)
  const [editing, setEditing] = useState(false)
  const funds = dashboard?.funds
  const accounts = dashboard?.openingFundAccounts || []
  if (!funds) return null

  const balance = (bank: number, cash: number) => Math.round(bank * 100 + cash * 100) / 100
  const unclassified = funds.find((row) => row.id === 'unclassified')
  const hasUnclassified = Boolean(unclassified?.bank || unclassified?.cash)
  const amountClass = 'px-4 py-3 text-right tabular-nums whitespace-nowrap'

  return (
    <Card>
      <CardHeader title="Available money by fund" action={
        accounts.length > 0 && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Allocate opening balances</Button>
      } />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Fund</th>
              <th scope="col" className={amountClass}>In bank</th>
              <th scope="col" className={amountClass}>Cash outside bank</th>
              <th scope="col" className={amountClass}>Total available</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <th scope="row" className="px-4 py-3 font-medium">
                  <button type="button" className="text-left text-orange-700 underline underline-offset-2" onClick={() => setFund(row)}>{row.name}</button>
                </th>
                <td className={amountClass}>{formatCurrency(row.bank)}</td>
                <td className={amountClass}>{formatCurrency(row.cash)}</td>
                <td className={amountClass + ' font-semibold'}>{formatCurrency(balance(row.bank, row.cash))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <th scope="row" className="px-4 py-3">Total</th>
              <td className={amountClass}>{formatCurrency(dashboard.bankBalance)}</td>
              <td className={amountClass}>{formatCurrency(dashboard.cashBalance)}</td>
              <td className={amountClass}>{formatCurrency(balance(dashboard.bankBalance, dashboard.cashBalance))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {hasUnclassified && <p className="px-4 py-3 text-xs text-slate-600">Awaiting classification includes unassigned opening money, uncategorized movements, and any difference between the ledger and recorded balances.</p>}
      <Modal open={Boolean(fund)} title={fund?.name || 'Fund activity'} onClose={() => setFund(null)} wide>
        {fund && <FundActivity key={fund.id} fund={fund} />}
      </Modal>
      <Modal open={editing} title="Allocate opening balances" onClose={() => setEditing(false)}>
        {editing && <OpeningAllocation accounts={accounts} funds={funds} onSaved={async () => {
          await refreshCollectionsLedger()
          setEditing(false)
        }} />}
      </Modal>
    </Card>
  )
}

function FundActivity({ fund }: { fund: FinanceFund }) {
  const [rows, setRows] = useState<(FinanceFundMovement & { id: number })[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    dataService.getFinanceFundDetails(fund.id)
      .then((items) => { if (active) setRows(items.map((row, id) => ({ ...row, id }))) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Could not load fund activity.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fund.id])
  const columns: Column<(typeof rows)[number]>[] = [
    { header: 'Date', accessor: (row) => row.date ? formatDate(row.date) : '—', sortKey: 'date', sortable: true },
    { header: 'Account', accessor: 'account' },
    { header: 'Movement', accessor: 'kind' },
    { header: 'Description', accessor: (row) => <>{row.description}<div className="text-xs text-slate-500">{row.reference}</div></> },
    { header: 'Amount', accessor: (row) => formatCurrency(row.amount), sortKey: 'amount', sortable: true },
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">Received <strong>{formatCurrency(fund.received)}</strong> · Spent <strong>{formatCurrency(fund.spent)}</strong></p>
      {loading && <p role="status" className="text-sm text-slate-600">Loading fund activity.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!loading && !error && <DataTable columns={columns} data={rows} rowKey={(row) => String(row.id)} searchable
        searchPlaceholder="Search account, description or reference" emptyMessage="No recorded movements for this fund." />}
    </div>
  )
}

function OpeningAllocation({ accounts, funds, onSaved }: {
  accounts: FinanceOpeningAccount[]
  funds: FinanceFund[]
  onSaved: () => Promise<void>
}) {
  const [accountID, setAccountID] = useState(accounts[0]?.id || '')
  const account = accounts.find((row) => row.id === accountID)
  return (
    <div className="space-y-3">
      <Field label="Account">
        <Select value={accountID} onChange={(event) => setAccountID(event.target.value)}>
          {accounts.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </Select>
      </Field>
      {account && <OpeningAllocationForm key={account.id} account={account} funds={funds.filter((fund) => fund.id !== 'unclassified')} onSaved={onSaved} />}
    </div>
  )
}

function OpeningAllocationForm({ account, funds, onSaved }: {
  account: FinanceOpeningAccount
  funds: FinanceFund[]
  onSaved: () => Promise<void>
}) {
  const [allocations, setAllocations] = useState(account.allocations)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const remainder = (Math.round(account.opening * 100) -
    Object.values(allocations).reduce((sum, amount) => sum + Math.round(amount * 100), 0)) / 100
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await dataService.saveFinanceOpeningFunds({ ...account, allocations })
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the opening allocation.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form className="space-y-3" onSubmit={save}>
      <p className="text-sm text-slate-600">Opening balance <strong>{formatCurrency(account.opening)}</strong>. Allocate amounts you can verify.</p>
      {funds.map((fund) => (
        <Field key={fund.id} label={fund.name}>
          <Input type="number" min={0} step="0.01" value={allocations[fund.id] || ''}
            onChange={(event) => setAllocations({ ...allocations, [fund.id]: Number(event.target.value) })} />
        </Field>
      ))}
      <p className="text-sm text-slate-700">Awaiting classification <strong>{formatCurrency(remainder)}</strong></p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={saving || remainder < Math.min(account.opening, 0)}>{saving ? 'Saving…' : 'Save allocation'}</Button>
    </form>
  )
}
