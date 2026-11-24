// The areas' pages import the whole `@ui` barrel (printing, maps, webviews…): this test only reads the lists.
jest.mock('@ui', () => ({ __esModule: true }))
jest.mock('react-native-webview', () => ({ WebView: () => null }))
jest.mock('react-native-canvas', () => ({ __esModule: true, default: () => null }))

import { duplicateRouteNames, signedInScreens, signedOutScreens, SHELL_ROUTES } from '../routes'

/**
 * The route lists of the areas. Each area overwrites its `routes/<area>.tsx`; whatever they hold, the shell
 * mounts it, and a route name must be one screen.
 */
describe('the route lists of the areas', () => {
  it('has every list a navigator mounts, each an array of named screens', () => {
    for (const screen of [...signedOutScreens, ...signedInScreens]) {
      expect(typeof screen.name).toBe('string')
      expect(screen.name).not.toBe('')
      expect(screen.component).toBeTruthy()
    }
  })

  it('names no route twice, in the signed-out screens, the signed-in screens, or across both', () => {
    expect(duplicateRouteNames(signedOutScreens, signedInScreens)).toEqual([])
  })

  it('does not reuse the names of the shell\'s own routes', () => {
    const names = [...signedOutScreens, ...signedInScreens].map((screen) => screen.name)
    expect(SHELL_ROUTES).toEqual({ splash: 'Splash', project: 'Home', app: 'MyAccount', tabs: 'BottomTab' })
    for (const own of Object.values(SHELL_ROUTES)) expect(names).not.toContain(own)
    // The four tabs are the tab navigator's: a stack screen of that name would shadow `navigate('Orders')`.
    for (const tab of ['Orders', 'Messages', 'Stores', 'Profile']) expect(names).not.toContain(tab)
  })

  it('finds the names a list holds twice', () => {
    const screen = (name: string) => ({ name, component: () => null })
    expect(duplicateRouteNames([screen('A'), screen('B')], [screen('B'), screen('C'), screen('B')])).toEqual(['B'])
    expect(duplicateRouteNames([])).toEqual([])
  })
})
