import dayjs from '@/utils/dayjs'
import { timeStateOf, type TimeState } from '../shared/orderStates'
import type { OrderSection } from '../OrdersOption/orderStatusGroups'

type Translate = (key: string, fallback?: string) => string

/** What the card's clock says: a glyph, a text and the state that colors it (none: muted). */
export interface OrderClock {
  icon: 'time-outline' | 'calendar-outline' | null
  text: string
  state: TimeState | null
  /** The seconds the text counts, when it counts (the card ticks only then). */
  ticking: boolean
}

/**
 * The one color rule of a counting clock (the card, the alert and the details read it): the API's time state says when an
 * order is late (`at_risk` warning, `delayed` danger); otherwise the clock takes the tone of what the order waits for.
 * A new order waits for the store to act, so its clock is warning (the mockups' amber), whatever the API's `in_time` says;
 * a preparing one that is in time is success; a ready one waiting for its customer is muted (null). An order that is past
 * its promised time (`late`: the clock reads "Late mm:ss") is danger whatever the API's state says (ANDROID2-B3: a late
 * clock drawn green, the API still saying `in_time`): the clock's own words and its color agree.
 */
export const clockToneOf = (section: OrderSection | null, timeStatus: string | null | undefined, late = false): TimeState | null => {
  if (late) return 'danger'
  const state = timeStateOf(timeStatus)
  if (state === 'danger' || state === 'warning') return state
  if (section === 'new') return 'warning'
  if (section === 'preparing') return state
  return null
}

/**
 * How long something has been counting, readable at any length: `mm:ss` under an hour (it ticks), `3h 12m` from one
 * hour, `2d 5h` from one day (minutes and hours only, since the seconds no longer say anything). The unit letters are
 * translated (`CLOCK_HOURS_MINUTES`, `CLOCK_DAYS_HOURS`); the details page writes the same form.
 */
export const formatClock = (totalSeconds: number, t?: Translate): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const two = (value: number) => (value < 10 ? `0${value}` : `${value}`)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const fill = (text: string, values: Record<string, number>) =>
    Object.entries(values).reduce((written, [name, value]) => written.replace(`_${name}_`, String(value)), text)
  // The two words are literal calls, so the catalog finds their keys (`CLOCK_DAYS_HOURS`, `CLOCK_HOURS_MINUTES`).
  const daysHours = t ? t('CLOCK_DAYS_HOURS', '_days_d _hours_h') : '_days_d _hours_h'
  const hoursMinutes = t ? t('CLOCK_HOURS_MINUTES', '_hours_h _minutes_m') : '_hours_h _minutes_m'
  if (days > 0) return fill(daysHours, { days, hours })
  if (hours > 0) return fill(hoursMinutes, { hours, minutes })
  return `${two(minutes)}:${two(seconds % 60)}`
}

/** A date the API wrote (`YYYY-MM-DD HH:mm:ss`, UTC) as a moment; undefined when it is missing or not a date. */
export const apiMoment = (value: unknown) => {
  if (typeof value !== 'string' || !value) return undefined
  const moment = dayjs.utc(value)
  return moment.isValid() ? moment : undefined
}

/** When the order reached a status, from the API's report (`reporting_data.at['status:N']`), if it has it. */
export const reportedAt = (order: any, status: number) => {
  const reporting = order?.reporting_data
  const at = reporting && typeof reporting === 'object' ? reporting.at : undefined
  return apiMoment(at && typeof at === 'object' ? at[`status:${status}`] : undefined)
}

/**
 * The whole seconds of a span in ms: the one rounding of every clock of an order (the card, the alert and the details
 * panel, T3-C1: the card rounded and the panel floored, so one read a second ahead of the other). Symmetric around 0,
 * so "Ready in" and "Late" of the same instant add up.
 */
export const secondsOf = (ms: number): number => Math.sign(ms) * Math.round(Math.abs(ms) / 1000)

/** Seconds from `from` to `now`; undefined without a `from`. */
const since = (from: ReturnType<typeof apiMoment>, now: number) => from ? Math.max(0, secondsOf(now - from.valueOf())) : undefined

