import dayjs from '@/utils/dayjs'
import { formatClock, reportedAt, secondsOf } from '../PreviousOrders/orderTimes'

/**
 * The times the details write (when it was placed, accepted, ready; how long it has waited; how long the
 * preparation has left), all computed on the device from what the order carries: `created_at` and `updated_at`
 * (UTC, as every date of the API) and `history`, the log of the changes of the order.
 *
 * The moment an order reached a status is the API's `reporting_data.at['status:N']` when it has it (the card's own source,
 * `PreviousOrders/orderTimes.reportedAt`: to the second, one instant for the card and the details); otherwise the history, below.
 *
 * A history entry is `{ type, data: [{ attribute: 'status', old, new }], created_at }` and its `created_at` is
 * written in the business's own time zone, truncated to the minute, with no zone in it. The order's `updated_at`
 * is UTC. The two are the same moment for the order's last change, so their difference is the business's offset:
 * it is learned from there (to the quarter of an hour) and every history stamp is moved by it. When the offset
 * cannot be learned (no history, or the stamps do not agree) a status stamp is not used and the callers fall back
 * to `updated_at` (for the order's current status) and `created_at`. Minute precision, as the API gives.
 */

const MINUTE = 60 * 1000
const QUARTER = 15 * MINUTE
const MAX_OFFSET = 14 * 60 * MINUTE
/** How far the order's last change and its `updated_at` may be apart for the offset to be trusted. */
const TOLERANCE = 10 * MINUTE

/** A stamp of the API with no zone, read as if it were UTC (ms); null when it is not a date. */
export const stampMs = (value: unknown): number | null => {
  if (typeof value !== 'string' || !value) return null
  const parsed = dayjs.utc(value)
  return parsed.isValid() ? parsed.valueOf() : null
}

interface Stamp { status: number, at: number }

