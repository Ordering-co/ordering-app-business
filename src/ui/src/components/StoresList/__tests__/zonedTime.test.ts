import {
  currentClosing,
  dayDifference,
  formatApiDateTime,
  isOpenBySchedule,
  isValidTimeZone,
  nextOpening,
  parseApiDateTime,
  storeZoneNote,
  resolveTimeZone,
  zonedDate,
  zonedParts,
} from '../zonedTime'
import { makeFormats } from '../../../../../hooks/useFormats'

/** The store's clock is the app's one time of day (`useFormats().time` with the store's zone). */
const formatClock = (date: Date, zone?: string | null, clock24 = false) => makeFormats({ timeFormat: clock24 ? 'HH:mm' : 'h:mm A' }).time(date, { zone })

const NY = 'America/New_York'

/** A schedule that is open `from` to `to` every day (index 0 is Sunday). */
const everyDay = (from: [number, number], to: [number, number]) =>
  Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: from[0], minute: from[1] }, close: { hour: to[0], minute: to[1] } }] }))

describe('zoned time', () => {
  it('reads the wall clock of a zone', () => {
    // 18:05 UTC on Thursday 2026-11-19 is 13:05 in New York (EST, UTC-5).
    expect(zonedParts(new Date('2026-11-19T18:05:30Z'), NY)).toEqual({ year: 2026, month: 11, day: 19, hour: 13, minute: 5, second: 30, weekday: 4 })
  })

  it('keeps midnight at 0, not 24', () => {
    expect(zonedParts(new Date('2026-11-19T05:00:00Z'), NY).hour).toBe(0)
  })

  it('finds the instant of a wall clock, across daylight saving', () => {
    expect(zonedDate(2026, 11, 19, 13, 5, NY).toISOString()).toBe('2026-11-19T18:05:00.000Z')
    // Summer time: UTC-4.
    expect(zonedDate(2026, 7, 4, 12, 0, NY).toISOString()).toBe('2026-07-04T16:00:00.000Z')
    // The change day itself, after the clocks moved (2026-03-08).
    expect(zonedDate(2026, 3, 8, 12, 0, NY).toISOString()).toBe('2026-03-08T16:00:00.000Z')
    expect(zonedDate(2026, 3, 7, 12, 0, NY).toISOString()).toBe('2026-03-07T17:00:00.000Z')
  })

  it('lets the day overflow the month and the minutes the day', () => {
    expect(zonedDate(2026, 11, 31, 11, 0, NY).toISOString()).toBe('2026-12-01T16:00:00.000Z')
    expect(zonedDate(2026, 11, 19, 0, 24 * 60 + 90, NY).toISOString()).toBe('2026-11-20T06:30:00.000Z')
  })

  it('formats the clock as 12 or 24 hours in the store zone', () => {
    const date = new Date('2026-11-19T18:05:00Z')
    expect(formatClock(date, NY)).toBe('1:05 PM')
    expect(formatClock(date, NY, true)).toBe('13:05')
    expect(formatClock(new Date('2026-11-19T05:00:00Z'), NY)).toBe('12:00 AM')
    expect(formatClock(new Date('2026-11-19T17:00:00Z'), NY)).toBe('12:00 PM')
  })

  it('counts calendar days in the store zone', () => {
    const now = new Date('2026-11-20T03:00:00Z') // still the 19th in New York
    expect(dayDifference(new Date('2026-11-20T15:00:00Z'), now, NY)).toBe(1)
    expect(dayDifference(new Date('2026-11-20T04:00:00Z'), now, NY)).toBe(0)
    expect(dayDifference(new Date('2026-11-18T15:00:00Z'), now, NY)).toBe(-1)
  })

  it('writes and reads the API date in UTC', () => {
    expect(formatApiDateTime(new Date('2026-11-19T18:05:09Z'))).toBe('2026-11-19 18:05:09')
    expect(parseApiDateTime('2026-11-19 18:05:09')?.toISOString()).toBe('2026-11-19T18:05:09.000Z')
    expect(parseApiDateTime('2026-11-19T18:05:09.000Z')?.toISOString()).toBe('2026-11-19T18:05:09.000Z')
    expect(parseApiDateTime('')).toBeNull()
    expect(parseApiDateTime(null)).toBeNull()
    expect(parseApiDateTime('soon')).toBeNull()
  })

  it('falls back to a usable zone when the store has none', () => {
    expect(isValidTimeZone('Nowhere/City')).toBe(false)
    expect(isValidTimeZone(NY)).toBe(true)
    expect(isValidTimeZone(undefined)).toBe(false)
    expect(isValidTimeZone(resolveTimeZone('Nowhere/City'))).toBe(true)
    expect(resolveTimeZone(NY)).toBe(NY)
  })
})

