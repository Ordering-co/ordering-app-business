import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useFormats } from '@/hooks/useFormats'
import { detailsStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { SlotButton } from './SlotButton'
import { clockText, prepClock, timelineSteps, type TimelineKey, type TimelineStep } from './orderTimes'
import { useNow } from './useNow'
import { nativeTextStyle, themeSpace, themeText } from '@/theme/helpers'
import { Icon, OCard, ONotice, OProgress, OText } from '../shared'

import { useLanguage } from '@components'

/** The order's comment: the kitchen must not miss it. */
export const NoteNotice = ({ comment }: { comment: string }) => {
  const [, t] = useLanguage()
  if (!comment) return null
  return <ONotice variant='warning' title={t('ORDER_NOTE', 'Order note')} testID='order-note'>{comment}</ONotice>
}

interface PrepProps {
  order: any
  /** `confirmation.order.countdown`: the "Ready in" figure and the bar. */
  showCountdown: boolean
  /** The preparation time can still be adjusted. */
  canAdjust: boolean
  onAdjust: () => void
}

/**
 * The preparation card of an accepted order (stage `preparing`): how long is left to the promised time (the figure,
 * and a bar of how much has gone), when it was promised for, and "Adjust time". Late, the figure says by how much
 * and the bar turns red. Without a moment the order was accepted at, it says the minutes it was given.
 */
export const PrepTimeCard = ({ order, showCountdown, canAdjust, onAdjust }: PrepProps) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const { time } = useFormats()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  // Only this card ticks (a clock that is not shown does not tick).
  const now = useNow(showCountdown)
  const clock = prepClock(order, now)
  const minutes = Number(order?.prepared_in)
  if (!clock && !(minutes > 0)) return null
  const late = !!clock?.late

  return (
    <OCard variant='muted' testID='prep-card'>
      <View style={styles.row}>
        <View style={styles.grow}>
          {clock
            ? (
              <>
                {showCountdown && (
                  <>
                    <OText preset='body_sm' color='text_muted'>{late ? t('LATE_BY', 'Late by') : t('READY_IN', 'Ready in')}</OText>
                    <OText style={[styles.figure, late && styles.lateFigure]} testID='prep-figure'>{clockText(Math.abs(clock.remaining), t)}</OText>
                  </>
                )}
                <OText preset='body_sm' color='text_muted' style={styles.promised} testID='prep-promised'>
                  {t('PROMISED_FOR', 'Promised for _time_').replace('_time_', time(clock.promisedAt))}
                </OText>
              </>
            )
            : (
              <>
                <OText preset='body_sm' color='text_muted'>{t('PREPARATION_TIME', 'Preparation time')}</OText>
                <OText style={styles.figure} testID='prep-figure'>{t('MINUTES_SHORT', '_min_ min').replace('_min_', String(minutes))}</OText>
              </>
            )}
        </View>
        {canAdjust && <SlotButton slot='action' text={t('ADJUST_TIME', 'Adjust time')} onClick={onAdjust} testID='prep-adjust' />}
      </View>
      {!!clock && showCountdown && <OProgress variant='bar' value={clock.elapsed} fill={late ? 'danger' : undefined} testID='prep-progress' />}
    </OCard>
  )
}

const STEP_TEXT: Record<TimelineKey, [string, string]> = {
  accepted: ['TIMELINE_ACCEPTED', 'Accepted'],
  ready: ['TIMELINE_READY', 'Ready'],
  driver_accepted: ['ACCEPTED_BY_DRIVER', 'Accepted by driver'],
  picked_up_by_driver: ['TIMELINE_PICKED_UP_BY_DRIVER', 'Picked up by driver'],
  on_the_way: ['TIMELINE_ON_THE_WAY', 'On the way to the customer'],
  picked_up: ['PICKED_UP', 'Picked up'],
  delivered: ['TIMELINE_DELIVERED', 'Delivered']
}

const useStepLabel = () => {
  const [, t] = useLanguage()
  return (key: TimelineKey) => t(STEP_TEXT[key][0], STEP_TEXT[key][1])
}

