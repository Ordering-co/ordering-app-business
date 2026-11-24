/** What a sheet asks of the screen that opened it, and what it tells back (see `.theme-audit/contracts/orderActions.md`). */

/** The details controller's request: resolves the updated order, or null / `{ error }` on a failure; may throw. */
export type ChangeStatus = (status: number | undefined, body: any, options?: any) => Promise<any> | any

/** The list controller's request: one answer per id (`withDetails`: `{ id, result, error, errorCodes, retryAfter }`). */
export type HandleChangeOrderStatus = (status: number | undefined, ids: number[], body: any, options?: any) => Promise<any> | any

export interface StatusRequestOptions {
  /** The orders of a group: the sheet speaks for the group (omit for one order). */
  orders?: any[]
  changeStatus?: ChangeStatus
  handleChangeOrderStatus?: HandleChangeOrderStatus
  /** Every order changed, or the change was queued offline. */
  onDone?: (orders: any[]) => void
  /** The sheet is gone, whatever the reason. */
  onClosed?: () => void
}

export interface AcceptOptions extends StatusRequestOptions {
  /** The minutes preselected (the sheet's own default is 20). */
  defaultMinutes?: number
  /**
   * Where the accept was started. `'list'` (a card of a list or of the board, the new-order alert): once it is sent the
   * app says so in a notice, with "View order" to go to the order. `'details'` (the order's own screen or panel): the owner
   * is already on the order, so nothing is said. Without it nothing is said either.
   */
  from?: 'list' | 'details'
  /** What "View order" does: shows the accepted order (the same thing a tap on its card does). Without it the notice has no action. */
  viewOrder?: (order: any) => void
}

export interface PrepTimeOptions extends StatusRequestOptions {
  /** When the order was accepted (the anchor of `prepared_in`); read from `order.history` when it is not given. */
  acceptedAt?: Date | string | number | null
}

export interface ForceStatusOptions extends StatusRequestOptions {
  /** The change the API refused for a status regression: `{ status, ...body }`. */
  pendingStatusBody: any
}

export interface AssignDriverOptions {
  /** The drivers, when the screen has them (the details controller); otherwise the sheet reads `controls/orders/:id`. */
  drivers?: any[]
  /** The assignment, when the screen has it (`handleAssignDriver`); otherwise the sheet saves `{ driver_id }` itself. */
  handleAssignDriver?: (driverId: number | null) => Promise<any> | any
  onDone?: (order: any) => void
  onClosed?: () => void
}

export interface MoreHandlers {
  onPrint?: () => void
  onCopy?: () => void
  onMessage?: () => void
  onShare?: () => void
  onClosed?: () => void
  /** Options of the sheets and the map the rows open (the same ones the screen would pass). */
  prepTime?: PrepTimeOptions
  assignDriver?: AssignDriverOptions
  driverLocation?: { lat: number | string, lng: number | string } | null
}

export interface ReviewOptions {
  /** A level chosen before the page opens (the stars of the done order). */
  qualification?: number
  /** A group's review: the list's `handleSendCustomerReview` wrapper; without it the controller sends the order's own. */
  handleCustomCustomerReview?: (body: { qualification: number, comment: string }) => any
  onClose?: () => void
}

export interface MapOptions {
  driverLocation?: { lat: number | string, lng: number | string } | null
  onClosed?: () => void
}

export type ActionKind = 'accept' | 'reject' | 'prepTime' | 'assignDriver' | 'more' | 'forceStatus' | 'map' | 'review'

export interface ActionRequest {
  /** A new number for every opening: a sheet that opens again starts clean. */
  key: number
  kind: ActionKind
  order: any
  opts: any
}