/**
 * The text of an order card's clock for a section, at `now` (ms): what it counts depends on where the order is.
 * Anything the payload does not carry is not written (no clock rather than a made-up one).
 *
 * - New: `Waiting mm:ss` since the order was created; a pre-order (13): the scheduled time of day.
 * - Preparing: `Ready in mm:ss` (the time promised when it was accepted, less what has passed) or `Late mm:ss`;
 *   with no promise, `Preparing mm:ss` since it was accepted.
 * - Ready: `Waiting mm:ss` since it was ready.
 * - With driver: none. History: the time of day of the order.
 *
 * The state (and so the color) is the API's `time_status` when the order has one; otherwise the clock is muted.
 */
export const orderClock = (
  order: any,
  section: OrderSection | null,
  now: number,
  t: Translate,
  timeOfDay: (order: any) => string | undefined
): OrderClock | null => {
  if (!order || !section) return null
  const state = clockToneOf(section, order.time_status)

  if (section === 'new') {
    if (Number(order.status) === 13) {
      const scheduled = timeOfDay(order)
      return scheduled ? { icon: 'calendar-outline', text: scheduled, state: null, ticking: false } : null
    }
    const elapsed = since(apiMoment(order.created_at), now)
    return elapsed === undefined ? null : { icon: 'time-outline', text: t('ORDER_WAITING', 'Waiting _time_').replace('_time_', formatClock(elapsed, t)), state, ticking: true }
  }

  if (section === 'preparing') {
    const accepted = reportedAt(order, 7)
    if (!accepted) return null
    const promised = Number(order.prepared_in)
    if (Number.isFinite(promised) && promised > 0) {
      const left = secondsOf(accepted.valueOf() + promised * 60000 - now)
      const text = left >= 0
        ? t('ORDER_READY_IN', 'Ready in _time_').replace('_time_', formatClock(left, t))
        : t('ORDER_LATE_BY', 'Late _time_').replace('_time_', formatClock(-left, t))
      return { icon: 'time-outline', text, state: clockToneOf(section, order.time_status, left < 0), ticking: true }
    }
    const elapsed = since(accepted, now) ?? 0
    return { icon: 'time-outline', text: t('ORDER_PREPARING_FOR', 'Preparing _time_').replace('_time_', formatClock(elapsed, t)), state, ticking: true }
  }

  if (section === 'ready') {
    const elapsed = since(reportedAt(order, 4) ?? apiMoment(order.updated_at), now)
    return elapsed === undefined ? null : { icon: 'time-outline', text: t('ORDER_WAITING', 'Waiting _time_').replace('_time_', formatClock(elapsed, t)), state, ticking: true }
  }

  if (section === 'history') {
    const text = timeOfDay(order)
    return text ? { icon: null, text, state: null, ticking: false } : null
  }

  return null
}

/** What the order card's band writes at its end: one short sentence, and the state that colours the band. */
export interface BandTime {
  /** "Waiting 02:14", "Late 04:10 · due 12:30 PM", "Tomorrow · 1:30 PM". */
  text: string
  /** The time's state (none: the band keeps its status's colour). */
  state: TimeState | null
  /** The sentence counts seconds: the band ticks it. */
  ticking: boolean
}

/** What the card's time needs from `useFormats`. */
export interface CardFormats {
  time: (value: any, options?: any) => string
  date: (value: any, options?: any) => string
  orderMoment: (order: any) => Date | null
}

/** A space that never breaks a line: a sentence or a time of day moves to the next line whole ("Waiting 02:14", "12:30 PM"). */
const NO_BREAK = '\u00A0'
const whole = (text: string) => text.replace(/\s+/g, NO_BREAK)
/** The parts of the band's time, each one whole, a line able to break only between them. */
const parts = (...texts: Array<string | undefined>) => texts.filter(Boolean).map((text) => whole(text as string)).join(' · ')

/**
 * The day a moment falls on, written short: "today", "tomorrow", "yesterday", and the project's date from there (an order for
 * next week, an old one of History).
 */
export const dayWord = (moment: Date, now: number, t: Translate, writeDate: (value: Date) => string): string => {
  const days = dayjs(moment).startOf('day').diff(dayjs(now).startOf('day'), 'day')
  if (days === 0) return t('TODAY', 'Today').toLocaleLowerCase()
  if (days === 1) return t('CARD_DAY_TOMORROW', 'tomorrow')
  if (days === -1) return t('YESTERDAY', 'Yesterday').toLocaleLowerCase()
  return writeDate(moment)
}

