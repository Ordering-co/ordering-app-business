import React, { useEffect, useMemo, useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import dayjs, { type Dayjs } from '@/utils/dayjs'
import { useLanguage } from '@components'
import OText from './OText'
import Icon from './Icon'
import { themeColor, themeControlHeight, themeRadius, themeSpace, themeText } from '@/theme/helpers'

/**
 * A month calendar to pick one day, or a range of days (`mode='range'`: the orders search's custom
 * dates), the app's own (in place of react-native-calendar-picker, whose last version needs date-fns
 * and whose install script set up git hooks): the month with its arrows, the week's days
 * and a grid of days, each in a cell as tall as a touch target (`md`). The selected day (or the range's
 * two ends) is a disc in the brand color, the days between them a tinted band, today on `border`;
 * a day before `minDate` is disabled. A range is picked in two taps: the first sets its start
 * (and clears its end), the second its end; a day before the start begins the range again. The calendar takes the width its container gives it (or `width`), the columns share
 * it, and a weekday name is one line. Months and days are named in the app's language (its `MONTH1`…
 * and `DAYSHORT1`… texts), never in a library's global locale, which depends on
 * the screens visited before. A day's circle is never wider than its column
 * (a 320 pt screen leaves columns narrower than the control's height).
 */
type OCalendarProps = {
  /** `single` (default) answers a day through `onDateChange`; `range` a start and an end through `onRangeChange`. */
  mode?: 'single' | 'range'
  selectedDate?: Date | string | null
  /** The range's start and end (`mode='range'`); a start without an end is a range being picked. */
  startDate?: Date | string | null
  endDate?: Date | string | null
  minDate?: Date
  maxDate?: Date
  onDateChange?: (date: Date) => void
  onRangeChange?: (range: { start: Date | null, end: Date | null }) => void
  width?: number
  testID?: string
}

const DAYS_IN_WEEK = 7
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// Sunday first, as the grid: the app's `DAYSHORT7` is Sunday.
const WEEKDAYS: Array<[string, string]> = [
  ['DAYSHORT7', 'Sun'], ['DAYSHORT1', 'Mon'], ['DAYSHORT2', 'Tue'], ['DAYSHORT3', 'Wed'], ['DAYSHORT4', 'Thu'], ['DAYSHORT5', 'Fri'], ['DAYSHORT6', 'Sat'],
]

export const OCalendar = ({ mode = 'single', selectedDate, startDate, endDate, minDate, maxDate, onDateChange, onRangeChange, width, testID = 'calendar-picker' }: OCalendarProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  // The width the columns share: the caller's, or the one the calendar is laid out with.
  const [measured, setMeasured] = useState<number | undefined>(undefined)
  const range = mode === 'range'
  const start = range && startDate ? dayjs(startDate) : null
  const end = range && endDate ? dayjs(endDate) : null
  const selected = range ? start : selectedDate ? dayjs(selectedDate) : null
  const [month, setMonth] = useState(() => (selected ?? dayjs()).clone().startOf('month'))

  useEffect(() => {
    if (selected && !selected.isSame(month, 'month')) setMonth(selected.clone().startOf('month'))
  }, [selectedDate, startDate])

  const looks = useMemo(() => {
    // The day's circle is the `sm` control; the day's cell (what answers a tap) is the touch target, `md`.
    const cell = themeControlHeight(theme, 'sm')
    const touch = themeControlHeight(theme, 'md')
    const available = width ?? measured
    // The circle fits its column: the control's height, or the column's width when narrower.
    const circle = available ? Math.min(cell, Math.floor(available / DAYS_IN_WEEK)) : cell
    return StyleSheet.create({
      // The caller's width, or the whole width its container gives (never shrunk to the content: the
      // seven columns would share about 160 pt of a phone and wrap the weekday names).
      container: width === undefined ? { alignSelf: 'stretch' } : { alignSelf: 'center', width },
      header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: themeSpace(theme, 'sm') },
      title: { ...themeText(theme, 'body', { weight: 600 }), color: themeColor(theme, 'text') },
      row: { flexDirection: 'row' },
      cell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: cell, marginVertical: themeSpace(theme, 'xxs') },
      dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: touch, marginVertical: themeSpace(theme, 'xxs') },
      // The band of a range: the cell's whole width between the ends, its half toward the other end at each of them.
      band: { position: 'absolute', top: (touch - circle) / 2, bottom: (touch - circle) / 2, left: 0, right: 0, backgroundColor: themeColor(theme, 'primary_subtle') },
      bandFromStart: { left: '50%' },
      bandToEnd: { right: '50%' },
      day: { width: circle, height: circle, borderRadius: themeRadius(theme, 'full', { fixed: true }), alignItems: 'center', justifyContent: 'center' },
      today: { backgroundColor: themeColor(theme, 'border') },
      selected: { backgroundColor: themeColor(theme, 'primary') },
      weekday: { ...themeText(theme, 'body_sm'), color: themeColor(theme, 'text_muted') },
      dayText: { ...themeText(theme, 'body_sm'), color: themeColor(theme, 'text') },
      selectedText: { color: themeColor(theme, 'on_primary') },
      disabledText: { color: themeColor(theme, 'text_disabled') },
    })
  }, [theme, width, measured])

  const monthName = (date: Dayjs) => t(`MONTH${date.month() + 1}`, MONTHS[date.month()])
  const onLayout = (event: LayoutChangeEvent) => {
    const laidOut = Math.round(event.nativeEvent.layout.width)
    if (width === undefined && laidOut !== measured) setMeasured(laidOut)
  }

  const weeks = useMemo(() => {
    const first = month.clone().startOf('month')
    const days: (Dayjs | null)[] = Array.from({ length: first.day() }, () => null)
    for (let d = 0; d < month.daysInMonth(); d++) days.push(first.clone().add(d, 'day'))
    while (days.length % DAYS_IN_WEEK) days.push(null)
    return Array.from({ length: days.length / DAYS_IN_WEEK }, (_, w) => days.slice(w * DAYS_IN_WEEK, (w + 1) * DAYS_IN_WEEK))
  }, [month])

  const isDisabled = (day: Dayjs) =>
    (!!minDate && day.isBefore(dayjs(minDate), 'day')) || (!!maxDate && day.isAfter(dayjs(maxDate), 'day'))

  /** A tap on a day: the answer of a single calendar, or the next step of a range. */
  const pick = (day: Dayjs) => {
    if (!range) {
      onDateChange?.(day.toDate())
      return
    }
    // The first tap, a tap after a complete range or one before the start (re)starts the range; the next one ends it.
    if (!start || end || day.isBefore(start, 'day')) onRangeChange?.({ start: day.toDate(), end: null })
    else onRangeChange?.({ start: start.toDate(), end: day.toDate() })
  }

  const canGoBack = !minDate || month.isAfter(dayjs(minDate), 'month')
  const canGoForward = !maxDate || month.isBefore(dayjs(maxDate), 'month')

  return (
    <View style={looks.container} testID={testID} onLayout={onLayout}>
      <View style={looks.header}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={t('PREVIOUS_MONTH', 'Previous month')}
          disabled={!canGoBack}
          onPress={() => setMonth(month.clone().subtract(1, 'month'))}
          hitSlop={themeSpace(theme, 'sm')}
        >
          <Icon name='chevron-back' size='lg' color={canGoBack ? 'text_muted' : 'text_disabled'} />
        </Pressable>
        <OText style={looks.title}>{`${monthName(month)} ${month.year()}`}</OText>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={t('NEXT_MONTH', 'Next month')}
          disabled={!canGoForward}
          onPress={() => setMonth(month.clone().add(1, 'month'))}
          hitSlop={themeSpace(theme, 'sm')}
        >
          <Icon name='chevron-forward' size='lg' color={canGoForward ? 'text_muted' : 'text_disabled'} />
        </Pressable>
      </View>
      <View style={looks.row}>
        {WEEKDAYS.map(([key, name]) => (
          <View key={key} style={looks.cell}>
            <OText style={looks.weekday} numberOfLines={1}>{t(key, name)}</OText>
          </View>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={looks.row}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={looks.dayCell} />
            const disabled = isDisabled(day)
            const isStart = !!start && day.isSame(start, 'day')
            const isEnd = !!end && day.isSame(end, 'day')
            const on = range ? isStart || isEnd : !!selected && day.isSame(selected, 'day')
            const between = !!start && !!end && day.isAfter(start, 'day') && day.isBefore(end, 'day')
            const fromStart = isStart && !!end && !end.isSame(start, 'day')
            const toEnd = isEnd && !!start && !end?.isSame(start, 'day')
            const today = day.isSame(dayjs(), 'day')
            return (
              <Pressable
                key={d}
                style={looks.dayCell}
                disabled={disabled}
                onPress={() => pick(day)}
                accessibilityRole='button'
                accessibilityState={{ selected: on, disabled }}
                accessibilityLabel={`${day.date()} ${monthName(day)} ${day.year()}`}
              >
                {(between || fromStart || toEnd) && <View style={[looks.band, fromStart && looks.bandFromStart, toEnd && looks.bandToEnd]} testID={`${testID}-band`} />}
                <View style={[looks.day, today && looks.today, on && looks.selected]}>
                  <OText style={[looks.dayText, on && looks.selectedText, disabled && looks.disabledText]}>
                    {day.date()}
                  </OText>
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export default OCalendar
