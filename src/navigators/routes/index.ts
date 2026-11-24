import type { AppScreen } from './types'
import { accessScreens } from './access'
import { ordersScreens } from './orders'
import { orderDetailsScreens } from './orderDetails'
import { orderActionsScreens } from './orderActions'
import { messagesScreens } from './messages'
import { storesScreens } from './stores'
import { profileScreens } from './profile'
import { printersScreens } from './printers'

export type { AppScreen } from './types'

/**
 * Every stack screen of the app, by area. Each area exports its list from `routes/<area>.tsx`
 * (`export const <area>Screens: AppScreen[]`); the navigators mount them, nobody else edits a navigator.
 *
 * - `signedOutScreens`: the screens of someone who is not signed in (area `access`: Login, Forgot, the login
 *   code…). The root navigator adds the project step (`Home`) when the build asks for it.
 * - `signedInScreens`: the screens pushed over the tabs once signed in (every other area).
 */
export const signedOutScreens: AppScreen[] = [...accessScreens]

export const signedInScreens: AppScreen[] = [
  ...ordersScreens,
  ...orderDetailsScreens,
  ...orderActionsScreens,
  ...messagesScreens,
  ...storesScreens,
  ...profileScreens,
  ...printersScreens
]

/** The names every screen list holds twice: a route name is one screen, so a test asserts there are none. */
export const duplicateRouteNames = (...lists: AppScreen[][]): string[] => {
  const seen = new Set<string>()
  const duplicated = new Set<string>()
  for (const { name } of lists.flat()) {
    if (seen.has(name)) duplicated.add(name)
    seen.add(name)
  }
  return [...duplicated]
}

export { SHELL_ROUTES, FIRST_SIGNED_OUT_ROUTE } from './shellRoutes'
