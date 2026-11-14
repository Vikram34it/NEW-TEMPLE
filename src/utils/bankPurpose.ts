import { CONSTRUCTION_EXPENSE_CATEGORIES, DONATION_CATEGORIES, OPERATIONS_EXPENSE_CATEGORIES } from './constants'

export function bankPurpose(direction: 'income' | 'expense', purpose: string, narration: string, hasDonor: boolean): string {
  const hint = (purpose + ' ' + narration).toLowerCase()
  const supplied = purpose.trim().toLowerCase()
  const categories = direction === 'income' ? DONATION_CATEGORIES : [...CONSTRUCTION_EXPENSE_CATEGORIES, ...OPERATIONS_EXPENSE_CATEGORIES]
  const exact = categories.find((category) => category.toLowerCase() === supplied)
  if (exact) return exact
  const bankHint = supplied || narration.toLowerCase()
  if (/\bfd\b|fixed\s*deposit/.test(bankHint)) return direction === 'income' ? 'Fixed Deposit Closure' : 'Fixed Deposit'
  if (direction === 'income' && /\b(?:bank|sb|savings)\s+inter(?:e)?set\b|\b(?:bank|sb|savings)\s+interest\b|\binterest (?:paid|credit|on)\b/.test(bankHint)) return 'Bank Interest'
  if (/\b(?:own account|internal transfer|self transfer|inter.?account)\b/.test(bankHint)) return 'Internal Transfer'
  if (/\b(?:land(?:\s+(?:purchase|fund|registration))?|bhoomi|plot purchase)\b/.test(purpose.toLowerCase())) return 'Land Purchase'
  if (/\b(?:temple construction|mandir construction|construction fund|construction)\b/.test(purpose.toLowerCase())) return 'Temple Construction'
  if (direction === 'expense') {
    if (/\b(?:bank charges|service charge|sms charge)\b/.test(hint)) return 'Bank Charges'
    return 'Unclassified Expense'
  }
  if (hasDonor && !purpose.trim()) return 'General Donation'
  return 'Unclassified Credit'
}

export function isBankOnlyCategory(category: string): boolean {
  return ['Fixed Deposit Closure', 'Bank Interest', 'Internal Transfer', 'Unclassified Credit', 'Other Bank Credit'].includes(category)
}
