import dayjs from '@/utils/dayjs'
import { bandTime, cardTimeTicks, clockToneOf, dayWord, formatClock, orderClock, reportedAt } from '../orderTimes'
import { makeOrder } from '../../OrdersOption/__tests__/fixtures'
import { identity as t } from '../../OrdersOption/__tests__/fixtures'

const at = (value: string) => Date.parse(`${value.replace(' ', 'T')}Z`)
const timeOfDay = (order: any) => order.delivery_datetime_utc ? '6:30 PM' : undefined

describe('formatClock', () => {
  it('writes minutes and seconds under an hour', () => {
    expect(formatClock(42)).toBe('00:42')
    expect(formatClock(135)).toBe('02:15')
    expect(formatClock(3599)).toBe('59:59')
    expect(formatClock(-5)).toBe('00:00')
  })

  it('writes hours and minutes from one hour, and days and hours from one day (never hours that grow without limit)', () => {
    expect(formatClock(3600)).toBe('1h 0m')
    expect(formatClock(3725)).toBe('1h 2m')
    expect(formatClock(86399)).toBe('23h 59m')
    expect(formatClock(86400)).toBe('1d 0h')
    // The old "213:23:33" of an old order.
    expect(formatClock(213 * 3600 + 23 * 60 + 33)).toBe('8d 21h')
  })

  it('translates the units', () => {
    const t = (key: string, fallback?: string) => key === 'CLOCK_HOURS_MINUTES' ? '_hours_ h _minutes_ min' : (fallback ?? key)
    expect(formatClock(3725, t)).toBe('1 h 2 min')
  })
})

describe('orderClock', () => {
  it('counts what a new order has waited since it was created', () => {
    const clock = orderClock(makeOrder({ created_at: '2026-11-19 12:00:00' }), 'new', at('2026-11-19 12:00:42'), t, timeOfDay)
    expect(clock).toMatchObject({ text: 'Waiting 00:42', icon: 'time-outline', state: 'warning', ticking: true })
  })

  it('writes nothing for an order whose payload has no creation time', () => {
    expect(orderClock(makeOrder({ created_at: undefined }), 'new', Date.now(), t, timeOfDay)).toBeNull()
  })

  it('writes the scheduled time of a pre-order, without ticking', () => {
    const order = makeOrder({ status: 13, delivery_datetime_utc: '2026-11-19 23:30:00' })
    expect(orderClock(order, 'new', Date.now(), t, timeOfDay)).toEqual({ icon: 'calendar-outline', text: '6:30 PM', state: null, ticking: false })
  })

  it('colors the clock with the API\'s time state when the order has one', () => {
    const order = makeOrder({ time_status: 'at_risk' })
    expect(orderClock(order, 'new', at('2026-11-19 12:01:00'), t, timeOfDay)?.state).toBe('warning')
    expect(orderClock({ ...order, time_status: 'delayed' }, 'new', at('2026-11-19 12:01:00'), t, timeOfDay)?.state).toBe('danger')
    // A new order waits for the store: warning even when the API says in time (the one rule, `clockToneOf`).
    expect(orderClock({ ...order, time_status: 'in_time' }, 'new', at('2026-11-19 12:01:00'), t, timeOfDay)?.state).toBe('warning')
  })

  const preparing = (extra: Record<string, any> = {}) => makeOrder({ status: 7, prepared_in: 20, reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } }, ...extra })

  it('counts down the time promised when it was accepted, then counts the delay', () => {
    expect(orderClock(preparing(), 'preparing', at('2026-11-19 12:16:20'), t, timeOfDay)?.text).toBe('Ready in 03:40')
    expect(orderClock(preparing(), 'preparing', at('2026-11-19 12:22:10'), t, timeOfDay)?.text).toBe('Late 02:10')
  })

  it('draws a late clock in danger even when the API says the order is in time (ANDROID2-B3)', () => {
    const inTime = { time_status: 'in_time' }
    expect(orderClock(preparing(inTime), 'preparing', at('2026-11-19 12:16:20'), t, timeOfDay)?.state).toBe('success')
    const late = orderClock(preparing(inTime), 'preparing', at('2026-11-19 12:22:10'), t, timeOfDay)
    expect(late?.text).toBe('Late 02:10')
    expect(late?.state).toBe('danger')
    expect(orderClock(preparing({ time_status: null }), 'preparing', at('2026-11-19 12:22:10'), t, timeOfDay)?.state).toBe('danger')
  })

  it('counts what has passed when no time was promised and writes nothing without the accepted time', () => {
    expect(orderClock(preparing({ prepared_in: null }), 'preparing', at('2026-11-19 12:05:00'), t, timeOfDay)?.text).toBe('Preparing 05:00')
    expect(orderClock(preparing({ reporting_data: undefined }), 'preparing', Date.now(), t, timeOfDay)).toBeNull()
  })

  it('counts how long a ready order has waited, from the report or the last update', () => {
    const ready = makeOrder({ status: 4, reporting_data: { at: { 'status:4': '2026-11-19 12:00:00' } } })
    expect(orderClock(ready, 'ready', at('2026-11-19 12:04:10'), t, timeOfDay)?.text).toBe('Waiting 04:10')
    expect(orderClock(makeOrder({ status: 4, updated_at: '2026-11-19 12:00:00' }), 'ready', at('2026-11-19 12:01:00'), t, timeOfDay)?.text).toBe('Waiting 01:00')
    expect(orderClock(makeOrder({ status: 4 }), 'ready', Date.now(), t, timeOfDay)).toBeNull()
  })

  it('has no clock with the driver and a time of day in History', () => {
    expect(orderClock(makeOrder({ status: 23 }), 'with_driver', Date.now(), t, timeOfDay)).toBeNull()
    expect(orderClock(makeOrder({ status: 1, delivery_datetime_utc: '2026-11-19 23:30:00' }), 'history', Date.now(), t, timeOfDay)).toEqual({ icon: null, text: '6:30 PM', state: null, ticking: false })
  })

  it('reads the report only when it is an object of strings', () => {
    expect(reportedAt(makeOrder({ reporting_data: 'text' }), 7)).toBeUndefined()
    expect(reportedAt(makeOrder({ reporting_data: { at: { 'status:7': 'not a date' } } }), 7)).toBeUndefined()
  })
})