const asList = (value: unknown): any[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** The status changes of the order's history, oldest first, stamped as if UTC; and the stamp of its last entry. */
const readHistory = (order: any): { stamps: Stamp[], lastEntryAt: number | null } => {
  const stamps: Stamp[] = []
  let lastEntryAt: number | null = null
  for (const entry of asList(order?.history)) {
    const at = stampMs(entry?.created_at)
    if (at === null) continue
    if (lastEntryAt === null || at > lastEntryAt) lastEntryAt = at
    for (const change of asList(entry?.data)) {
      if (change?.attribute === 'status' && change?.new !== undefined && change?.new !== null) {
        stamps.push({ status: Number(change.new), at })
      }
    }
  }
  stamps.sort((a, b) => a.at - b.at)
  return { stamps, lastEntryAt }
}

/** The business's offset from UTC, learned from the last history entry and `updated_at`; null when it cannot be. */
export const historyOffset = (order: any): number | null => {
  const { lastEntryAt } = readHistory(order)
  const updated = stampMs(order?.updated_at)
  if (lastEntryAt === null || updated === null) return null
  const raw = updated - lastEntryAt
  const offset = Math.round(raw / QUARTER) * QUARTER
  if (Math.abs(offset) > MAX_OFFSET || Math.abs(raw - offset) > TOLERANCE) return null
  return offset
}

/** One moment of the order's life, in ms since the epoch. */
export interface StatusMoments {
  /** The last time the order reached a status: from the history, or (not `strict`) from `updated_at` for its current status. */
  at: (status: number, strict?: boolean) => number | null
  /** The first and last of several statuses (the first one found, in the order given). */
  firstOf: (statuses: number[]) => number | null
  /** The order was placed. */
  createdAt: number | null
}

export const statusMoments = (order: any): StatusMoments => {
  const { stamps } = readHistory(order)
  const offset = historyOffset(order)
  const updated = stampMs(order?.updated_at)
  const current = Number(order?.status)
  const at = (status: number, strict = false): number | null => {
    // The API's own report of the moment (to the second, as the card reads it) comes first: the card and the details of one
    // order count their clocks from the same instant. The history's stamps are truncated to the minute.
    const reported = reportedAt(order, status)
    if (reported) return reported.valueOf()
    const known = [...stamps].reverse().find((stamp) => stamp.status === status)
    if (known && offset !== null) return known.at + offset
    // No usable history: the order's own last change is the one of its current status.
    if (!strict && status === current && updated !== null) return updated
    return null
  }
  return {
    at,
    firstOf: (statuses) => {
      for (const status of statuses) {
        const moment = at(status)
        if (moment !== null) return moment
      }
      return null
    },
    createdAt: stampMs(order?.created_at)
  }
}

/** Minutes between two moments, at least 0, rounded. */
export const minutesBetween = (from: number | null, to: number | null): number | null =>
  from === null || to === null ? null : Math.max(0, Math.round((to - from) / MINUTE))

/**
 * A duration in ms as the orders list writes it (`formatClock`: `mm:ss`, `3h 12m` from an hour, `2d 5h` from a day), so a
 * card and the details of the same order never disagree. `t` translates its unit letters.
 */
export const clockText = (ms: number, t?: (key: string, fallback?: string) => string): string => formatClock(Math.abs(secondsOf(ms)), t)

export interface PrepClock {
  /** ms left to the promised time (negative: late). */
  remaining: number
  /** The promised moment. */
  promisedAt: number
  /** 0 to 1: how much of the preparation has gone. */
  elapsed: number
  late: boolean
}

/**
 * The preparation's clock of an accepted order: the promised moment is the moment it was accepted plus
 * `prepared_in` minutes. Null without a `prepared_in` or without a moment it was accepted at.
 */
export const prepClock = (order: any, now: number): PrepClock | null => {
  const total = Number(order?.prepared_in)
  if (!Number.isFinite(total) || total <= 0) return null
  const acceptedAt = statusMoments(order).at(7)
  if (acceptedAt === null) return null
  const promisedAt = acceptedAt + total * MINUTE
  const remaining = promisedAt - now
  return { remaining, promisedAt, elapsed: Math.max(0, Math.min(1, (now - acceptedAt) / (total * MINUTE))), late: secondsOf(remaining) < 0 }
}

export type TimelineKey = 'accepted' | 'ready' | 'driver_accepted' | 'picked_up_by_driver' | 'on_the_way' | 'picked_up' | 'delivered'

export interface TimelineStep {
  key: TimelineKey
  /** Moment it happened; null for the step the order is on now. */
  at: number | null
  current?: boolean
}

const STEP_OF_STATUS: Record<number, TimelineKey> = {
  7: 'accepted',
  4: 'ready',
  8: 'driver_accepted',
  9: 'picked_up_by_driver',
  15: 'picked_up',
  1: 'delivered',
  11: 'delivered'
}

/**
 * The steps of the order's life from its history, oldest first, each once (the last time it happened), and, while
 * a driver has the order, the step it is on. Empty when the history has nothing usable.
 */
export const timelineSteps = (order: any): TimelineStep[] => {
  const moments = statusMoments(order)
  const steps: TimelineStep[] = []
  for (const status of [7, 4, 8, 9, 15, 1, 11]) {
    // Only what the history names is a step (`updated_at` stands in for a moment, never for a step).
    const at = moments.at(status, true)
    if (at !== null) steps.push({ key: STEP_OF_STATUS[status], at })
  }
  steps.sort((a, b) => (a.at as number) - (b.at as number))
  // One step per key (two delivered statuses count once).
  const unique = steps.filter((step, index) => steps.findIndex((other) => other.key === step.key) === index)
  // No history, no timeline (the step a driver is on is only an addition to what the history says).
  if (unique.length > 0 && Number(order?.status) === 9 && !unique.some((step) => step.key === 'on_the_way')) {
    unique.push({ key: 'on_the_way', at: null, current: true })
  }
  return unique
}
