import { Printer, X, Building2 } from 'lucide-react'
import { formatCurrency, formatDate, amountInWords } from '../utils/helpers'
import type { Donation, Settings } from '../types'

export function ReceiptModal({
  donation,
  settings,
  onClose,
}: {
  donation: Donation
  settings: Settings
  onClose: () => void
}) {
  const print = () => window.print()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Donation Receipt</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          <div className="p-6 border-2 border-slate-200 rounded-lg" id="receipt-area">
            {/* Letterhead */}
            <div className="flex items-center justify-center gap-3 pb-4 border-b-2 border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                <Building2 size={22} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">{settings.templeName || 'Temple'}</h3>
                {settings.templeAddress && <p className="text-xs text-slate-500">{settings.templeAddress}</p>}
                {(settings.templePhone || settings.templeEmail) && (
                  <p className="text-[11px] text-slate-500">
                    {[settings.templePhone, settings.templeEmail].filter(Boolean).join('  |  ')}
                  </p>
                )}
              </div>
            </div>

            <div className="text-center mt-4">
              <h4 className="text-base font-bold uppercase tracking-wide text-slate-800">Donation Receipt</h4>
              <p className="text-xs text-slate-500">Receipt No: {donation.receiptNumber || donation.donationID}</p>
            </div>

            <div className="mt-4 text-sm">
              <p className="text-slate-600">Date: <span className="font-medium text-slate-800">{formatDate(donation.date)}</span></p>
            </div>

            <table className="w-full mt-4 text-sm">
              <tbody>
                <tr>
                  <td className="py-2 pr-2 align-top text-slate-500 w-1/3">Received from</td>
                  <td className="py-2 border-b border-dashed border-slate-300 font-medium text-slate-800">
                    {donation.donorName}
                  </td>
                </tr>
                {donation.phone && (
                  <tr>
                    <td className="py-2 pr-2 align-top text-slate-500">Phone</td>
                    <td className="py-2 border-b border-dashed border-slate-300 text-slate-700">{donation.phone}</td>
                  </tr>
                )}
                {donation.address && (
                  <tr>
                    <td className="py-2 pr-2 align-top text-slate-500">Address</td>
                    <td className="py-2 border-b border-dashed border-slate-300 text-slate-700">{donation.address}</td>
                  </tr>
                )}
                {donation.panNumber && (
                  <tr>
                    <td className="py-2 pr-2 align-top text-slate-500">PAN</td>
                    <td className="py-2 border-b border-dashed border-slate-300 text-slate-700">{donation.panNumber}</td>
                  </tr>
                )}
                {donation.aadhaarNumber && (
                  <tr>
                    <td className="py-2 pr-2 align-top text-slate-500">Aadhaar</td>
                    <td className="py-2 border-b border-dashed border-slate-300 text-slate-700">{donation.aadhaarNumber}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 pr-2 align-top text-slate-500">Amount</td>
                  <td className="py-2 border-b border-dashed border-slate-300">
                    <span className="text-xl font-bold text-emerald-700">{formatCurrency(donation.amount)}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({donation.paymentMethod})
                      {donation.transactionReference ? ` · Ref ${donation.transactionReference}` : ''}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 align-top text-slate-500">Purpose</td>
                  <td className="py-2 border-b border-dashed border-slate-300 text-slate-700">
                    {donation.category}
                    {donation.purpose ? ` — ${donation.purpose}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 align-top text-slate-500">Amount in words</td>
                  <td className="py-2 border-b border-dashed border-slate-300 text-slate-700 italic">
                    {amountInWords(donation.amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-8 flex items-end justify-between">
              <p className="text-xs text-slate-500 max-w-[55%]">Thank you for your generous support to {settings.templeName || 'the temple'}.</p>
              <div className="text-right">
                <p className="text-xs text-slate-500">{donation.receivedBy ? `Received by ${donation.receivedBy}` : 'Authorised signatory'}</p>
                <div className="mt-6 w-44 border-t border-slate-400 pt-1 text-xs text-slate-500">Signature</div>
              </div>
            </div>

            {donation.need80G && (
              <p className="mt-4 text-[11px] text-slate-500 border-t border-slate-200 pt-2">
                This donation is covered under Section 80G of the Income-tax Act, 1961 and is eligible for tax exemption.
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={print}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}