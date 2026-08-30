export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
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

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
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
