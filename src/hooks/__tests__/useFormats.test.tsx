import { renderHook } from '@testing-library/react-native'
import { makeFormats, SPACE_BEFORE_MERIDIEM, useFormats } from '../useFormats'

let mockFormats = { timeFormat: 'hh:mmA', dateFormat: 'DD/MM/YYYY' }
jest.mock('@components', () => ({ useUtils: () => [mockFormats] }))

// Harmony H6: "07:04PM", "11:59 PM", "7:20 PM" and "12:38 PM" for the same kind of thing.
describe('the app\'s one time of day and date', () => {
  const evening = '2026-11-19 19:04:00' // the API's UTC

  it('writes the time in the project\'s format with a space before the meridiem, the mockups\' "12:38 PM"', () => {
    expect(SPACE_BEFORE_MERIDIEM).toBe(true)
    const f = makeFormats({ timeFormat: 'hh:mmA', dateFormat: 'DD/MM/YYYY' })
    expect(f.time('2026-11-19 12:38:00', { utc: false })).toBe('12:38 PM')
    expect(f.time('2026-11-19 19:04:00', { utc: false })).toBe('07:04 PM')
    expect(makeFormats({ timeFormat: 'hh:mm A' }).time('2026-11-19 19:04:00', { utc: false })).toBe('07:04 PM')
  })

  it('follows a 24 hour project, and the date and the date-time follow its date format', () => {
    const f = makeFormats({ timeFormat: 'HH:mm', dateFormat: 'MM/DD/YYYY' })
    expect(f.time('2026-11-19 19:04:00', { utc: false })).toBe('19:04')
    expect(f.date('2026-11-19 19:04:00', { utc: false })).toBe('11/19/2026')
    expect(f.dateTime('2026-11-19 19:04:00', { utc: false })).toBe('11/19/2026 19:04')
  })

  it('reads a string without a zone as the API\'s UTC unless told it is local, and a Date or a timestamp as itself', () => {
    const f = makeFormats({ timeFormat: 'HH:mm' })
    const asUtc = f.time(evening)
    const local = new Date(Date.UTC(2026, 10, 19, 19, 4))
    expect(asUtc).toBe(f.time(local))
    expect(f.time(local.getTime())).toBe(asUtc)
    expect(f.time('2026-11-19T19:04:00Z')).toBe(asUtc)
  })

  it('writes a store\'s own clock when given its zone', () => {
    const f = makeFormats({ timeFormat: 'hh:mmA' })
    expect(f.time('2026-11-19 19:04:00', { zone: 'America/New_York' })).toBe('02:04 PM')
    expect(f.time('2026-11-19 19:04:00', { zone: 'Europe/Madrid' })).toBe('08:04 PM')
    expect(f.time('2026-11-19 19:04:00', { zone: 'Not/AZone' })).toBe(f.time('2026-11-19 19:04:00'))
  })

  it('writes the time an order is for: its delivery time (UTC or the store\'s own clock), else when it was made', () => {
    const f = makeFormats({ timeFormat: 'hh:mmA' })
    expect(f.orderTime({ delivery_datetime_utc: '2026-11-19 19:04:00' })).toBe(f.time('2026-11-19 19:04:00'))
    expect(f.orderTime({ delivery_datetime: '2026-11-19 19:04:00', delivery_datetime_utc: null })).toBe('07:04 PM')
    expect(f.orderTime({ created_at: '2026-11-19 19:04:00' })).toBe(f.time('2026-11-19 19:04:00'))
    expect(f.orderTime({})).toBeUndefined()
  })

  it('writes nothing for what is not a moment (never "invalid format" in the middle of a line)', () => {
    const f = makeFormats()
    for (const value of [null, undefined, '', 'soon']) expect(f.time(value as any)).toBe('')
  })

  it('is what the hook gives, with the project\'s formats', () => {
    mockFormats = { timeFormat: 'hh:mmA', dateFormat: 'DD/MM/YYYY' }
    const { result } = renderHook(() => useFormats())
    expect(result.current.time('2026-11-19 12:38:00', { utc: false })).toBe('12:38 PM')
    expect(result.current.date('2026-11-19 12:38:00', { utc: false })).toBe('19/11/2026')
    expect(result.current.timeFormat).toBe('hh:mm A')
  })
})
