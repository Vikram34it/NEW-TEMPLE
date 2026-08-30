import type { ImportColumn } from '../components/BulkUploadModal'
import type ExcelJS from 'exceljs'

interface TemplateOptions {
  title: string
  columns: ImportColumn[]
  rowCount?: number
}

const MAX_ROWS = 200

// Loaded lazily (only when a user opens an Excel template/upload) so the bulky
// exceljs library does not inflate the app's main bundle.
async function loadExcelJS(): Promise<typeof ExcelJS> {
  return (await import('exceljs')).default
}

// The bundled exceljs types omit dataValidations even though it's fully
// supported at runtime; provide a minimal local type for the piece we use.
interface DataValidationEntry {
  type: 'list'
  formulae: string[]
  allowBlank?: boolean
  showErrorMessage?: boolean
  errorStyle?: string
  errorTitle?: string
  error?: string
}
type WorksheetWithValidations = ExcelJS.Worksheet & {
  dataValidations: {
    add: (range: string, rules: DataValidationEntry) => void
  }
}

// Builds an .xlsx template workbook with real dropdown (data-validation) cells
// for every column that has options, plus a filled example row so users can see
// the expected format. Dates are kept as text (dd-mm-yyyy) to avoid Excel
// date-serial confusion with the app's parser.
export async function buildXlsxTemplate({ title, columns, rowCount = MAX_ROWS }: TemplateOptions): Promise<ArrayBuffer> {
  void title
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Temple Management System'
  const ws = wb.addWorksheet('Template')

  const headers = columns.map((c) => c.header)
  const example = columns.map((c) => c.example ?? (c.options && c.options.length ? c.options[0] : ''))

  ws.addRow(headers)
  ws.addRow(example)

  // Pre-fill the remaining rows with a dd-mm-yyyy hint in date columns so the
  // dropdown ranges extend over them.
  let rows = 2
  while (rows < rowCount) {
    ws.addRow(columns.map((c) => (c.type === 'date' ? 'dd-mm-yyyy' : '')))
    rows++
  }

  // Style the header row.
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5' } }
  })
  ws.getRow(1).height = 20

  // Format date columns as text so entries parse reliably as dd-mm-yyyy.
  columns.forEach((col, i) => {
    if (col.type !== 'date') return
    ws.getColumn(i + 1).numFmt = '@'
  })

  // Dropdowns: option lists live on a dedicated hidden "Lists" sheet and are
  // referenced by range, so the dropdown is NOT limited to Excel's inline 255-char
  // list and every donor/category/payment method appears.
  const listsWs = wb.addWorksheet('Lists')
  listsWs.state = 'veryHidden'
  const validationsWs = ws as WorksheetWithValidations
  columns.forEach((col, i) => {
    if (!col.options || col.options.length === 0) return
    const unique = [...new Set(col.options)].filter((v) => String(v ?? '').trim() !== '')
    const startCell = 1
    unique.forEach((v, j) => {
      listsWs.getCell(startCell + j, i + 1).value = String(v)
    })
    const colLetter = colsLetter(i + 1)
    const listRef = `'Lists'!$${colLetter}$1:$${colLetter}${unique.length}`
    const dataRange = `${colLetter}2:${colLetter}${rowCount}`
    validationsWs.dataValidations.add(dataRange, {
      type: 'list',
      formulae: [`=${listRef}`],
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid value',
      error: 'Please choose a value from the drop-down list.',
    })
  })

  // Column widths for readability.
  columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(10, Math.min(28, (c.header || '').length + 4))
  })

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

// Return the column letters (1 -> A, 26 -> Z, 27 -> AA, ...) for a 1-based index.
function colsLetter(index: number): string {
  let n = index
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export async function downloadXlsxTemplate(options: TemplateOptions): Promise<void> {
  const data = await buildXlsxTemplate(options)
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${options.title.toLowerCase().replace(/\s+/g, '-')}-template.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Parse an uploaded Excel file back into rows of {key: string} values, mirroring
// the CSV path. Dates come back as text (dd-mm-yyyy) as authored in the template.
export async function parseXlsxFile(
  data: ArrayBuffer,
  columns: ImportColumn[]
): Promise<{ values: Record<string, string>; errors: string[] }[]> {
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(data)
  const ws = wb.worksheets[0]
  if (!ws) return []

  const headerRow = ws.getRow(1)
  const headerValues = (headerRow.values || []) as unknown
  const headerArr = Array.isArray(headerValues) ? (headerValues as unknown[]) : []
  const colIndex = columns.map((c) => {
    const idx = headerArr.findIndex((h, i) => i > 0 && String(h ?? '') === c.header)
    return idx
  })

  const rows: { values: Record<string, string>; errors: string[] }[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 2) return
    const values: Record<string, string> = {}
    columns.forEach((col, i) => {
      const idx = colIndex[i]
      const cell = idx > -1 ? row.getCell(idx + 1)?.value : undefined
      values[col.key] = formatCell(cell)
    })
    // Skip fully-empty rows.
    if (columns.every((c) => !values[c.key])) return
    rows.push({ values, errors: [] })
  })
  return rows
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return toDDMMYYYY(value)
  if (typeof value === 'object' && value !== null && 'text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).text ?? '')
  }
  if (typeof value === 'number') {
    // Avoid Date-serial numbers being misread as text when Excel stored a real date.
    return String(value)
  }
  return String(value)
}

function toDDMMYYYY(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}
