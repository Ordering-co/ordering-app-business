import { currentClosing, isOpenBySchedule, nextOpening, parseApiDateTime } from './zonedTime'

/**
 * What a store is doing, from four fields of the API: `enabled`, `open`, `schedule` / `timezone` and `snooze_until`.
 * The API's `open` is computed from the schedule only (it ignores the other two), so the app combines them:
 *
 * - `off`: orders turned off (`enabled` is false), whatever the schedule says.
 * - `paused`: `snooze_until` is still ahead; the store reopens by itself then.
 * - `open`: accepting orders now (the schedule's `open`), with the time its lapse ends when it is known.
 * - `closed`: closed by its schedule, with the next opening when it is known.
 */
export type StoreStatus =
  | { kind: 'open', closesAt: Date | null }
  | { kind: 'closed', opensAt: Date | null }
  | { kind: 'paused', until: Date }
  | { kind: 'off' }

export interface StoreLike {
  enabled?: boolean | number | string | null
  open?: boolean | number | string | null
  schedule?: any
  timezone?: string | null
  snooze_until?: string | null
}

const isFalse = (value: unknown) => value === false || value === 0 || value === '0'
const isTrue = (value: unknown) => value === true || value === 1 || value === '1'

export const getStoreStatus = (business: StoreLike | null | undefined, now: Date = new Date()): StoreStatus => {
  if (!business) return { kind: 'off' }
  if (isFalse(business.enabled)) return { kind: 'off' }

  const until = parseApiDateTime(business.snooze_until)
  if (until && until.getTime() > now.getTime()) return { kind: 'paused', until }

  // `open` may not have been asked for: the schedule answers then (no schedule: the store counts as open).
  const hasSchedule = Array.isArray(business.schedule) && business.schedule.length > 0
  const open = business.open === undefined || business.open === null
    ? (hasSchedule ? isOpenBySchedule(business.schedule, business.timezone, now) : true)
    : isTrue(business.open)

  if (open) return { kind: 'open', closesAt: currentClosing(business.schedule, business.timezone, now) }
  return { kind: 'closed', opensAt: nextOpening(business.schedule, business.timezone, now) }
}

/** Whether a store can be paused: it is accepting orders (open now or closed by schedule, not paused, not off). */
export const canPause = (status: StoreStatus): boolean => status.kind === 'open' || status.kind === 'closed'
