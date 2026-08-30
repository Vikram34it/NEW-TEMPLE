import { useRef, useState } from 'react'
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Button, Modal } from './ui'
import { parseDateInput } from '../utils/helpers'

export interface ImportColumn {
  header: string
  key: string
  required?: boolean
  type?: 'string' | 'number' | 'date' | 'stringArray' | 'boolean'
  options?: string[]
  example?: string
}

interface ParsedRow {
  values: Record<string, string>
  errors: string[]
}

function parseCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',' || ch === ';') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

function parseCSV(textValue: string): string[][] {
  const lines = textValue.split(/\r?\n/).filter((l) => l.trim() !== '')
  return lines.map(parseCSVLine)
}

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  columns: ImportColumn[]
  onImport: (rows: Array<Record<string, unknown>>) => Promise<string | null>
  onImported?: () => void
}

export function BulkUploadModal({ open, onClose, title, description, columns, onImport, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [importing, setImporting] = useState(false)

  const headers = columns.map((c) => c.header)

  const downloadTemplate = () => {
    const escape = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
    const headerLine = headers.map(escape).join(',')
    // Build a helpful example row from supplied examples/options so CSV editors
    // show the exact values to type (dropdown-like guidance).
    const exampleLine = columns
      .map((c) => c.example ?? (c.options && c.options.length ? c.options[0] : ''))
      .map(escape)
      .join(',')
    const content = [headerLine, exampleLine].join('\n')
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    setError('')
    setDone(false)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const matrix = parseCSV(text)
      if (matrix.length < 2) {
        setRows(null)
        setError('The file must contain a header row and at least one data row.')
        return
      }
      const headerRow = matrix[0].map((h) => h.trim().toLowerCase())
      const colIndex = columns.map((c) => headerRow.indexOf(c.header.toLowerCase()))

      const missingCols = columns
        .filter((_, i) => colIndex[i] === -1)
        .map((c) => c.header)
      if (missingCols.length > 0) {
        setRows(null)
        setError(`Missing required column(s): ${missingCols.join(', ')}`)
        return
      }

      const parsed = matrix.slice(1).map((cells) => {
        const values: Record<string, string> = {}
        columns.forEach((col, i) => {
          const idx = colIndex[i]
          values[col.key] = idx !== -1 && idx < cells.length ? cells[idx] : ''
        })
        const errors: string[] = []
        columns.forEach((col) => {
          const raw = values[col.key]
          if (col.required && !raw) errors.push(`${col.header} is required`)
          if (!raw) return
          if (col.type === 'number' && isNaN(Number(raw))) errors.push(`${col.header} must be a number`)
          if (col.type === 'date' && !parseDateInput(raw)) errors.push(`${col.header} must be a valid date (dd-mm-yyyy or yyyy-mm-dd)`)
          if (col.options && col.options.length > 0 && !col.options.includes(raw)) {
            errors.push(`${col.header} must be one of: ${col.options.join(', ')}`)
          }
        })
        return { values, errors }
      })
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  const rowErrors = rows ? rows.filter((r) => r.errors.length > 0).length : 0
  const validRows = rows ? rows.length - rowErrors : 0

  const handleImport = async () => {
    if (!rows) return
    if (rowErrors > 0) {
      setError('Fix the errors before importing.')
      return
    }
    const data = rows.map((r) => {
      const out: Record<string, unknown> = {}
      columns.forEach((col) => {
        const raw = r.values[col.key]
        if (col.type === 'number') out[col.key] = raw === '' ? undefined : Number(raw)
        else if (col.type === 'boolean') out[col.key] = raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes' || raw.toLowerCase() === 'active'
        else if (col.type === 'stringArray') out[col.key] = raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        else out[col.key] = raw
      })
      return out
    })
    setError('')
    setImporting(true)
    try {
      const err = await onImport(data)
      if (err) {
        setError(err)
        setImporting(false)
        return
      }
      setDone(true)
      if (onImported) onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setRows(null)
    setFileName('')
    setError('')
    setDone(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={title}
      wide
      footer={
        done ? (
          <Button onClick={() => { reset(); onClose() }}>Close</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !rows || rows.length === 0 || rowErrors > 0}>
              {importing ? 'Importing…' : `Import ${rows && validRows > 0 ? `${validRows}` : ''} record${rows && validRows === 1 ? '' : 's'}`}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="text-center py-10">
          <CheckCircle2 size={56} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-lg font-semibold text-slate-800">Import successful</p>
          <p className="text-sm text-slate-500 mt-1">{rows?.length} record(s) imported.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {description && <p className="text-sm text-slate-500">{description}</p>}

          {(columns.some((c) => c.options && c.options.length > 0)) && (
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
              <p className="font-semibold mb-1">Allowed values for dropdown columns:</p>
              <ul className="space-y-0.5">
                {columns.filter((c) => c.options && c.options.length > 0).map((c) => (
                  <li key={c.key}>
                    <span className="font-medium">{c.header}:</span>{' '}
                    {c.options!.slice(0, 12).join(', ')}{c.options!.length > 12 ? '…' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <label className="flex-1 min-w-[220px] cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-xl p-6 text-center transition-colors">
                <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">{fileName || 'Click to choose a CSV file'}</p>
                <p className="text-xs text-slate-400 mt-1">Supported: .csv (comma or semicolon separated)</p>
              </div>
            </label>
            <div className="flex flex-col justify-center gap-2">
              <Button variant="secondary" onClick={downloadTemplate}><Download size={15} /> Download template</Button>
              <p className="text-[11px] text-slate-400 max-w-[200px]">Use the template to fill your data, then upload it here.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {rows && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {validRows} valid
                </span>
                {rowErrors > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {rowErrors} with errors
                  </span>
                )}
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2 font-medium w-8">#</th>
                      {columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.header}</th>)}
                      <th className="px-3 py-2 font-medium w-40">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, ri) => (
                      <tr key={ri} className={r.errors.length ? 'bg-red-50/50' : ri % 2 ? 'bg-slate-50/50' : ''}>
                        <td className="px-3 py-2 text-slate-400">{ri + 1}</td>
                        {columns.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-slate-700 max-w-[180px] truncate">{r.values[c.key] || <span className="text-red-400">—</span>}</td>
                        ))}
                        <td className="px-3 py-2">
                          {r.errors.length ? (
                            <span className="flex items-center gap-1 text-red-600"><XCircle size={13} /> {r.errors.join('; ')}</span>
                          ) : (
                            <span className="text-emerald-600"><CheckCircle2 size={13} /></span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rows.length > 100 && (
                      <tr><td colSpan={columns.length + 2} className="px-3 py-2 text-slate-400 italic">... {rows.length - 100} more row(s) hidden in preview</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
