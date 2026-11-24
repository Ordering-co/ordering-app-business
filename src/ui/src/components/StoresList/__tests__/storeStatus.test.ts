import { canPause, getStoreStatus } from '../storeStatus'

const NY = 'America/New_York'
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 11, minute: 0 }, close: { hour: 22, minute: 0 } }] }))
const afternoon = new Date('2026-11-19T18:05:00Z') // 13:05 in New York
const night = new Date('2026-11-20T04:00:00Z') // 23:00

describe('getStoreStatus', () => {
  it('is open with the time its lapse ends', () => {
    const status = getStoreStatus({ enabled: true, open: true, schedule, timezone: NY, snooze_until: null }, afternoon)
    expect(status).toEqual({ kind: 'open', closesAt: new Date('2026-11-20T03:00:00.000Z') })
  })

  it('is closed by its schedule with the next opening', () => {
    const status = getStoreStatus({ enabled: true, open: false, schedule, timezone: NY }, night)
    expect(status).toEqual({ kind: 'closed', opensAt: new Date('2026-11-20T16:00:00.000Z') })
  })

  it('is paused while snooze_until is ahead, whatever the schedule says', () => {
    const status = getStoreStatus({ enabled: true, open: true, schedule, timezone: NY, snooze_until: '2026-11-19 19:30:00' }, afternoon)
    expect(status).toEqual({ kind: 'paused', until: new Date('2026-11-19T19:30:00.000Z') })
  })

  it('is open again when snooze_until has passed', () => {
    const status = getStoreStatus({ enabled: true, open: true, schedule, timezone: NY, snooze_until: '2026-11-19 18:00:00' }, afternoon)
    expect(status.kind).toBe('open')
  })

  it('is off when orders are turned off, even when paused or open by schedule', () => {
    expect(getStoreStatus({ enabled: false, open: true, schedule, timezone: NY }, afternoon)).toEqual({ kind: 'off' })
    expect(getStoreStatus({ enabled: false, open: true, snooze_until: '2026-11-19 19:30:00' }, afternoon)).toEqual({ kind: 'off' })
    expect(getStoreStatus({ enabled: 0 }, afternoon)).toEqual({ kind: 'off' })
  })

  it('works out `open` from the schedule when the API did not send it', () => {
    expect(getStoreStatus({ enabled: true, schedule, timezone: NY }, afternoon).kind).toBe('open')
    expect(getStoreStatus({ enabled: true, schedule, timezone: NY }, night).kind).toBe('closed')
  })

  it('counts as open, without times, when it has neither `open` nor a schedule', () => {
    expect(getStoreStatus({ enabled: true }, afternoon)).toEqual({ kind: 'open', closesAt: null })
    expect(getStoreStatus({ enabled: true, open: false }, afternoon)).toEqual({ kind: 'closed', opensAt: null })
  })

  it('knows which states can be paused', () => {
    expect(canPause({ kind: 'open', closesAt: null })).toBe(true)
    expect(canPause({ kind: 'closed', opensAt: null })).toBe(true)
    expect(canPause({ kind: 'paused', until: afternoon })).toBe(false)
    expect(canPause({ kind: 'off' })).toBe(false)
  })
})
