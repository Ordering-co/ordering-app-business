/**
 * The rules of the preparation time, as the app's own constants (OQ-18 (a)): no server config gives presets, a default
 * or limits (`prepared_in` is a free integer of minutes). The presets are the five chips of the accept sheet, `step` is
 * the stepper's, `adjustments` the chips of the adjust sheet. The minimum is 0 (the owner's choice, 2026-11-23: an order that is
 * ready at once can be accepted with no preparation time); it was 5.
 */
export const PREP_TIME = {
  presets: [10, 15, 20, 30, 45],
  step: 5,
  min: 0,
  max: 180,
  default: 20,
  adjustments: [-5, 5, 10, 15]
} as const

/** What a sheet that opens another waits for (ms): the first one's fade, so the system does not present over a dismissal. */
export const HANDOFF_DELAY_MS = 350

/**
 * How long the notice after an accepted order stays on screen (ms): long enough to read it and to reach "View order" with
 * a busy hand, short enough not to cover the list the owner goes on working in.
 */
export const ACCEPTED_NOTICE_MS = 5000

/** The actions of the business app, as the old flow named them: each one is a status change and the body it sends. */
export const BUSINESS_ACTIONS = {
  accept: 'acceptByBusiness',
  reject: 'rejectByBusiness',
  forceStatus: 'forceStatus'
} as const

/** The statuses whose customer may be reviewed (today's list plus 15, a completed pickup: OQ-17 / area 4, 7.7). */
export const REVIEWABLE_STATUSES = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]

/** The statuses whose chat is closed: no message to the customer. */
export const ENDED_STATUSES = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]

/** The statuses that can still have their preparation time adjusted (accepted, not ready). */
export const ADJUSTABLE_STATUSES = [7, 14]

/** The statuses where a driver can be assigned by hand (today's rule: accepted or ready, delivery orders). */
export const ASSIGNABLE_STATUSES = [7, 4]
export const ASSIGNABLE_DELIVERY_TYPES = [1, 7]
