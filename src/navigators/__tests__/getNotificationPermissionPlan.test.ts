import {
  getNotificationPermissionPlan,
  REOFFER_AFTER_MS,
  toNotificationPermission
} from '../getNotificationPermissionPlan'

const NOW = 1_800_000_000_000
const plan = (overrides: Record<string, unknown> = {}) =>
  getNotificationPermissionPlan({ auth: true, loaded: true, status: 'denied', dismissedAt: null, now: NOW, ...overrides })

describe('getNotificationPermissionPlan (the explainer sheet of the notification permission)', () => {
  it('shows after the first sign-in when the permission is denied or not asked yet', () => {
    expect(plan({ status: 'denied' })).toEqual({ show: true, blocked: false })
  })

  it('offers the settings when the permission is blocked (the system will not prompt any more)', () => {
    expect(plan({ status: 'blocked' })).toEqual({ show: true, blocked: true })
  })

  it('does not show when the permission is on, or there is nothing to ask', () => {
    expect(plan({ status: 'granted' }).show).toBe(false)
    expect(plan({ status: 'limited' }).show).toBe(false)
    expect(plan({ status: 'unavailable' }).show).toBe(false)
  })

  it('does not show before the system has been asked, before the app has loaded or without a session', () => {
    expect(plan({ status: null }).show).toBe(false)
    expect(plan({ loaded: false }).show).toBe(false)
    expect(plan({ auth: false }).show).toBe(false)
  })

  it('waits a week after "Not now", then offers it again', () => {
    expect(REOFFER_AFTER_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(plan({ dismissedAt: NOW - 1000 }).show).toBe(false)
    expect(plan({ dismissedAt: NOW - REOFFER_AFTER_MS + 1 }).show).toBe(false)
    expect(plan({ dismissedAt: NOW - REOFFER_AFTER_MS }).show).toBe(true)
    expect(plan({ dismissedAt: NOW - REOFFER_AFTER_MS, status: 'blocked' })).toEqual({ show: true, blocked: true })
  })

  it('does not trust a "Not now" stamped in the future (a clock that moved back): it offers again', () => {
    expect(plan({ dismissedAt: NOW + 5 * REOFFER_AFTER_MS }).show).toBe(true)
  })
})

describe('toNotificationPermission', () => {
  it('simplifies the system\'s answer', () => {
    expect(toNotificationPermission('granted')).toBe('granted')
    expect(toNotificationPermission('limited')).toBe('granted')
    expect(toNotificationPermission('blocked')).toBe('blocked')
    expect(toNotificationPermission('unavailable')).toBe('unavailable')
    expect(toNotificationPermission('denied')).toBe('denied')
    expect(toNotificationPermission(undefined)).toBe('denied')
  })
})
