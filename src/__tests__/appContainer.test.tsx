import React from 'react'
import { StatusBar } from 'react-native'

import { renderWithProviders } from '../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../theme/engine'
import { themeColor, themeFontFamily } from '../theme/helpers'
import { navigationThemeOf } from '../theme/navigation'

// The navigation container, keeping the props it was given.
const mockNavigationContainer = jest.fn(({ children }: any) => children)
jest.mock('@react-navigation/native', () => ({
  // React Navigation 7 reads the fonts of its theme: the library's own weights are part of what the app maps.
  DefaultTheme: jest.requireActual('@react-navigation/native').DefaultTheme,
  NavigationContainer: (props: any) => mockNavigationContainer(props)
}))

jest.mock('../navigators/RootNavigator', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>root navigator</Text> }
})

import AppContainer from '../AppContainer'
import { navigationRef } from '../navigators/NavigationRef'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('AppContainer', () => {
  beforeEach(() => mockNavigationContainer.mockClear())

  it('mounts the navigation with the ref the push and the alert navigate through, and no status bar of its own', () => {
    const { getByText, UNSAFE_queryAllByType } = renderWithProviders(<AppContainer />)
    expect(getByText('root navigator')).toBeTruthy()
    expect(mockNavigationContainer.mock.calls[0][0].ref).toBe(navigationRef)
    // The one status bar is BusinessApp's (ThemedStatusBar), above the navigation.
    expect(UNSAFE_queryAllByType(StatusBar)).toHaveLength(0)
  })
})

describe('the navigation\'s own paint', () => {
  it('is the theme\'s colors by role, not the library\'s defaults', () => {
    const theme = defaultAppTheme()
    renderWithProviders(<AppContainer />)
    const given = mockNavigationContainer.mock.calls[0][0].theme
    expect(given).toEqual(navigationThemeOf(theme))
    expect(given.dark).toBe(false)
    expect(given.colors.background).toBe(themeColor(theme, 'background'))
    expect(given.colors.card).toBe(themeColor(theme, 'surface'))
    expect(given.colors.border).toBe(themeColor(theme, 'border'))
  })

  it('has the fonts React Navigation 7 reads, in the theme\'s body font and without a weight of their own', () => {
    const theme = defaultAppTheme()
    renderWithProviders(<AppContainer />)
    const { fonts } = mockNavigationContainer.mock.calls[0][0].theme
    expect(Object.keys(fonts).sort()).toEqual(['bold', 'heavy', 'medium', 'regular'])
    expect(fonts.regular).toEqual({ fontFamily: themeFontFamily(theme, 'body', 400) })
    expect(fonts.heavy).toEqual({ fontFamily: themeFontFamily(theme, 'body', 700) })
    for (const font of Object.values<any>(fonts)) expect(font.fontWeight).toBeUndefined()
  })

  it('follows a dark background', () => {
    const custom = themeWith({ tokens: { color: { background: '#101010' } } })
    renderWithProviders(<AppContainer />, { themeOverrides: custom })
    const given = mockNavigationContainer.mock.calls[0][0].theme
    expect(given.dark).toBe(true)
    expect(given.colors.background).toBe('#101010')
  })
})