describe('schedule', () => {
  const schedule = everyDay([11, 0], [22, 0])

  it('says when the open lapse ends', () => {
    const now = new Date('2026-11-19T18:05:00Z') // 13:05 in New York
    expect(currentClosing(schedule, NY, now)?.toISOString()).toBe('2026-11-20T03:00:00.000Z') // 22:00
    expect(isOpenBySchedule(schedule, NY, now)).toBe(true)
  })

  it('is closed outside the lapses and with no schedule', () => {
    const night = new Date('2026-11-20T04:00:00Z') // 23:00
    expect(currentClosing(schedule, NY, night)).toBeNull()
    expect(isOpenBySchedule(schedule, NY, night)).toBe(false)
    expect(currentClosing(null, NY, night)).toBeNull()
    expect(currentClosing([], NY, night)).toBeNull()
  })

  it('treats a lapse that crosses midnight as open after it', () => {
    const late = everyDay([18, 0], [2, 0])
    expect(currentClosing(late, NY, new Date('2026-11-20T04:30:00Z'))?.toISOString()).toBe('2026-11-20T07:00:00.000Z') // 23:30 -> 02:00
    expect(currentClosing(late, NY, new Date('2026-11-20T06:00:00Z'))?.toISOString()).toBe('2026-11-20T07:00:00.000Z') // 01:00 -> 02:00
    expect(currentClosing(late, NY, new Date('2026-11-20T09:00:00Z'))).toBeNull() // 04:00
  })

  it('finds the next opening today, tomorrow or on a later day', () => {
    const morning = new Date('2026-11-19T12:00:00Z') // 07:00
    expect(nextOpening(schedule, NY, morning)?.toISOString()).toBe('2026-11-19T16:00:00.000Z') // today 11:00
    const night = new Date('2026-11-20T04:00:00Z') // 23:00
    expect(nextOpening(schedule, NY, night)?.toISOString()).toBe('2026-11-20T16:00:00.000Z') // tomorrow 11:00
    const mondayOnly = Array.from({ length: 7 }, (_, index) => ({ enabled: index === 1, lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 17, minute: 0 } }] }))
    // Thursday 13:05 -> next Monday (Nov 23) 09:00 = 14:00 UTC
    expect(nextOpening(mondayOnly, NY, new Date('2026-11-19T18:05:00Z'))?.toISOString()).toBe('2026-11-23T14:00:00.000Z')
  })

  it('skips what is left of today for "rest of today"', () => {
    const morning = new Date('2026-11-19T12:00:00Z')
    expect(nextOpening(schedule, NY, morning, { fromTomorrow: true })?.toISOString()).toBe('2026-11-20T16:00:00.000Z')
  })

  it('has no opening without a schedule or with every day off', () => {
    expect(nextOpening(null, NY, new Date())).toBeNull()
    expect(nextOpening([], NY, new Date())).toBeNull()
    expect(nextOpening(Array.from({ length: 7 }, () => ({ enabled: false, lapses: [] })), NY, new Date())).toBeNull()
  })
})

// ANDROID-B12: "Until 7:52 PM" read one hour behind the device. The device was in America/Bogota (UTC-5, no daylight
// saving) and the store in a zone at UTC-6: the store's own clock, by design. The arithmetic is right; what was missing
// is saying the zone when it is not the device's.
describe('a store whose clock is not the device\'s', () => {
  const CHICAGO = 'America/Chicago'
  const BOGOTA = 'America/Bogota'
  const originalZone = process.env.TZ
  beforeAll(() => { process.env.TZ = BOGOTA })
  afterAll(() => { if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone })

  // The device's 8:52 PM on Thursday 2026-11-19 (01:52 UTC on the 20th).
  const until = new Date('2026-11-20T01:52:00Z')

  it('writes the same instant one hour earlier on a UTC-6 store clock than on the device clock (Chicago is on standard time in November)', () => {
    expect(formatClock(until, BOGOTA)).toBe('8:52 PM')
    expect(formatClock(until, CHICAGO)).toBe('7:52 PM')
  })

  it('follows the daylight saving of the store\'s zone, not a fixed offset', () => {
    // In July Chicago is UTC-5, as Bogota: the same clock.
    const summer = new Date('2026-07-20T01:52:00Z')
    expect(formatClock(summer, CHICAGO)).toBe(formatClock(summer, BOGOTA))
    // The week daylight saving ends (2026-11-01 07:00 UTC): 1:30 AM happens once on each side.
    expect(formatClock(new Date('2026-11-01T06:30:00Z'), CHICAGO)).toBe('1:30 AM')
    expect(formatClock(new Date('2026-11-01T07:30:00Z'), CHICAGO)).toBe('1:30 AM')
  })

  it('names the store\'s zone when its clock differs from the device\'s, and says nothing when they agree', () => {
    const now = new Date('2026-11-20T01:22:00Z')
    expect(storeZoneNote(CHICAGO, now)).toBe('Chicago')
    expect(storeZoneNote('America/Argentina/Buenos_Aires', now)).toBe('Buenos Aires')
    expect(storeZoneNote(BOGOTA, now)).toBeNull()
    expect(storeZoneNote('America/Lima', now)).toBeNull()
    expect(storeZoneNote(null, now)).toBeNull()
    expect(storeZoneNote('Not/AZone', now)).toBeNull()
  })

  it('names the zone in July too, when the same zone is on the device\'s clock the note disappears', () => {
    expect(storeZoneNote(CHICAGO, new Date('2026-07-20T01:22:00Z'))).toBeNull()
  })
})
