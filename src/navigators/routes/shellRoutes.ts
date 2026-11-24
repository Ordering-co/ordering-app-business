/**
 * The routes the shell itself registers: an area must not reuse these names (a test asserts it). The four tabs
 * (`Orders`, `Messages`, `Stores`, `Profile`) are the tab navigator's and are reserved too.
 */
export const SHELL_ROUTES = {
  /** The loading page (root, and the signed-in stack while the session loads). */
  splash: 'Splash',
  /** The project step of a multi-project build (`use_root_point`), the first screen of a signed-out launch. */
  project: 'Home',
  /** The signed-in app (`HomeNavigator`). */
  app: 'MyAccount',
  /** The tabs, inside the signed-in app: `navigate('BottomTab', { screen: 'Orders' })`. */
  tabs: 'BottomTab'
} as const

/** The first screen of a signed-out launch (area `access`'s Login), unless the project step comes before it. */
export const FIRST_SIGNED_OUT_ROUTE = 'Login'