/** A day word as the start of a sentence: "Tomorrow". */
const startCase = (text: string) => text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text

const isPreorder = (order: any) => Number(order?.status) === 13

/** Whether the card's time counts seconds (it needs the one-second ticker): only the sections that count do, and only with their data. */
export const cardTimeTicks = (order: any, section: OrderSection | null): boolean => {
  if (!order || !section) return false
  if (section === 'new') return !isPreorder(order) && !!apiMoment(order.created_at)
  if (section === 'preparing') return !!reportedAt(order, 7)
  if (section === 'ready') return !!(reportedAt(order, 4) ?? apiMoment(order.updated_at))
  return false
}

/**
 * The time at the end of an order card's band, for a section at `now` (ms): the sentences of `orderClock`, which the alert
 * and the details already write.
 *
 * - New: the time it has waited, "Waiting 02:14". A pre-order (13) writes the time it is for, "Tomorrow · 1:30 PM", whatever
 *   `absolute` says.
 * - Preparing: the time left to the promise, "Ready in 03:40", or "Late 04:12" past it; with no promise the time since it was
 *   accepted, "Preparing 03:40".
 * - Ready: the time it has waited since it was marked ready, "Waiting 05:12".
 * - History: the day and the time of day it is listed with, "Today · 11:42 AM".
 * - With the driver: none.
 *
 * With `absolute` the sentence also says the clock time it counts from or to: "Waiting 02:14 · 12:04 PM" (when it was placed),
 * "Ready in 03:40 · due 12:30 PM" and "Late 04:12 · due 12:30 PM" (the promised time), "Preparing 03:40 · 12:10 PM" (when it
 * was accepted), "Waiting 05:12 · 12:26 PM" (when it was marked ready). Anything the payload does not carry is not written.
 */
export const bandTime = (
  order: any,
  section: OrderSection | null,
  now: number,
  t: Translate,
  formats: CardFormats,
  absolute = false
): BandTime | null => {
  if (!order || !section) return null
  const state = clockToneOf(section, order.time_status)
  // The clock time a sentence counts from or to (only the time of day: the band has little room).
  const stamp = (moment: ReturnType<typeof apiMoment>) => absolute && moment ? formats.time(moment.toDate()) : undefined
  const counted = (sentence: string, seconds: number) => sentence.replace('_time_', formatClock(seconds, t))
  const listed = () => {
    const when = formats.orderMoment(order)
    if (!when) return null
    return { text: parts(startCase(dayWord(when, now, t, (value) => formats.date(value))), formats.time(when)), state: null, ticking: false }
  }

  if (section === 'new') {
    if (isPreorder(order)) return listed()
    const created = apiMoment(order.created_at)
    const elapsed = since(created, now)
    return elapsed === undefined ? null : { text: parts(counted(t('ORDER_WAITING', 'Waiting _time_'), elapsed), stamp(created)), state, ticking: true }
  }

  if (section === 'preparing') {
    const accepted = reportedAt(order, 7)
    if (!accepted) return null
    const promised = Number(order.prepared_in)
    if (Number.isFinite(promised) && promised > 0) {
      const due = accepted.add(promised, 'minute')
      const left = secondsOf(due.valueOf() - now)
      const dueTime = stamp(due)
      const dueText = dueTime ? t('CARD_TIME_DUE', 'due _time_').replace('_time_', dueTime) : undefined
      const sentence = left >= 0 ? counted(t('ORDER_READY_IN', 'Ready in _time_'), left) : counted(t('ORDER_LATE_BY', 'Late _time_'), -left)
      return { text: parts(sentence, dueText), state: clockToneOf(section, order.time_status, left < 0), ticking: true }
    }
    return { text: parts(counted(t('ORDER_PREPARING_FOR', 'Preparing _time_'), since(accepted, now) ?? 0), stamp(accepted)), state, ticking: true }
  }

  if (section === 'ready') {
    const readyAt = reportedAt(order, 4) ?? apiMoment(order.updated_at)
    const elapsed = since(readyAt, now)
    return elapsed === undefined ? null : { text: parts(counted(t('ORDER_WAITING', 'Waiting _time_'), elapsed), stamp(readyAt)), state, ticking: true }
  }

  if (section === 'history') return listed()

  return null
}