describe('orderClock with an old order', () => {
  it('reads Waiting 8d 21h, not Waiting 213:23:33', () => {
    const clock = orderClock(makeOrder({ created_at: '2026-11-10 12:00:00' }), 'new', at('2026-11-19 09:23:33'), t, timeOfDay)
    expect(clock?.text).toBe('Waiting 8d 21h')
  })
})

describe('clockToneOf (one color rule for the card, the alert and the details)', () => {
  it('late states win, then what the order waits for', () => {
    expect(clockToneOf('new', 'delayed')).toBe('danger')
    expect(clockToneOf('ready', 'at_risk')).toBe('warning')
    expect(clockToneOf('new', 'in_time')).toBe('warning')
    expect(clockToneOf('new', null)).toBe('warning')
    expect(clockToneOf('preparing', 'in_time')).toBe('success')
    expect(clockToneOf('preparing', null)).toBeNull()
    expect(clockToneOf('ready', 'in_time')).toBeNull()
    // past the promised time: danger, whatever the API's state says
    expect(clockToneOf('preparing', 'in_time', true)).toBe('danger')
    expect(clockToneOf('preparing', null, true)).toBe('danger')
  })
})

// The band's time: one sentence, per stage.
describe('bandTime', () => {
  const NBSP = '\u00A0'
  // Times written in UTC so the tests do not depend on the machine's zone.
  const write = (format: string) => (value: any) => dayjs.utc(value).format(format)
  const formats = {
    time: write('h:mm A'),
    date: write('DD/MM/YYYY'),
    orderMoment: (order: any) => order?.delivery_datetime_utc ? dayjs.utc(order.delivery_datetime_utc).toDate() : null
  }
  const now = at('2026-11-19 12:10:00')
  const pending = makeOrder({ status: 0, created_at: '2026-11-19 12:07:46', time_status: 'in_time' })
  const preparing = (extra: Record<string, any> = {}) => makeOrder({
    status: 7, prepared_in: 20, time_status: 'in_time', reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } }, ...extra
  })

  it('a waiting order: "Waiting" and the time it has waited, in the warning tone', () => {
    expect(bandTime(pending, 'new', now, t, formats)).toEqual({ text: `Waiting${NBSP}02:14`, state: 'warning', ticking: true })
  })

  it('a waiting order the API says is delayed is in the danger tone, one at risk in the warning tone', () => {
    expect(bandTime({ ...pending, time_status: 'delayed' }, 'new', now, t, formats)?.state).toBe('danger')
    expect(bandTime({ ...pending, time_status: 'at_risk' }, 'new', now, t, formats)?.state).toBe('warning')
  })

  it('a preorder writes its day and the time it is for, in no tone, whatever the absolute key says', () => {
    const order = makeOrder({ status: 13, delivery_datetime_utc: '2026-11-20 13:30:00', created_at: '2026-11-19 12:00:00' })
    const plain = bandTime(order, 'new', now, t, formats, false)
    // The day word starts the sentence, so its first letter is a capital.
    expect(plain).toEqual({ text: `Tomorrow · 1:30${NBSP}PM`, state: null, ticking: false })
    expect(bandTime(order, 'new', now, t, formats, true)).toEqual(plain)
    expect(cardTimeTicks(order, 'new')).toBe(false)
    // Further away: the project's date.
    expect(bandTime(makeOrder({ status: 13, delivery_datetime_utc: '2026-11-25 13:30:00' }), 'new', now, t, formats)?.text).toBe(`25/11/2026 · 1:30${NBSP}PM`)
    // Today.
    expect(bandTime(makeOrder({ status: 13, delivery_datetime_utc: '2026-11-19 15:00:00' }), 'new', now, t, formats)?.text).toBe(`Today · 3:00${NBSP}PM`)
  })

  it('a preorder without a scheduled time writes nothing', () => {
    expect(bandTime(makeOrder({ status: 13 }), 'new', now, t, formats)).toBeNull()
  })

  it('a preparing order: "Ready in" the time left to its promise, then "Late" the time past it', () => {
    expect(bandTime(preparing(), 'preparing', now, t, formats)).toEqual({ text: `Ready${NBSP}in${NBSP}10:00`, state: 'success', ticking: true })
    const late = bandTime(preparing(), 'preparing', at('2026-11-19 12:24:12'), t, formats)
    expect(late).toEqual({ text: `Late${NBSP}04:12`, state: 'danger', ticking: true })
  })

  it('a late preparing order is in the danger tone even when the API says it is in time or says nothing', () => {
    expect(bandTime(preparing({ time_status: null }), 'preparing', at('2026-11-19 12:24:12'), t, formats)?.state).toBe('danger')
    expect(bandTime(preparing({ time_status: 'at_risk' }), 'preparing', now, t, formats)?.state).toBe('warning')
  })

  it('a preparing order with no promise counts from its acceptance: "Preparing", never "Ready in"', () => {
    const noPromise = bandTime(preparing({ prepared_in: undefined }), 'preparing', now, t, formats)
    expect(noPromise).toMatchObject({ text: `Preparing${NBSP}10:00`, ticking: true })
    expect(noPromise?.text).not.toMatch(/Ready/)
  })

  it('a ready order: "Waiting" and the time since it was marked ready', () => {
    const order = makeOrder({ status: 4, time_status: 'in_time', reporting_data: { at: { 'status:4': '2026-11-19 12:04:48' } } })
    expect(bandTime(order, 'ready', now, t, formats)).toEqual({ text: `Waiting${NBSP}05:12`, state: null, ticking: true })
  })

  it('a ready order falls back on its last update, and writes nothing without either', () => {
    expect(bandTime(makeOrder({ status: 4, updated_at: '2026-11-19 12:09:00' }), 'ready', now, t, formats)?.text).toBe(`Waiting${NBSP}01:00`)
    expect(bandTime(makeOrder({ status: 4 }), 'ready', now, t, formats)).toBeNull()
  })

  it('History: its day and the time it is listed with', () => {
    const order = makeOrder({ status: 1, delivery_datetime_utc: '2026-11-19 11:42:00' })
    expect(bandTime(order, 'history', now, t, formats)).toEqual({ text: `Today · 11:42${NBSP}AM`, state: null, ticking: false })
    expect(bandTime(order, 'history', at('2026-11-20 12:00:00'), t, formats)?.text).toBe(`Yesterday · 11:42${NBSP}AM`)
    expect(bandTime(order, 'history', at('2026-12-20 12:00:00'), t, formats)?.text).toBe(`19/11/2026 · 11:42${NBSP}AM`)
  })

  it('History without a listed time writes nothing', () => {
    expect(bandTime(makeOrder({ status: 1 }), 'history', now, t, formats)).toBeNull()
  })

  it('an order with a driver has no time, and neither do a missing order or a missing section', () => {
    expect(bandTime(makeOrder({ status: 23 }), 'with_driver', now, t, formats)).toBeNull()
    expect(bandTime(null, 'new', now, t, formats)).toBeNull()
    expect(bandTime(pending, null, now, t, formats)).toBeNull()
  })

  it('a waiting order without a creation time writes nothing', () => {
    expect(bandTime(makeOrder({ created_at: undefined }), 'new', now, t, formats)).toBeNull()
  })

  it('writes each part whole: no normal space inside a part, and the parts joined by a normal " · "', () => {
    const texts = [
      bandTime(pending, 'new', now, t, formats, true)?.text,
      bandTime(preparing(), 'preparing', now, t, formats, true)?.text,
      bandTime(preparing(), 'preparing', at('2026-11-19 12:24:12'), t, formats, true)?.text
    ] as string[]
    for (const text of texts) {
      for (const part of text.split(' · ')) {
        expect(part).not.toMatch(/ /)
        expect(part).toContain(NBSP)
      }
    }
    expect(texts[0].split(' · ')).toHaveLength(2)
  })

  describe('with the absolute time on', () => {
    it('a waiting order says when it was placed', () => {
      expect(bandTime(pending, 'new', now, t, formats, true)).toMatchObject({ text: `Waiting${NBSP}02:14 · 12:07${NBSP}PM`, state: 'warning', ticking: true })
    })

    it('a preparing order in time says when it is due; a late one says late and when it was due', () => {
      expect(bandTime(preparing(), 'preparing', now, t, formats, true)?.text).toBe(`Ready${NBSP}in${NBSP}10:00 · due${NBSP}12:20${NBSP}PM`)
      expect(bandTime(preparing(), 'preparing', at('2026-11-19 12:24:12'), t, formats, true)?.text).toBe(`Late${NBSP}04:12 · due${NBSP}12:20${NBSP}PM`)
    })

    it('a preparing order with no promise says when it was accepted', () => {
      expect(bandTime(preparing({ prepared_in: undefined }), 'preparing', now, t, formats, true)?.text).toBe(`Preparing${NBSP}10:00 · 12:00${NBSP}PM`)
    })

    it('a ready order says when it was marked ready', () => {
      const order = makeOrder({ status: 4, reporting_data: { at: { 'status:4': '2026-11-19 12:04:48' } } })
      expect(bandTime(order, 'ready', now, t, formats, true)?.text).toBe(`Waiting${NBSP}05:12 · 12:04${NBSP}PM`)
    })

    it('a time that has run for days still adds only the time of day', () => {
      const old = makeOrder({ status: 0, created_at: '2026-11-10 12:07:46' })
      expect(bandTime(old, 'new', now, t, formats, true)?.text).toBe(`Waiting${NBSP}9d${NBSP}0h · 12:07${NBSP}PM`)
    })

    it('History is already a time of day: the key changes nothing', () => {
      const order = makeOrder({ status: 1, delivery_datetime_utc: '2026-11-19 11:42:00' })
      expect(bandTime(order, 'history', now, t, formats, true)).toEqual(bandTime(order, 'history', now, t, formats, false))
    })

    it('a ready order without a report counts, and writes, from its last update', () => {
      const order = makeOrder({ status: 4, reporting_data: undefined, updated_at: '2026-11-19 12:04:48' })
      expect(bandTime(order, 'ready', now, t, formats, true)?.text).toBe(`Waiting${NBSP}05:12 · 12:04${NBSP}PM`)
    })
  })
})

describe('dayWord', () => {
  it('writes today, tomorrow and yesterday short and lower case, and the date from there', () => {
    const noon = Date.parse('2026-11-19T12:00:00Z')
    const word = (day: string) => dayWord(new Date(`${day}T12:00:00Z`), noon, t, () => 'DATE')
    expect(word('2026-11-19')).toBe('today')
    expect(word('2026-11-20')).toBe('tomorrow')
    expect(word('2026-11-18')).toBe('yesterday')
    expect(word('2026-11-22')).toBe('DATE')
  })
})
