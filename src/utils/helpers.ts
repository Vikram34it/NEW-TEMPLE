import type { Account } from '../types'

export function formatCurrency(amount: number): string {
  const n = Number(amount) || 0
  // Show paise only when the amount actually has a fractional part (e.g.
  // bank-statement amounts like 500000.78); whole rupees stay clean.
  const hasPaise = Math.round(Math.abs(n * 100)) % 100 !== 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(n)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// Keep only the digits of a phone/mobile number, dropping +91 / 0 prefixes so
// '9845012345', '+91 98450 12345' and '09845012345' all match.
export function normalizePhone(phone: string): string {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.length > 10 && digits.substring(0, 2) === '91') digits = digits.substring(2)
  if (digits.length > 10 && digits.charAt(0) === '0') digits = digits.substring(1)
  return digits
}

// Accepts ISO (yyyy-mm-dd) or Indian (dd-mm-yyyy) dates and returns a
// normalised yyyy-mm-dd string, or '' if not a valid date.
export function parseDateInput(raw: string): string {
  const value = String(raw || '').trim()
  if (!value) return ''
  const m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3]
    if (isValidDate_(y, mo, d)) return padDate_(y, mo, d)
  }
  const dm = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dm) {
    const d = +dm[1], mo = +dm[2], y = +dm[3]
    if (isValidDate_(y, mo, d)) return padDate_(y, mo, d)
  }
  return ''
}

function isValidDate_(y: number, mo: number, d: number): boolean {
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

function padDate_(y: number, mo: number, d: number): string {
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Hints that tag a donation/expense as construction / temple-building. Used by
// the Construction fund tracker (NOT for posting money - see below).
const CONSTRUCTION_HINTS = [
  'construction', 'land', 'mandir', 'bhoomi', 'renovation', 'redevelopment',
  'cement', 'steel', 'sand', 'bricks', 'labour', 'electrical work',
  'plumbing', 'painting', 'marble', 'woodwork', 'equipment', 'transportation',
]

// True when a donation/expense is tagged as construction-related, based on its
// category / purpose / project text.
export function isConstructionTagged(record: { category?: string; purpose?: string; projectName?: string }): boolean {
  const hint = [record.category, record.purpose, record.projectName].filter(Boolean).join(' ').toLowerCase()
  return CONSTRUCTION_HINTS.some((k) => hint.includes(k))
}

// Cash payments go to the cash account; everything else (UPI, bank transfer,
// cheque, card, other) goes to the bank account. Construction donations are NOT
// diverted here - physical money always lands in Cash / Main Bank so the bank
// statement matches reality. Construction totals are tracked separately via
// isConstructionTagged().
export function accountNameForPaymentMethod(method: string, accounts: Account[]): string {
  const target = String(method || '').toLowerCase() === 'cash' ? 'cash' : 'bank'
  const acc = accounts.find((a) => a.type === target)
  return acc?.accountName || accounts[0]?.accountName || 'Main Bank Account'
}

// Replace {Token} placeholders in a message with values (keys are the token
// names, e.g. { Name: 'Ram', Amount: '5000' }).
export function fillTemplate(text: string, values: Record<string, string | number>): string {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function generateID(prefix: string, sequence: number): string {
  const year = getCurrentYear()
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`
}

export function generateReceiptNumber(prefix: string, sequence: number): string {
  const year = getCurrentYear()
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`
}

export function monthKey(dateString: string): string {
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${year}`
}

export function betweenDate(dateStr: string, start: string, end: string): boolean {
  if (!start && !end) return true
  const d = new Date(dateStr).getTime()
  if (!start && end) return d <= new Date(end).getTime()
  if (start && !end) return d >= new Date(start).getTime()
  return d >= new Date(start).getTime() && d <= new Date(end).getTime()
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const str = String(cell ?? '')
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const content = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: never[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`
}

// Converts an amount to English words using the Indian numbering system
// (lakh / crore). E.g. 1234567 -> "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven".
export function amountInWords(amount: number): string {
  let n = Math.floor(Math.abs(amount))
  const paise = Math.round((Math.abs(amount) - Math.floor(Math.abs(amount))) * 100)
  if (n === 0 && paise === 0) return 'Zero Rupees'

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundred = Math.floor(n / 100)
  const rest = n % 100

  const parts: string[] = []
  if (crore) parts.push(`${twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (hundred) parts.push(`${ONES[hundred]} Hundred`)
  if (rest) parts.push(twoDigits(rest))
  let words = parts.join(' ')
  if (!words) words = 'Zero'
  let result = `${words} Rupees`
  if (paise > 0) {
    result += ` and ${twoDigits(paise)} ${paise === 1 ? 'Paise' : 'Paise'}`
  }
  if (amount < 0) result = 'Minus ' + result
  return result
}
