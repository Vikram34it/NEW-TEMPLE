import ExcelJS from 'exceljs'

async function main() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Statement')
  ws.addRow(['No.', 'Transaction ID', 'Value Date', 'Txn Posted Date', 'ChequeNo.', 'Description', 'Cr/Dr', 'Transaction Amount(INR)', 'Available Balance(INR)', '', 'Donor Name', 'Remark'])
  ws.addRow([1, 'S3529269', '01/04/2026', '01/04/2026', '-', 'MMT/IMPS/609106990550/books/BBT/HDFC0000321', 'DR', 567771.52, 557771.52, '', '', 'Rent paid'])
  ws.addRow([2, 'S19799984', '02/04/2026', '02/04/2026', '-', 'UPI/vikram.malepat/Donation b', 'CR', 10000.75, 567771.52, '', 'Malepati Vikram Kumar', ''])

  const buf = await wb.xlsx.writeBuffer()

  const wb2 = new ExcelJS.Workbook()
  await wb2.xlsx.load(buf)
  const sh = wb2.worksheets[0]

  function cellString(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object' && 'richText' in value) return (value.richText || []).map((t) => t.text).join('')
    if (typeof value === 'object' && 'text' in value) return String(value.text ?? '')
    if (value instanceof Date) return ''
    return String(value)
  }
  function parseAmount(value) {
    if (typeof value === 'number') return value
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

  for (let r = 2; r <= 3; r++) {
    const row = sh.getRow(r)
    const dir = cellString(row.getCell(7).value).trim().toLowerCase()
    const raw = parseAmount(row.getCell(8).value)
    const amount = Math.abs(raw)
    const type = dir.includes('cr') ? 'income' : 'expense'
    console.log(JSON.stringify({
      txnID: cellString(row.getCell(2).value),
      rawCellValue: row.getCell(8).value,
      dir,
      amount,
      type,
      donor: cellString(row.getCell(11).value),
      remark: cellString(row.getCell(12).value),
    }))
  }
}
main()