import { useMemo } from 'react'
import dayjs from '@/utils/dayjs'
import { useUtils } from '@components'

/**
 * The app's one writer of a time of day and of a date (harmony H6): both follow the project's format
 * (`dates_general_format`, through `useUtils`: its `timeFormat` and `dateFormat`), so "12:38 PM" is written the same on
 * the order card, the details, the chat, the stores, the menu and the printers' failures. A store's own clock (its time
 * zone, not the phone's) is `{ zone }`.
 *
 *   const { time, date, dateTime } = useFormats()
 *   time(order.delivery_datetime)            // 12:38 PM
 *   time(store.closes_at, { zone: store.timezone })
 *
 * A string without a zone is the API's (`YYYY-MM-DD HH:mm:ss`, UTC); `{ utc: false }` reads it as the phone's local time.
 */
export type Moment = Date | number | string | null | undefined

export interface FormatOptions {
  /** An IANA time zone (a store's): the wall clock there. Without it, the phone's. */
  zone?: string | null
  /** A string is UTC (the API's dates; the default) or the phone's local time. */
  utc?: boolean
}

/** What a date or a time that cannot be read is written as. */
export const NO_TIME = ''

/**
 * 12 hour formats are written with a space before the AM/PM ("12:38 PM", as every board draws it), whatever the
 * project's `hh:mmA` says: the space is the app's, the digits and the 12 / 24 hours are the project's.
 */
export const SPACE_BEFORE_MERIDIEM = true
const spaced = (format: string) => (SPACE_BEFORE_MERIDIEM ? format.replace(/\s*([aA])$/, ' $1') : format)

const instantOf = (value: Moment, utcInput: boolean): Date | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value.trim())
    ? (utcInput ? dayjs.utc(value) : dayjs(value))
    : dayjs(value)
  return parsed.isValid() ? parsed.toDate() : null
}

/** The wall clock of `date` in `zone`, as a Date whose local fields read it (so dayjs can format it). */
const wallClock = (date: Date, zone?: string | null): Date => {
  if (!zone) return date
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    }).formatToParts(date)
    const part = (type: string) => Number(parts.find((candidate) => candidate.type === type)?.value ?? 0)
    return new Date(part('year'), part('month') - 1, part('day'), part('hour') % 24, part('minute'), part('second'))
  } catch (_) {
    return date // an unknown zone: the phone's clock
  }
}

/** What an order is for: its delivery time (the API's UTC one, else the business's local one), else when it was made. */
const orderMomentOf = (order: any): [Moment, boolean] =>
  order?.delivery_datetime_utc ? [order.delivery_datetime_utc, true]
    : order?.delivery_datetime ? [order.delivery_datetime, false]
      : [order?.created_at, true]

/** The formatters for a project's formats (pure: `useFormats` gives them the project's). */
export const makeFormats = ({ timeFormat = 'HH:mm', dateFormat = 'YYYY-MM-DD' }: { timeFormat?: string, dateFormat?: string } = {}) => {
  const clock = spaced(timeFormat)
  const write = (format: string) => (value: Moment, { zone, utc = true }: FormatOptions = {}) => {
    const instant = instantOf(value, utc)
    return instant ? dayjs(wallClock(instant, zone)).format(format) : NO_TIME
  }
  const time = write(clock)
  return {
    /** The time of day in the project's format: `12:38 PM` or `12:38`. */
    time,
    /**
     * The time of day an order is for: its delivery time (the API's `delivery_datetime_utc`, or `delivery_datetime`, the
     * business's local clock), else when it was made. `undefined` when the order says none.
     */
    orderTime: (order: any): string | undefined => {
      const [value, utc] = orderMomentOf(order)
      return time(value, { utc }) || undefined
    },
    /** The instant an order is for (see `orderTime`) as a Date, for what compares days; null when the order says none. */
    orderMoment: (order: any): Date | null => {
      const [value, utc] = orderMomentOf(order)
      return instantOf(value, utc)
    },
    /** The date in the project's format: `19/11/2026`. */
    date: write(dateFormat),
    /** Both: `19/11/2026 12:38 PM`. */
    dateTime: write(`${dateFormat} ${clock}`),
    timeFormat: clock,
    dateFormat,
  }
}

export const useFormats = () => {
  const [{ timeFormat, dateFormat }] = useUtils() as any
  return useMemo(() => makeFormats({ timeFormat, dateFormat }), [timeFormat, dateFormat])
}
