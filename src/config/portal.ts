export const isCollectorPortal = typeof document !== 'undefined' &&
  document.documentElement.dataset.portal === 'collector'

export const sessionKeyPrefix = isCollectorPortal ? 'temple_collector_session' : 'temple_session'
