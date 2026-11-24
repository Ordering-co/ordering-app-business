import { useCallback } from 'react'
import { useLanguage } from '@components'
import { useFormats } from '@/hooks/useFormats'
import { dayDifference, resolveTimeZone } from './zonedTime'

/**
 * Says when something happens in a store's own clock, in the words of the screens: `3:30 PM` when it is today,
 * `tomorrow 11:00 AM`, or `Mon 11:00 AM` further on. The clock is the app's one (`useFormats().time`), 12 or 24 hours as the project's settings say.
 */
export const useWhen = () => {
  const [, t] = useLanguage()
  const { time: clockOf } = useFormats()

  return useCallback((date: Date, timeZone?: string | null, now: Date = new Date()): string => {
    const time = clockOf(date, { zone: timeZone })
    const days = dayDifference(date, now, timeZone)
    if (days <= 0) return time
    if (days === 1) return t('WHEN_TOMORROW', 'tomorrow _time_').replace('_time_', time)
    let day = ''
    try {
      day = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: resolveTimeZone(timeZone) }).format(date)
    } catch (_) {
      day = ''
    }
    return t('WHEN_DAY', '_day_ _time_').replace('_day_', day).replace('_time_', time)
  }, [t, clockOf])
}
