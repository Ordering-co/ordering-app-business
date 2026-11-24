import type { BadgeVariant } from './OBadge'

/**
 * An order's status and time state as the theme's states (decision D4): the
 * one place of the app that turns a status number or a time status into a
 * badge variant or a color role (the orders list, the messages list, the
 * driver map, the order's details).
 */

/** Pending and pre-order: the orders waiting for the store (the "New" tab, the `pending` group of the orders list). */
const PENDING_STATUSES = [0, 13]
/** Completed (by the store, the driver or the customer). */
const COMPLETED_STATUSES = [1, 11, 15]
/** Rejected, cancelled or failed. */
const NEGATIVE_STATUSES = [2, 5, 6, 10, 12, 16, 17]

/**
 * The kit's chips: a new order (pending, pre-order) is `warning` (yellow), the ones in progress `primary` (blue),
 * completed `success`, rejected / cancelled / failed `danger`.
 */
export const orderStatusVariant = (status: number | string | null | undefined): BadgeVariant => {
  if (status === null || status === undefined || status === '') return 'primary'
  const code = Number(status)
  if (PENDING_STATUSES.includes(code)) return 'warning'
  if (COMPLETED_STATUSES.includes(code)) return 'success'
  if (NEGATIVE_STATUSES.includes(code)) return 'danger'
  return 'primary'
}

export type TimeState = 'success' | 'warning' | 'danger'

const TIME_STATES: Record<string, TimeState> = { in_time: 'success', at_risk: 'warning', delayed: 'danger' }

/** In time / at risk / delayed as `success` / `warning` / `danger`; null for an order without a time status. */
export const timeStateOf = (timeStatus: string | null | undefined): TimeState | null =>
  (timeStatus && TIME_STATES[timeStatus]) || null

/** The badge of a time state; an order without one (not measured yet) is `neutral`. */
export const timeStatusVariant = (timeStatus: string | null | undefined): BadgeVariant => timeStateOf(timeStatus) ?? 'neutral'

/** The soft variants an order card's band is painted with. */
export type OrderBandVariant = 'primary_soft' | 'success_soft' | 'warning_soft' | 'danger_soft'

const BAND_OF: Partial<Record<BadgeVariant, OrderBandVariant>> = { warning: 'warning_soft', success: 'success_soft', danger: 'danger_soft' }

/**
 * The colour of an order card's band (the owner's choice of 2026-11-23): the soft form of its status's own colour (a new
 * order `warning`, one in progress `primary`, completed `success`, rejected / cancelled `danger`), unless the order is at
 * risk or late: then the time's state wins (`warning`, `danger`), so a late order is red whatever its status says.
 */
export const orderBandVariant = (status: number | string | null | undefined, time?: TimeState | null): OrderBandVariant => {
  if (time === 'danger' || time === 'warning') return `${time}_soft`
  return BAND_OF[orderStatusVariant(status)] ?? 'primary_soft'
}
