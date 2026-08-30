export const DONATION_CATEGORIES = [
  'General Donation',
  'Temple Construction',
  'Deity Worship',
  'Annadanam / Food Distribution',
  'Festivals',
  'Cow Protection',
  'Education',
  'Seva',
  'Other',
] as const

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other',
] as const

export const CONSTRUCTION_EXPENSE_CATEGORIES = [
  'Cement',
  'Steel',
  'Sand',
  'Bricks',
  'Labour',
  'Electrical Work',
  'Plumbing',
  'Painting',
  'Marble',
  'Woodwork',
  'Equipment',
  'Transportation',
] as const

export const OPERATIONS_EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Groceries',
  'Flowers',
  'Maintenance',
  'Salaries',
  'Travel',
  'Festivals',
  'Office Expenses',
] as const

export const PERSON_TYPES = [
  'Donor',
  'Devotee',
  'Volunteer',
  'Employee',
  'Construction Worker',
  'Contractor',
  'Vendor Contact',
  'Committee Member',
  'Other',
] as const

export const PROJECT_EXAMPLES = [
  'Main Temple Building',
  'Prayer Hall',
  'Kitchen',
  'Guest Rooms',
  'Electrical Work',
  'Plumbing',
  'Landscaping',
  'Parking',
] as const

export const PAYMENT_STATUSES = [
  'Pending',
  'Partially Paid',
  'Paid',
  'Overdue',
] as const

export const PROJECT_STATUSES = [
  'Not Started',
  'In Progress',
  'On Hold',
  'Completed',
] as const

export const EVENT_CATEGORIES = [
  'Festival',
  'Program',
  'Seva',
  'Meeting',
  'Other',
] as const

export const EVENT_STATUSES = [
  'Upcoming',
  'Completed',
  'Cancelled',
] as const

export const VOLUNTEER_ROLES = [
  'Volunteer',
  'Lead',
  'Coordinator',
] as const

export const REQUEST_TYPES = [
  'Prayer Request',
  'Seva Request',
  'Assistance',
  'Other',
] as const

export const REQUEST_STATUSES = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
] as const

export const COMMUNICATION_CHANNELS = [
  'WhatsApp',
  'Email',
  'SMS',
  'Phone Call',
  'In Person',
  'Post',
  'Other',
] as const

export const COMMUNICATION_TYPES = [
  'Thank You',
  'Receipt',
  'Festival Greeting',
  'Birthday Wish',
  'Anniversary Wish',
  'Invitation',
  'Update/News',
  'Re-engagement',
  'Follow-up',
  'Other',
] as const

export const COMMUNICATION_STATUSES = ['Sent', 'Done'] as const

export const PERSON_CHANNELS = [
  'WhatsApp',
  'Email',
  'SMS',
  'Call',
  'In Person',
  'None',
] as const

export interface MessageTemplate {
  id: string
  label: string
  subject: string
  body: string
}

// Ready-made donor messages. {Name}, {Amount}, {TempleName}, {City} and
// {Festival} are filled in from the selected donor + settings.
export const DONOR_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'thankyou',
    label: 'Thank You',
    subject: 'Thank you for your generous donation to {TempleName}',
    body: 'Dear {Name},\n\n' +
      'Thank you so much for your generous donation of ₹{Amount} to {TempleName}. Your kindness and support mean a great deal to our community and bring us one step closer to our vision.\n\n' +
      'May the Lord bless you and your family abundantly.\n\n' +
      'With sincere gratitude,\n{TempleName}',
  },
  {
    id: 'birthday',
    label: 'Birthday Wishes',
    subject: 'Happy Birthday from {TempleName}',
    body: 'Dear {Name},\n\n' +
      'Wishing you a very happy birthday! May this new year of your life bring health, happiness and abundant blessings. We are deeply grateful for your continued love and support for {TempleName}.\n\n' +
      'With love and blessings,\n{TempleName}',
  },
  {
    id: 'festival',
    label: 'Festival Greeting',
    subject: 'Festival greetings from {TempleName}',
    body: 'Dear {Name},\n\n' +
      'Wishing you and your family a joyous and blessed {Festival}. Thank you for being a cherished part of the {TempleName} family.\n\n' +
      'Hare Krishna!\n{TempleName}',
  },
  {
    id: 'reengage',
    label: 'We Miss You (Lapsed Donor)',
    subject: 'We miss you at {TempleName}',
    body: 'Dear {Name},\n\n' +
      'We have missed you at {TempleName}. Your generous support has been a great blessing to us, and we would be honoured to welcome you once again. There is always something happening - festivals, seva and programs for everyone.\n\n' +
      'We would love to see you soon.\n\n' +
      'With warm regards,\n{TempleName}',
  },
  {
    id: 'custom',
    label: 'Custom Message',
    subject: '',
    body: 'Dear {Name},\n\n',
  },
]
