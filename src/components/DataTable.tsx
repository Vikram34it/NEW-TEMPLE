import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { Card } from './ui'
import { downloadCSV } from '../utils/helpers'

export interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  sortable?: boolean
  sortKey?: keyof T
  exportValue?: (row: T) => string | number
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  exportFilename?: string
  exportColumns?: { header: string; accessor: (row: T) => string | number }[]
  pageSize?: number
  actions?: (row: T) => ReactNode
  toolbar?: ReactNode
  emptyMessage?: string
  rowKey: (row: T) => string
}

export function DataTable<T>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = 'Search...',
  exportFilename,
  exportColumns,
  pageSize = 10,
  actions,
  toolbar,
  emptyMessage = 'No records found',
  rowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let rows = data
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((row) =>
        (Object.values(row as object)).some((v) => String(v ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable) return
    const key = col.sortKey || (col.accessor as keyof T)
    if (typeof key === 'string') {
      if (sortKey === key) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setSortKey(key)
        setSortDir('asc')
      }
    }
  }

  const handleExport = () => {
    if (!exportFilename) return
    const cols = exportColumns || []
    downloadCSV(
      exportFilename,
      cols.map((c) => c.header),
      filtered.map((row) => cols.map((c) => c.accessor(row)))
    )
  }

  return (
    <Card>
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
        {searchable && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>
        )}
        {toolbar}
        {exportFilename && exportColumns && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleHeaderClick(col)}
                  className={`px-4 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''
                  } ${col.className || ''}`}
                >
                  {col.header}
                  {col.sortable && <span className="ml-1 text-slate-300">⇅</span>}
                </th>
              ))}
              {actions && <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  {columns.map((col, i) => (
                    <td key={i} className={`px-4 py-2.5 text-slate-600 ${col.className || ''}`}>
                      {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as ReactNode)}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-2.5 text-right whitespace-nowrap">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 text-slate-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-600 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 text-slate-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