const TimelineSteps = ({ steps }: { steps: TimelineStep[] }) => {
  const theme: any = useTheme()
  const { time } = useFormats()
  const label = useStepLabel()
  const base = theme.native.components.timeline.base
  const styles = useMemo(() => {
    // The line a step's name is written on: the dot is centred on it, whatever the theme's text and dot sizes are.
    const nameLine = Math.max(themeText(theme, 'body').lineHeight ?? 0, nativeTextStyle(base.title).lineHeight ?? 0, base.dot_size)
    return StyleSheet.create({
      step: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
      rail: { alignItems: 'center', width: base.dot_size },
      // The dot in the height of the name's first line, between two equal joins: the rail's line reaches it from above and
      // leaves it below, so the line stays whole while the dot sits level with the text.
      dotBox: { height: nameLine, alignItems: 'center' },
      join: { flex: 1, width: base.line.borderWidth },
      drawn: { backgroundColor: base.line.borderColor },
      dot: { width: base.dot_size, height: base.dot_size, borderRadius: theme.native.tokens.radius.full },
      line: { flex: 1, width: base.line.borderWidth, backgroundColor: base.line.borderColor },
      texts: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
      // The space between two steps (the rail's line runs through it); the last step has none, so the card's bottom equals its top.
      textsGap: { paddingBottom: themeSpace(theme, 'sm') },
      // The step the order is on is the title's weight; the ones done are plain text (OrderDelivery).
      title: { ...nativeTextStyle(base.title) },
      // The hour sits on the name's line too (its own text is smaller).
      time: { ...nativeTextStyle(base.time_text), lineHeight: nameLine, color: base.time_color }
    })
  }, [theme, base])
  return (
    <View testID='timeline-steps'>
      {steps.map((step, index) => (
        <View style={styles.step} key={step.key} testID={`timeline-step-${step.key}`}>
          <View style={styles.rail}>
            <View style={styles.dotBox} testID={`timeline-dot-${step.key}`}>
              <View style={[styles.join, index > 0 && styles.drawn]} />
              <View style={[styles.dot, { backgroundColor: step.current ? base.current_color : base.done_color }]} />
              <View style={[styles.join, index < steps.length - 1 && styles.drawn]} />
            </View>
            {index < steps.length - 1 && <View style={styles.line} />}
          </View>
          <View style={[styles.texts, index < steps.length - 1 && styles.textsGap]}>
            <OText style={step.current ? styles.title : undefined}>{label(step.key)}</OText>
            {step.at !== null && <OText style={styles.time}>{time(step.at)}</OText>}
          </View>
        </View>
      ))}
    </View>
  )
}

export const TimelineCard = ({ order, folded = false }: { order: any, folded?: boolean }) => {
  const [, t] = useLanguage()
  const { time } = useFormats()
  const label = useStepLabel()
  const [open, setOpen] = useState(false)
  const steps = useMemo(() => timelineSteps(order), [order])
  if (steps.length === 0) return null

  if (folded) {
    const summary = steps
      .filter((step) => step.at !== null)
      .map((step) => `${label(step.key)} ${time(step.at as number)}`)
      .join(' · ')
    return (
      <FoldedRow
        open={open}
        onToggle={() => setOpen(!open)}
        label={t('ORDER_TIMELINE', 'Order timeline')}
        header={(
          <>
            <OText preset='label'>{t('ORDER_TIMELINE', 'Order timeline')}</OText>
            {!open && !!summary && <OText preset='body_sm' color='text_muted' numberOfLines={2}>{summary}</OText>}
          </>
        )}
        body={<TimelineSteps steps={steps} />}
        testID='timeline-folded'
      />
    )
  }
  return (
    <OCard testID='timeline-card'>
      <TimelineSteps steps={steps} />
    </OCard>
  )
}

/**
 * Asks for a review of the customer once the order is over: the question, five stars and "Write a review". A star opens the review with that level chosen.
 */
export const ReviewCard = ({ onReview }: { onReview: (qualification?: number) => void }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  return (
    <OCard testID='review-card'>
      <OText preset='label'>{t('HOW_WAS_THIS_CUSTOMER', 'How was this customer?')}</OText>
      <OText preset='body_sm' color='text_muted'>{t('YOUR_REVIEW_HELPS_OTHER_STORES', 'Your review helps other stores.')}</OText>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Pressable
            key={level}
            style={({ pressed }) => [styles.star, pressed && styles.pressed]}
            accessibilityRole='button'
            accessibilityLabel={t('STARS_OF_FIVE', '_count_ of 5 stars').replace('_count_', String(level))}
            onPress={() => onReview(level)}
            testID={`review-star-${level}`}
          >
            <Icon name='star-outline' size='lg' color='border_strong' />
          </Pressable>
        ))}
      </View>
      <SlotButton slot='action' text={t('WRITE_A_REVIEW', 'Write a review')} onClick={() => onReview()} testID='review-write' />
    </OCard>
  )
}
