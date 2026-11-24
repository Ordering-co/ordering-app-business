/**
 * Clock arithmetic in a store's time zone, with `Intl` only (no dayjs plugin: the app's dayjs has `utc` and
 * nothing else). Pure and tested: the store's state, the pause options and the product pauses all read it.
 */

export interface ZonedParts {
  year: number
  /** 1 to 12. */
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 (Sunday) to 6 (Saturday): the index of a business schedule's days. */
  weekday: number
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const formatters = new Map<string, Intl.DateTimeFormat>()

export const isValidTimeZone = (timeZone?: string | null): timeZone is string => {
  if (!timeZone || typeof timeZone !== 'string') return false
  try {
    return !!new Intl.DateTimeFormat('en-US', { timeZone })
  } catch (_) {
    return false
  }
}

/** The store's zone, or the device's when the store has none (or an unknown one). */
export const resolveTimeZone = (timeZone?: string | null): string => {
  if (isValidTimeZone(timeZone)) return timeZone
  try {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (isValidTimeZone(local)) return local
  } catch (_) {
    // fall through
  }
  return 'UTC'
}

const formatterFor = (timeZone: string) => {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

/** The wall clock of an instant in a zone. */
export const zonedParts = (date: Date, timeZone?: string | null): ZonedParts => {
  const parts = formatterFor(resolveTimeZone(timeZone)).formatToParts(date)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')) % 24,
    minute: Number(read('minute')),
    second: Number(read('second')),
    weekday: WEEKDAYS[read('weekday')] ?? 0,
  }
}

/** How far the zone is ahead of UTC at an instant, in ms. */
const offsetAt = (date: Date, timeZone: string): number => {
  const p = zonedParts(date, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000
}

/**
 * The instant at which a zone's wall clock reads a date and time. `day` may overflow the month (30 + 3 is
 * the 3rd of the next one) and `hour` / `minute` may overflow the day, as `Date.UTC` does.
 */
export const zonedDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone?: string | null,
): Date => {
  const zone = resolveTimeZone(timeZone)
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0)
  // The offset depends on the instant, which depends on the offset: two passes settle it, also across a change of hour.
  let instant = wall - offsetAt(new Date(wall), zone)
  instant = wall - offsetAt(new Date(instant), zone)
  return new Date(instant)
}

/** Calendar days from `now`'s day to `date`'s day in the zone (0 today, 1 tomorrow, -1 yesterday). */
export const dayDifference = (date: Date, now: Date, timeZone?: string | null): number => {
  const a = zonedParts(date, timeZone)
  const b = zonedParts(now, timeZone)
  return Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86400000)
}

/**
 * The store's zone as it is named to the person ("Chicago"), when the store's clock reads another time than the device's
 * (so a time written in the store's clock, "Until 7:52 PM", is not read as the device's); null when both clocks agree
 * now or the store has no zone. The times of the store (pauses, hours) are always its own clock, by design.
 */
export const storeZoneNote = (timeZone: string | null | undefined, now: Date = new Date()): string | null => {
  if (!isValidTimeZone(timeZone)) return null
  const store = zonedParts(now, timeZone)
  const device = zonedParts(now, null)
  if (store.hour === device.hour && store.minute === device.minute && store.day === device.day) return null
  return timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone
}

const pad = (value: number) => String(value).padStart(2, '0')

/** An instant as the API reads and writes dates: `YYYY-MM-DD HH:mm:ss`, in UTC. */
export const formatApiDateTime = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`

/** A date of the API (`YYYY-MM-DD HH:mm:ss` in UTC, or an ISO string) as an instant; null when it is not one. */
export const parseApiDateTime = (value: unknown): Date | null => {
  if (!value || typeof value !== 'string') return null
  const text = value.trim()
  const ms = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? Date.parse(`${text.replace(' ', 'T')}Z`)
    : Date.parse(text)
  return Number.isNaN(ms) ? null : new Date(ms)
}

export interface Lapse {
  open: { hour: number, minute: number }
  close: { hour: number, minute: number }
}

export interface ScheduleDay {
  enabled?: boolean
  lapses?: Lapse[]
}

const minutesOf = (time: { hour: number, minute: number }) => Number(time?.hour ?? 0) * 60 + Number(time?.minute ?? 0)

const lapsesOf = (schedule: ScheduleDay[] | null | undefined, weekday: number): Lapse[] => {
  const day = Array.isArray(schedule) ? schedule[weekday] : undefined
  if (!day || day.enabled === false || !Array.isArray(day.lapses)) return []
  return [...day.lapses].sort((a, b) => minutesOf(a.open) - minutesOf(b.open))
}

const hasSchedule = (schedule: unknown): schedule is ScheduleDay[] => Array.isArray(schedule) && schedule.length > 0

/** The lapse of the schedule that contains `now`: when it ends, or null when the store is closed by its schedule (or has none). */
export const currentClosing = (schedule: ScheduleDay[] | null | undefined, timeZone: string | null | undefined, now: Date): Date | null => {
  if (!hasSchedule(schedule)) return null
  const p = zonedParts(now, timeZone)
  const minute = p.hour * 60 + p.minute
  for (const lapse of lapsesOf(schedule, p.weekday)) {
    const from = minutesOf(lapse.open)
    let to = minutesOf(lapse.close)
    if (to <= from) to += 1440
    if (minute >= from && minute < to) return zonedDate(p.year, p.month, p.day, 0, to, timeZone)
  }
  // A lapse that crossed midnight yesterday still holds the early hours.
  for (const lapse of lapsesOf(schedule, (p.weekday + 6) % 7)) {
    const from = minutesOf(lapse.open)
    const to = minutesOf(lapse.close)
    if (to <= from && minute < to) return zonedDate(p.year, p.month, p.day, 0, to, timeZone)
  }
  return null
}

/** Whether the schedule says the store is open at `now` (false with no schedule). */
export const isOpenBySchedule = (schedule: ScheduleDay[] | null | undefined, timeZone: string | null | undefined, now: Date): boolean =>
  currentClosing(schedule, timeZone, now) !== null

/**
 * The next time the store opens after `now`: the start of the first lapse still to come, today or on one of the
 * next seven days. `fromTomorrow` skips what is left of today ("rest of today": the first opening of the next
 * day that has one). Null when the schedule has none.
 */
export const nextOpening = (
  schedule: ScheduleDay[] | null | undefined,
  timeZone: string | null | undefined,
  now: Date,
  { fromTomorrow = false }: { fromTomorrow?: boolean } = {},
): Date | null => {
  if (!hasSchedule(schedule)) return null
  const p = zonedParts(now, timeZone)
  for (let offset = fromTomorrow ? 1 : 0; offset <= 7; offset++) {
    for (const lapse of lapsesOf(schedule, (p.weekday + offset) % 7)) {
      const start = zonedDate(p.year, p.month, p.day + offset, 0, minutesOf(lapse.open), timeZone)
      if (start.getTime() > now.getTime()) return start
    }
  }
  return null
}
