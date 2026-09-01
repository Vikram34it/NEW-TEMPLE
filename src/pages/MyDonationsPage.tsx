import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PageHeader, Badge, Button } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { ReceiptModal } from '../components/ReceiptModal'
import { formatCurrency, formatDate, normalizePhone } from '../utils/helpers'
import type { Donation } from '../types'

export function MyDonationsPage() {
  const { user, donations, settings } = useApp()
  const [receiptDonation, setReceiptDonation] = useState<Donation | null>(null)

  // A donor can only ever see their own donations. A donation belongs to the
  // donor when it matches their mobile number (primary) OR their email (fallback).
  const mine = useMemo(() => {
    const meEmail = String(user?.email || '').trim().toLowerCase()
    const mob = normalizePhone(user?.phone || '')
    if (!meEmail && !mob) return []
    return donations.filter((d) => {
      if (meEmail && String(d.email || '').trim().toLowerCase() === meEmail) return true
      if (mob && normalizePhone(d.phone || '') === mob) return true
      return false
    })
  }, [donations, user?.email, user?.phone])

  const total = mine.reduce((s, d) => s + d.amount, 0)

  const columns: Column<Donation>[] = [
    { header: 'Date', accessor: (d) => formatDate(d.date), sortable: true, sortKey: 'date' },
    { header: 'Receipt No.', accessor: (d) => d.receiptNumber },
    { header: 'Amount', accessor: (d) => <span className="font-semibold text-emerald-600">{formatCurrency(d.amount)}</span>, sortable: true, sortKey: 'amount' },
    { header: 'Category', accessor: (d) => <Badge color="blue">{d.category}</Badge> },
    { header: 'Purpose', accessor: (d) => d.purpose || '—' },
    { header: 'Method', accessor: (d) => d.paymentMethod },
    { header: '80G', accessor: (d) => (d.need80G ? <Badge color="green">Yes</Badge> : 'No') },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Donations"
        subtitle={`Welcome, ${user?.name} — you have made ${mine.length} donation${mine.length === 1 ? '' : 's'} totalling ${formatCurrency(total)}`}
      />

      {mine.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No donations found for your email address yet.</p>
          <p className="text-xs text-slate-400 mt-1">If you have donated, please contact the temple office so your records can be linked to your email.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={mine}
          searchable
          searchPlaceholder="Search my donations..."
          pageSize={10}
          rowKey={(d) => d.donationID}
          actions={(d) => (
            <div className="flex justify-end">
              <button
                onClick={() => setReceiptDonation(d)}
                className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600"
                title="Print receipt"
              >
                <Receipt size={15} />
              </button>
            </div>
          )}
        />
      )}

      {mine.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setReceiptDonation(mine[mine.length - 1])}>
            <Receipt size={16} /> View my latest receipt
          </Button>
        </div>
      )}

      {receiptDonation && (
        <ReceiptModal donation={receiptDonation} settings={settings} onClose={() => setReceiptDonation(null)} />
      )}
    </div>
  )
}
