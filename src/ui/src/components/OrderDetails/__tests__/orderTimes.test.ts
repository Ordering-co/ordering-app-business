import { formatClock, orderClock } from '../../PreviousOrders/orderTimes'
import { clockText, historyOffset, minutesBetween, prepClock, statusMoments, timelineSteps } from '../orderTimes'

const HOUR = 3600 * 1000
const MIN = 60 * 1000
const utc = (text: string) => Date.parse(`${text.replace(' ', 'T')}Z`)

/**
 * An order accepted at 12:18 UTC whose business is 5 hours behind UTC: the history writes 07:18, the order's
 * `updated_at` (its last change, the ready step at 12:30 UTC) is UTC.
 */
const order = (extra: any = {}) => ({
  id: 1,
  status: 4,
  created_at: '2026-11-19 12:10:00',
  updated_at: '2026-11-19 12:30:41',
  prepared_in: 20,
  history: [
    { type: 2, created_at: '2026-11-19 07:18:00', data: [{ attribute: 'status', old: 0, new: 7 }] },
    { type: 2, created_at: '2026-11-19 07:30:00', data: [{ attribute: 'status', old: 7, new: 4 }] }
  ],
  ...extra
})

describe('historyOffset', () => {
  it('is the business offset learned from the last entry and updated_at', () => {
    expect(historyOffset(order())).toBe(5 * HOUR)
  })
  it('is null without history or when the stamps do not agree', () => {
    expect(historyOffset(order({ history: undefined }))).toBeNull()
    expect(historyOffset(order({ updated_at: '2026-11-20 20:30:00' }))).toBeNull()
  })
})

describe('statusMoments', () => {
  it('moves the history stamps by the offset', () => {
    const moments = statusMoments(order())
    expect(moments.at(7)).toBe(utc('2026-11-19 12:18:00'))
    expect(moments.at(4)).toBe(utc('2026-11-19 12:30:00'))
    expect(moments.createdAt).toBe(utc('2026-11-19 12:10:00'))
  })
  it('falls back to updated_at for the current status when the history is no use', () => {
    const moments = statusMoments(order({ history: [] }))
    expect(moments.at(4)).toBe(utc('2026-11-19 12:30:41'))
    expect(moments.at(7)).toBeNull()
    expect(moments.at(4, true)).toBeNull()
  })
  it('reads a history sent as text', () => {
    expect(statusMoments(order({ history: JSON.stringify(order().history) })).at(7)).toBe(utc('2026-11-19 12:18:00'))
  })
})

describe('prepClock', () => {
  it('counts down to the accepted moment plus prepared_in', () => {
    const accepted = utc('2026-11-19 12:18:00')
    const clock = prepClock(order({ status: 7 }), accepted + 12 * MIN)!
    expect(clock.promisedAt).toBe(accepted + 20 * MIN)
    expect(clock.remaining).toBe(8 * MIN)
    expect(clock.elapsed).toBeCloseTo(0.6)
    expect(clock.late).toBe(false)
  })
  it('counts from the API\'s own moment of acceptance (to the second), so the card and the details show one clock', () => {
    // The history truncates to the minute (12:18:00); the report says 12:18:06: the card read the report, the details the history.
    const reported = order({ status: 7, reporting_data: { at: { 'status:7': '2026-11-19 12:18:06' } } })
    const now = utc('2026-11-19 12:30:00')
    const clock = prepClock(reported, now)!
    expect(clock.promisedAt).toBe(utc('2026-11-19 12:38:06'))
    const card = orderClock(reported, 'preparing', now, (_key, fallback) => fallback ?? _key, () => undefined)!
    expect(card.text).toBe(`Ready in ${formatClock(clock.remaining / 1000)}`)
  })
  it('is late past the promised time, and the bar is full', () => {
    const accepted = utc('2026-11-19 12:18:00')
    const clock = prepClock(order({ status: 7 }), accepted + 25 * MIN)!
    expect(clock.late).toBe(true)
    expect(clock.remaining).toBe(-5 * MIN)
    expect(clock.elapsed).toBe(1)
  })
  it('is null without prepared_in or without an accepted moment', () => {
    expect(prepClock(order({ prepared_in: undefined }), 0)).toBeNull()
    expect(prepClock(order({ history: [], status: 4 }), 0)).toBeNull()
  })
})

describe('timelineSteps', () => {
  it('lists what the history names, once each, oldest first', () => {
    const steps = timelineSteps(order())
    expect(steps.map((step) => step.key)).toEqual(['accepted', 'ready'])
  })
  it('adds the step a driver is on', () => {
    const history = [
      ...order().history,
      { type: 2, created_at: '2026-11-19 07:40:00', data: [{ attribute: 'status', old: 4, new: 9 }] }
    ]
    const steps = timelineSteps(order({ status: 9, updated_at: '2026-11-19 12:40:30', history }))
    expect(steps.map((step) => step.key)).toEqual(['accepted', 'ready', 'picked_up_by_driver', 'on_the_way'])
    expect(steps[3]).toMatchObject({ current: true, at: null })
  })
  it('is empty without history (updated_at never makes a step)', () => {
    expect(timelineSteps(order({ history: [] }))).toEqual([])
  })
})

describe('the card and the details panel read one second (T3-C1)', () => {
  // Device: #4466, accepted with 20 min, the card 19:29 and the panel 19:28 in one screenshot (the card rounded the
  // seconds left, the panel floored them), at any moment between two ticks.
  const reported = order({ status: 7, reporting_data: { at: { 'status:7': '2026-11-19 12:18:06' } } })
  const t = (_key: string, fallback?: string) => fallback ?? ''
  const accepted = utc('2026-11-19 12:18:06')

  it('writes the same figure for every instant of a second, before and after the promised time', () => {
    for (let offset = -3 * MIN; offset <= 3 * MIN; offset += 137) {
      // `now` anywhere between two whole seconds, the way a tick lands on the second boundary of the clock.
      const now = accepted + 20 * MIN - offset
      const card = orderClock(reported, 'preparing', now, t, () => undefined)!.text
      const panel = prepClock(reported, now)!
      const figure = clockText(panel.remaining, t)
      expect(card).toBe(`${panel.late ? 'Late' : 'Ready in'} ${figure}`)
    }
  })

  it('rounds the wait of a new order the way the details do', () => {
    const fresh = order({ status: 0, created_at: '2026-11-19 12:10:00', history: [] })
    for (let extra = 0; extra < 3000; extra += 250) {
      const now = utc('2026-11-19 12:10:00') + 5 * MIN + extra
      expect(orderClock(fresh, 'new', now, t, () => undefined)!.text).toBe(`Waiting ${clockText(now - utc('2026-11-19 12:10:00'), t)}`)
    }
  })
})

describe('clockText and minutesBetween', () => {
  it('writes mm:ss, then the orders list\'s long form from an hour and from a day', () => {
    expect(clockText(42 * 1000)).toBe('00:42')
    expect(clockText(4 * MIN + 10 * 1000)).toBe('04:10')
    expect(clockText(HOUR + 5 * MIN + 9 * 1000)).toBe('1h 5m')
    expect(clockText(26 * HOUR + 5 * MIN)).toBe('1d 2h')
    // the same text as the orders list's own helper
    expect(clockText(213 * HOUR)).toBe(formatClock(213 * 3600))
    expect(clockText(-5)).toBe('00:00')
  })
  it('counts whole minutes', () => {
    expect(minutesBetween(0, 28 * MIN + 20 * 1000)).toBe(28)
    expect(minutesBetween(null, 1)).toBeNull()
  })
})
