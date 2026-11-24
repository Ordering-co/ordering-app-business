import dayjs from 'dayjs'

import { PREP_TIME } from '../constants'
import { adjustedTotal, canAdjust, clampMinutes, readyBy, stepMinutes } from '../prepTime'

describe('the preparation time rules', () => {
  it('has the presets, step, bounds and default the owner chose (OQ-18 a)', () => {
    expect(PREP_TIME.presets).toEqual([10, 15, 20, 30, 45])
    expect(PREP_TIME.step).toBe(5)
    expect(PREP_TIME.min).toBe(0)
    expect(PREP_TIME.max).toBe(180)
    expect(PREP_TIME.default).toBe(20)
  })

  it('keeps a value inside 0 and 180 and whole (the old 6 to 9 became 59; 0 is no preparation time)', () => {
    expect(clampMinutes(0)).toBe(0)
    expect(clampMinutes(-3)).toBe(0)
    expect(clampMinutes(7)).toBe(7)
    expect(clampMinutes(9)).toBe(9)
    expect(clampMinutes(60)).toBe(60)
    expect(clampMinutes(1000)).toBe(180)
    expect(clampMinutes(12.6)).toBe(13)
    expect(clampMinutes(Number.NaN)).toBe(20)
  })

  it('steps by 5 and stops at the bounds', () => {
    expect(stepMinutes(20, 1)).toBe(25)
    expect(stepMinutes(20, -1)).toBe(15)
    expect(stepMinutes(5, -1)).toBe(0)
    expect(stepMinutes(0, -1)).toBe(0)
    expect(stepMinutes(0, 1)).toBe(5)
    expect(stepMinutes(180, 1)).toBe(180)
    expect(stepMinutes(8, 1)).toBe(13)
  })

  it('says when the order is ready', () => {
    const from = dayjs('2026-11-19T12:30:00')
    expect(readyBy(20, from).format('HH:mm')).toBe('12:50')
  })

  it('adds an adjustment to the promised total', () => {
    expect(adjustedTotal(20, 5)).toBe(25)
    expect(adjustedTotal(20, -5)).toBe(15)
    expect(adjustedTotal(7, -5)).toBe(2)
    expect(adjustedTotal(3, -5)).toBe(0)
    expect(adjustedTotal(178, 15)).toBe(180)
  })

  it('does not let the time end before the minutes already elapsed, nor leave the rule', () => {
    expect(canAdjust(20, -5, 10)).toBe(true)
    expect(canAdjust(20, -5, 15)).toBe(false)
    expect(canAdjust(20, -5, null)).toBe(true)
    expect(canAdjust(8, -5, null)).toBe(true)
    expect(canAdjust(3, -5, null)).toBe(false)
    expect(canAdjust(175, 10, null)).toBe(false)
  })
})
