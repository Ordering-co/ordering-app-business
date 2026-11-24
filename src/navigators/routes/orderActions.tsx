import type { AppScreen } from './types'

/**
 * Area `orderActions` has no stack screen. The accept, reject, adjust-time, assign-driver and more sheets, the map and
 * the review are drawn by `OrderActionsHost` (mounted once by the shell) over whatever screen opens them
 * (`useOrderActions()`), so they work the same over the list, the details and the tablet panel, and no route carries
 * a function in its params. The old `AcceptOrRejectOrder` route and page are gone.
 */
export const orderActionsScreens: AppScreen[] = []
