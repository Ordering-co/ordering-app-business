import { formatApiDateTime, nextOpening } from './zonedTime'

/**
 * The durations a store (or a product) can be paused for, and what each one sends:
 *
 * - a few minutes or an hour: `snooze_until` = now + N, as UTC `YYYY-MM-DD HH:mm:ss` (the API runs on UTC and
 *   reopens it by itself when the date comes);
 * - the rest of today: `snooze_until` = the first opening of the next day the schedule has one (hidden when the
 *   schedule has none);
 * - until it is turned back on: a store is turned off (`enabled: false`, today's switch, no date); a product too.
 *
 * A store is `enabled` already, so a timed pause sends only `snooze_until`. A product that was switched off is
 * `enabled: false`: a timed pause turns it on with the date (`enabled: true`) so it comes back at that time.
 */
export type PauseOptionKey = 'minutes_15' | 'minutes_30' | 'hour_1' | 'hours_2' | 'rest_of_day' | 'until_resumed'

export interface PauseOption {
  key: PauseOptionKey
  /** When it ends (the store's own clock is used to show it); null for "until I turn it back on". */
  until: Date | null
  /** What to send to `updateBusiness` / the product update. */
  changes: Record<string, any>
}

export type PauseKind = 'store' | 'product'

interface Source {
  timezone?: string | null
  schedule?: any
}

const TIMED: Array<{ key: PauseOptionKey, minutes: number, stores: boolean }> = [
  { key: 'minutes_15', minutes: 15, stores: true },
  { key: 'minutes_30', minutes: 30, stores: true },
  { key: 'hour_1', minutes: 60, stores: true },
  { key: 'hours_2', minutes: 120, stores: false },
]

export const getPauseOptions = (source: Source | null | undefined, kind: PauseKind = 'store', now: Date = new Date()): PauseOption[] => {
  const timed = (until: Date) => (kind === 'product'
    ? { enabled: true, snooze_until: formatApiDateTime(until) }
    : { snooze_until: formatApiDateTime(until) })

  const options: PauseOption[] = TIMED
    .filter((item) => kind === 'product' || item.stores)
    .map(({ key, minutes }) => {
      const until = new Date(now.getTime() + minutes * 60000)
      return { key, until, changes: timed(until) }
    })

  const reopening = nextOpening(source?.schedule, source?.timezone, now, { fromTomorrow: true })
  if (reopening) options.push({ key: 'rest_of_day', until: reopening, changes: timed(reopening) })

  options.push({
    key: 'until_resumed',
    until: null,
    changes: kind === 'product' ? { enabled: false, snooze_until: '' } : { enabled: false },
  })
  return options
}
