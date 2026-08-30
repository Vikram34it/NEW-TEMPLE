import type { Role } from './types'

export interface NavItem {
  path: string
  label: string
  roles: Role[]
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ path: '/', label: 'Dashboard', roles: ['admin', 'accountant', 'manager', 'viewer'] }],
  },
  {
    title: 'Finance',
    items: [
      { path: '/donations', label: 'Donations', roles: ['admin', 'accountant'] },
      { path: '/expenses', label: 'Expenses', roles: ['admin', 'accountant'] },
      { path: '/pending-payments', label: 'Pending Payments', roles: ['admin', 'accountant', 'manager'] },
      { path: '/accounts', label: 'Accounts', roles: ['admin', 'accountant', 'manager'] },
      { path: '/transactions', label: 'Transactions', roles: ['admin', 'accountant'] },
    ],
  },
  {
    title: 'Manage',
    items: [
      { path: '/people', label: 'People', roles: ['admin', 'accountant', 'manager', 'viewer'] },
      { path: '/vendors', label: 'Vendors', roles: ['admin', 'accountant', 'manager', 'viewer'] },
      { path: '/projects', label: 'Projects', roles: ['admin', 'accountant', 'manager', 'viewer'] },
    ],
  },
  {
    title: 'Donor Care',
    items: [
      { path: '/donor-care', label: 'Donor Care', roles: ['admin', 'accountant', 'manager'] },
    ],
  },
  {
    title: 'Community',
    items: [
      { path: '/announcements', label: 'Announcements', roles: ['admin', 'accountant', 'manager', 'viewer'] },
      { path: '/messages', label: 'Messages', roles: ['admin', 'accountant', 'manager', 'viewer'] },
      { path: '/events', label: 'Events', roles: ['admin', 'accountant', 'manager', 'viewer'] },
      { path: '/requests', label: 'Requests', roles: ['admin', 'accountant', 'manager', 'viewer'] },
    ],
  },
  {
    title: 'Insights',
    items: [
      { path: '/reports', label: 'Reports', roles: ['admin', 'accountant', 'manager', 'viewer'] },
    ],
  },
  {
    title: 'System',
    items: [
      { path: '/settings', label: 'Settings', roles: ['admin'] },
    ],
  },
]
