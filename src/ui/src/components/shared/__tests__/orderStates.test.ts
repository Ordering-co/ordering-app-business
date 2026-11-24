import { orderBandVariant, orderStatusVariant, timeStateOf, timeStatusVariant } from '../orderStates'
import { themeColor } from '../../../../../theme/helpers'
import { defaultAppTheme } from '../../../../../theme/engine'

/** In progress, and a status the app does not know. */
const IN_PROGRESS = [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 99, undefined, null]
/** New: pending and pre-order. */
const PENDING = [0, 13]
const COMPLETED = [1, 11, 15]
const NEGATIVE = [2, 5, 6, 10, 12, 16, 17]

describe('orderStatusVariant (decision D4)', () => {
  it('paints a new order (pending, pre-order) as warning, the kit\'s yellow chip', () => {
    for (const status of PENDING) expect(orderStatusVariant(status)).toBe('warning')
    expect(orderStatusVariant('0')).toBe('warning')
  })

  it('paints the orders in progress as primary, as a status it does not know', () => {
    for (const status of IN_PROGRESS) expect(orderStatusVariant(status)).toBe('primary')
  })

  it('paints completed as success', () => {
    for (const status of COMPLETED) expect(orderStatusVariant(status)).toBe('success')
  })

  it('paints rejected, cancelled and failed as danger', () => {
    for (const status of NEGATIVE) expect(orderStatusVariant(status)).toBe('danger')
  })

  it('takes the status as the API sends it, a number or its text', () => {
    expect(orderStatusVariant('11')).toBe('success')
    expect(orderStatusVariant('2')).toBe('danger')
    expect(orderStatusVariant(undefined)).toBe('primary')
  })
})

describe('timeStateOf (decision D4)', () => {
  it('maps in time, at risk and delayed to success, warning and danger', () => {
    expect(timeStateOf('in_time')).toBe('success')
    expect(timeStateOf('at_risk')).toBe('warning')
    expect(timeStateOf('delayed')).toBe('danger')
  })

  it('gives no state to an order without a time status', () => {
    expect(timeStateOf(null)).toBeNull()
    expect(timeStateOf(undefined)).toBeNull()
    expect(timeStateOf('unknown')).toBeNull()
  })
})

describe('timeStatusVariant (decision D4)', () => {
  it('paints a time state with its badge', () => {
    expect(timeStatusVariant('in_time')).toBe('success')
    expect(timeStatusVariant('at_risk')).toBe('warning')
    expect(timeStatusVariant('delayed')).toBe('danger')
  })

  it('paints an order without a time status as neutral', () => {
    expect(timeStatusVariant(null)).toBe('neutral')
    expect(timeStatusVariant(undefined)).toBe('neutral')
    expect(timeStatusVariant('unknown')).toBe('neutral')
  })
})

describe('orderBandVariant (the order card\'s band, 2026-11-23)', () => {
  it('paints the band with the soft form of the status\'s own colour', () => {
    for (const status of PENDING) expect(orderBandVariant(status)).toBe('warning_soft')
    for (const status of IN_PROGRESS) expect(orderBandVariant(status)).toBe('primary_soft')
    for (const status of COMPLETED) expect(orderBandVariant(status)).toBe('success_soft')
    for (const status of NEGATIVE) expect(orderBandVariant(status)).toBe('danger_soft')
    expect(orderBandVariant('11')).toBe('success_soft')
  })

  it('an at-risk time wins over the status: warning, whatever the status says', () => {
    for (const status of [0, 7, 4, 1, 5, undefined]) expect(orderBandVariant(status, 'warning')).toBe('warning_soft')
  })

  it('a late time wins over the status: danger, whatever the status says', () => {
    for (const status of [0, 7, 4, 1, 5, undefined]) expect(orderBandVariant(status, 'danger')).toBe('danger_soft')
  })

  it('an in-time or an absent time leaves the status\'s colour', () => {
    expect(orderBandVariant(7, 'success')).toBe('primary_soft')
    expect(orderBandVariant(7, null)).toBe('primary_soft')
    expect(orderBandVariant(5, undefined)).toBe('danger_soft')
    expect(orderBandVariant(1, 'success')).toBe('success_soft')
  })
})
