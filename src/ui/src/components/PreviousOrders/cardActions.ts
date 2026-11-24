import { canAssignDriver } from '../OrderActions/rules'

/**
 * The buttons of an order card: which status step the order is at decides them (the rules of the order's details,
 * which the card shares). Pure: the card draws what this says.
 *
 * - pending (0): Reject and Accept (the two sheets of `orderActions`);
 * - accepted (7) or not ready (14), not a reservation: Mark ready (4);
 * - ready (4, 20, 21) or, for a reservation, accepted (7), with a type that is not delivery (1, 7):
 *   Not picked up (17) and Picked up (15); for a reservation Customer not arrived and Customer arrived;
 * - a delivery order the details can assign (`canAssignDriver`: accepted or ready, the project's rule) that has no driver:
 *   Assign driver (the sheet of the details, no status change). Ready: it is the card's one button. Accepted: it sits
 *   beside Mark ready as the `secondary` one (neutral, not the destructive look of `decline`). Asked only when the caller
 *   gives the project's `configs`; a group's card never asks (assignment is per order).
 */
export type CardActionKey = 'reject' | 'accept' | 'ready' | 'not_picked_up' | 'picked_up' | 'not_arrived' | 'arrived' | 'assign_driver'

export interface CardActions {
  decline?: CardActionKey
  advance?: CardActionKey
  /** A neutral step beside the main one (Assign driver beside Mark ready). */
  secondary?: CardActionKey
}

/** What the card needs to know whether the project and the user allow the manual assignment (the details' `canAssignDriver`). */
export interface AssignRule {
  configs?: Record<string, any> | null
  level?: number | null
}

const DELIVERY_TYPES = [1, 7]
const COMPLETE_STATUSES = [4, 20, 21]
const READY_STEP_STATUSES = [7, 14]

export const isReservation = (order: any) => Number(order?.delivery_type) === 9

/** The order has a driver (the list's `driver_id`, or the `driver` the payload embeds). */
export const orderHasDriver = (order: any): boolean => !!(order?.driver_id || order?.driver)

const stepActionsFor = (order: any): CardActions => {
  const status = Number(order?.status)
  if (status === 0) return { decline: 'reject', advance: 'accept' }
  const reservation = isReservation(order)
  if (READY_STEP_STATUSES.includes(status) && !reservation) return { advance: 'ready' }
  const completes = reservation ? [...COMPLETE_STATUSES, 7] : COMPLETE_STATUSES
  if (completes.includes(status) && !DELIVERY_TYPES.includes(Number(order?.delivery_type))) {
    return reservation
      ? { decline: 'not_arrived', advance: 'arrived' }
      : { decline: 'not_picked_up', advance: 'picked_up' }
  }
  return {}
}

export const cardActionsFor = (order: any, assign?: AssignRule): CardActions => {
  const steps = stepActionsFor(order)
  if (!assign || orderHasDriver(order) || !canAssignDriver(order, assign.configs, assign.level)) return steps
  return steps.advance ? { ...steps, secondary: 'assign_driver' } : { advance: 'assign_driver' }
}

/** The status each step sets (accept and reject are the sheets' own). */
export const STATUS_OF_STEP: Partial<Record<CardActionKey, number>> = {
  ready: 4,
  picked_up: 15,
  arrived: 15,
  not_picked_up: 17,
  not_arrived: 17
}

/** A step that cannot be undone and asks first (OQ-19 (a)). */
export const stepNeedsConfirmation = (key: CardActionKey) => key === 'not_picked_up' || key === 'not_arrived'
