import { getPauseOptions } from '../pauseOptions'

const NY = 'America/New_York'
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 11, minute: 0 }, close: { hour: 22, minute: 0 } }] }))
const now = new Date('2026-11-19T18:05:09Z') // 13:05 in New York

describe('getPauseOptions', () => {
  it('offers 15, 30, 60 minutes, the rest of today and until turned back on for a store', () => {
    const options = getPauseOptions({ timezone: NY, schedule }, 'store', now)
    expect(options.map((option) => option.key)).toEqual(['minutes_15', 'minutes_30', 'hour_1', 'rest_of_day', 'until_resumed'])
  })

  it('sends snooze_until as UTC "YYYY-MM-DD HH:mm:ss" and nothing else for a timed pause', () => {
    const options = getPauseOptions({ timezone: NY, schedule }, 'store', now)
    expect(options[0].changes).toEqual({ snooze_until: '2026-11-19 18:20:09' })
    expect(options[1].changes).toEqual({ snooze_until: '2026-11-19 18:35:09' })
    expect(options[2].changes).toEqual({ snooze_until: '2026-11-19 19:05:09' })
    expect(options[1].until?.toISOString()).toBe('2026-11-19T18:35:09.000Z')
  })

  it('reopens at tomorrow\'s first opening, in UTC', () => {
    const rest = getPauseOptions({ timezone: NY, schedule }, 'store', now).find((option) => option.key === 'rest_of_day')
    expect(rest?.changes).toEqual({ snooze_until: '2026-11-20 16:00:00' })
  })

  it('hides the rest of today when the schedule has no next opening', () => {
    expect(getPauseOptions({ timezone: NY, schedule: [] }, 'store', now).map((option) => option.key)).toEqual(['minutes_15', 'minutes_30', 'hour_1', 'until_resumed'])
    expect(getPauseOptions(null, 'store', now).some((option) => option.key === 'rest_of_day')).toBe(false)
  })

  it('turns a store off for "until I turn it back on", with no date', () => {
    const last = getPauseOptions({ timezone: NY, schedule }, 'store', now).pop()
    expect(last).toEqual({ key: 'until_resumed', until: null, changes: { enabled: false } })
  })

  it('pauses a product with enabled true so it comes back by itself, and offers two hours', () => {
    const options = getPauseOptions({ timezone: NY, schedule }, 'product', now)
    expect(options.map((option) => option.key)).toEqual(['minutes_15', 'minutes_30', 'hour_1', 'hours_2', 'rest_of_day', 'until_resumed'])
    expect(options.find((option) => option.key === 'hours_2')?.changes).toEqual({ enabled: true, snooze_until: '2026-11-19 20:05:09' })
    expect(options.pop()?.changes).toEqual({ enabled: false, snooze_until: '' })
  })
})
