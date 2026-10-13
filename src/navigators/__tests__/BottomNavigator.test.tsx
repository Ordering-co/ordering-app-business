import React from 'react'
import { render } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'

import theme from '@/theme.json'

const capturedScreenOptions: any[] = []

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children, screenOptions }: any) => {
      capturedScreenOptions.push(screenOptions)
      return children
    },
    Screen: () => null
  })
}))
jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))
jest.mock('@components', () => ({
  useLanguage: () => [null, (_key: string, fallback: string) => fallback]
}))
jest.mock('../../pages/Profile', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/MyOrders', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/Stores', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/Messages', () => ({ __esModule: true, default: () => null }))

import BottomNavigator from '../BottomNavigator'

describe('BottomNavigator', () => {
  beforeEach(() => {
    capturedScreenOptions.length = 0
    render(
      <ThemeProvider theme={theme}>
        <BottomNavigator />
      </ThemeProvider>
    )
  })

  it('pins tab labels below the icon so they do not wrap in landscape', () => {
    expect(capturedScreenOptions[0].tabBarLabelPosition).toBe('below-icon')
  })

  it('keeps the built-in label hidden since the label is drawn inside the icon', () => {
    expect(capturedScreenOptions[0].tabBarShowLabel).toBe(false)
  })

  it.each([theme.colors.primary, '#FFB700', '#A020F0'])(
    'uses the configured primary color %s for the active tab',
    (primary) => {
      const customTheme = { ...theme, colors: { ...theme.colors, primary } }
      render(
        <ThemeProvider theme={customTheme}>
          <BottomNavigator />
        </ThemeProvider>
      )

      const options = capturedScreenOptions[capturedScreenOptions.length - 1]
      expect(options.tabBarActiveTintColor).toBe(primary)
      expect(options.tabBarInactiveTintColor).toBe(theme.colors.secondaryLightColor)
    }
  )

  it('updates the active tab color when the provided theme changes', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <BottomNavigator />
      </ThemeProvider>
    )
    const updatedTheme = { ...theme, colors: { ...theme.colors, primary: '#FFB700' } }

    rerender(
      <ThemeProvider theme={updatedTheme}>
        <BottomNavigator />
      </ThemeProvider>
    )

    expect(capturedScreenOptions[capturedScreenOptions.length - 1].tabBarActiveTintColor)
      .toBe('#FFB700')
  })
})
