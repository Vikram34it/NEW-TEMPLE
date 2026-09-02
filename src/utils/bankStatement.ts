import type ExcelJS from 'exceljs'
import { parseDateInput } from './helpers'

export interface BankStatementRow {
  date: string
  description: string
  reference: string
  amount: number
  type: 'income' | 'expense'
  /** Optional donor name supplied by the bank statement's "Donor Name" column. */
  donorName?: string
}

// Loaded lazily so the bulky exceljs library (already split into its own chunk
// by the existing template code) is only fetched when a statement is parsed.
async function loadExcelJS(): Promise<typeof ExcelJS> {
  return (await import('exceljs')).default
}

interface ColumnMap {
  date?: number
  description?: number
  credit?: number
  debit?: number
  amount?: number
  direction?: number
  balance?: number
  reference?: number
  donorName?: number
}

type ColumnRole = keyof ColumnMap

const COLUMN_PRIORITY: ColumnRole[] = ['date', 'credit', 'debit', 'amount', 'description', 'reference', 'direction', 'balance', 'donorName']

function scoreRole(role: ColumnRole, label: string): number {
  const t = String(label || '').trim()
  if (!t) return 0
  switch (role) {
    case 'date':
      return /value date|valued date|txn date|transaction date|posting date/i.test(t) ? 3 : /^date$/i.test(t) ? 2 : 0
    case 'credit':
      return /amount credited|credited amount|credit amount|deposits/i.test(t) ? 3 : /^credit$/i.test(t) || /^deposit/i.test(t) ? 2 : 0
    case 'debit':
      return /amount debited|debited amount|debit amount|withdrawals/i.test(t) ? 3 : /^debit$/i.test(t) || /^withdrawal/i.test(t) ? 2 : 0
    case 'amount':
      return /^transaction amount/i.test(t) || /^amount\s*(\(|$)/i.test(t) ? 2 : 0
    case 'description':
      return /narration|particulars|transaction details|description/i.test(t) ? 3 : /details|remarks|narrative|purpose/i.test(t) ? 2 : 0
    case 'reference':
      return /utr/i.test(t) ? 3 : /reference|cheque|txn\s*id|transaction\s*(id|no)|ref\s*(no|#|id)/i.test(t) ? 2 : 0
    case 'direction':
      return /^[cd]r\.?$/i.test(t) || /(?:cr|dr)\s*\/\s*(?:cr|dr)/i.test(t) || /debit\s*\/\s*credit|credit\s*\/\s*debit/i.test(t) ? 2 : 0
    case 'balance':
      return /^balance$/i.test(t) || /closing balance|available balance/i.test(t) ? 2 : 0
    case 'donorName':
      return /donor\s*name/i.test(t) ? 3 : 0
    default:
      return 0
  }
}

// Find the header row (usually a bank statement starts with a few title rows)
// and map its columns to roles. Returns null when the layout isn't recognised.
function pickColumns(labels: string[]): ColumnMap | null {
  const used = new Set<number>()
  const map: ColumnMap = {}
  for (const role of COLUMN_PRIORITY) {
    let best = -1
    let bestScore = 0
    labels.forEach((label, i) => {
      if (used.has(i)) return
      const s = scoreRole(role, label)
      if (s > bestScore) {
        bestScore = s
        best = i
      }
    })
    if (best >= 0 && bestScore > 0) {
      used.add(best)
      map[role] = best + 1
    }
  }
  if (!map.date) return null
  if (!map.credit && !map.debit && !map.amount) return null
  return map
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'richText' in (value as Record<string, unknown>)) {
    return ((value as { richText: { text: string }[] }).richText || []).map((t) => t.text).join('')
  }
  if (typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
    return String((value as { text: string }).text ?? '')
  }
  if (value instanceof Date) return ''
  return String(value)
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

function parseBankDate(raw: string): string {
  const t = String(raw || '').trim()
  if (!t) return ''
  const dashes = t.replace(/[/.]/g, '-')
  const iso = parseDateInput(dashes)
  if (iso) return iso
  const m = t.match(/(\d{1,2})[,.\-\s]*([A-Za-z]{3,})[,.\-\s]*(\d{2,4})/)
  if (m) {
    const month = MONTHS[m[2].toLowerCase()]
    if (month) {
      let y = +m[3]
      if (y < 100) y += 2000
      return parseDateInput(`${String(+m[1]).padStart(2, '0')}-${String(month).padStart(2, '0')}-${y}`)
    }
  }
  return ''
}

function parseCellDate(value: unknown): string {
  if (value instanceof Date) {
    const d = value as Date
    if (isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return parseBankDate(cellString(value))
}

// Handles ₹ 1,23,456.78, "(500)", "100.00 DR", "50 Cr", "-25" etc.
function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value
  if (value instanceof Date) return NaN
  const s = String(cellString(value) || '').trim()
  if (!s) return NaN
  const neg = (s.includes('(') && /\)\s*$/.test(s)) || /\bdr\b/i.test(s) || /^\s*-/.test(s)
  const pos = /\bcr\b/i.test(s)
  const digits = s.replace(/[₹,\s]/g, '').replace(/[^0-9.\-()]/g, '')
  const cleaned = digits.replace(/[()]/g, '')
  if (!cleaned) return NaN
  const n = Number(cleaned)
  if (isNaN(n)) return NaN
  if (neg) return -Math.abs(n)
  if (pos) return Math.abs(n)
  return n
}

// Parses an uploaded bank-statement workbook (.xlsx) into transaction rows.
// Credits become 'income', debits become 'expense'. The default account is
// applied later by the caller; here we only extract date/narration/amounts.
export async function parseBankStatementXlsx(data: ArrayBuffer): Promise<BankStatementRow[]> {
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(data)

  const result: BankStatementRow[] = []

  for (const ws of wb.worksheets) {
    const sheetResult = parseWorksheet(ws)
    if (sheetResult.length > 0) {
      result.push(...sheetResult)
      break
    }
  }
  return result
}

function parseWorksheet(ws: ExcelJS.Worksheet): BankStatementRow[] {
  const maxRows = Math.min(ws.rowCount, 4000)
  const maxHeaderScan = Math.min(maxRows, 25)

  for (let scan = 1; scan <= maxHeaderScan; scan++) {
    const headerRow = ws.getRow(scan)
    const labels: string[] = []
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      void colNumber
      labels.push(cellString(cell.value))
    })
    const map = pickColumns(labels)
    if (!map) continue

    const creditCol = map.credit !== undefined ? map.credit : undefined
    const debitCol = map.debit !== undefined ? map.debit : undefined

    const rows: BankStatementRow[] = []
    for (let r = scan + 1; r <= maxRows; r++) {
      const row = ws.getRow(r)
      const get = (col?: number): unknown => (col !== undefined ? row.getCell(col)?.value : undefined)

      const date = parseCellDate(get(map.date))
      if (!date) continue

      let description = cellString(get(map.description)).trim()
      const reference = cellString(get(map.reference)).trim()
      if (!description) description = reference

      const donorName = map.donorName !== undefined ? cellString(get(map.donorName)).trim() : ''

      let amount = 0
      let type: 'income' | 'expense' | null = null

      if (creditCol !== undefined || debitCol !== undefined) {
        const credit = creditCol !== undefined ? parseAmount(get(creditCol)) : NaN
        const debit = debitCol !== undefined ? parseAmount(get(debitCol)) : NaN
        if (credit > 0) {
          amount = credit
          type = 'income'
        } else if (debit > 0) {
          amount = debit
          type = 'expense'
        }
      } else if (map.amount !== undefined) {
        const raw = parseAmount(get(map.amount))
        if (isNaN(raw)) continue
        if (map.direction !== undefined) {
          const dir = cellString(get(map.direction)).trim().toLowerCase()
          if (dir.includes('cr')) {
            amount = Math.abs(raw)
            type = 'income'
          } else if (dir.includes('dr')) {
            amount = Math.abs(raw)
            type = 'expense'
          } else {
            amount = Math.abs(raw)
            type = raw >= 0 ? 'income' : 'expense'
          }
        } else {
          amount = Math.abs(raw)
          type = raw >= 0 ? 'income' : 'expense'
        }
      }

      if (type === null || amount <= 0) continue
      rows.push({ date, description, reference, amount, type, donorName })
    }
    if (rows.length > 0) return rows
  }
  return []
}