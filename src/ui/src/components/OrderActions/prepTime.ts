import dayjs from 'dayjs'

import { PREP_TIME } from './constants'

/** A number of minutes inside the rule: a whole number from `min` to `max`. */
export const clampMinutes = (value: number): number => {
  const whole = Math.round(Number(value))
  if (!Number.isFinite(whole)) return PREP_TIME.default
  return Math.min(PREP_TIME.max, Math.max(PREP_TIME.min, whole))
}

/** One step of the stepper, up (`1`) or down (`-1`), inside the rule. */
export const stepMinutes = (value: number, direction: 1 | -1): number =>
  clampMinutes(value + direction * PREP_TIME.step)

/** The moment the order is ready if it is accepted now with that preparation time. */
export const readyBy = (minutes: number, from: dayjs.Dayjs = dayjs()): dayjs.Dayjs => from.add(minutes, 'minute')

/** The new total of an adjustment: `prepared_in` plus the change, inside the rule. */
export const adjustedTotal = (preparedIn: number, delta: number): number => clampMinutes(Number(preparedIn) + delta)

/**
 * Whether an adjustment is possible: the new total is inside the rule and not behind the minutes that have passed since
 * the order was accepted (the time cannot end before now).
 */
export const canAdjust = (preparedIn: number, delta: number, elapsedMinutes: number | null): boolean => {
  const next = Number(preparedIn) + delta
  if (next < PREP_TIME.min || next > PREP_TIME.max) return false
  return elapsedMinutes === null || next > elapsedMinutes
}
