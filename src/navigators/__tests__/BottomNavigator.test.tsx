import React from 'react'
import { Text } from 'react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../jest/helpers/themeWithValues'

// The tab navigator, keeping what it was given: its props and the screens it lists.
const mockTabs = { props: null as any, screens: [] as any[] }
jest.mock('@react-navigation/bottom-tabs', () => {
  const mockReact = require('react')
  return {
    createBottomTabNavigator: () => ({
      Navigator: (props: any) => {
        mockTabs.props = props
        mockTabs.screens = mockReact.Children.toArray(props.children).map((child: any) => child.props)
        return null
      },
      Screen: () => null
    })
  }
})

const mockWindow = { width: 390, height: 844 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ ...mockWindow, scale: 3, fontScale: 1 })
}))

jest.mock('../../ui/src/components/AppShell', () => {
  const { Text: Label } = require('react-native')
  const mockReact = require('react')
  return { AppTabBar: (props: any) => mockReact.createElement(Label, null, `bar:${props.marker}`) }
})
jest.mock('../../pages/Profile', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/MyOrders', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/Stores', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/Messages', () => ({ __esModule: true, default: () => null }))

import BottomNavigator from '../BottomNavigator'

const draw = (options: { platform?: 'phone' | 'tablet', theme?: any } = {}) =>
  renderWithProviders(<BottomNavigator />, { platform: options.platform, themeOverrides: options.theme })

describe('BottomNavigator', () => {
  beforeEach(() => { mockWindow.width = 390; mockWindow.height = 844 })

  it('has the four tabs of the contract, Orders first and opening first', () => {
    draw()
    expect(mockTabs.screens.map((screen) => screen.name)).toEqual(['Orders', 'Messages', 'Stores', 'Profile'])
    expect(mockTabs.props.initialRouteName).toBe('Orders')
    expect(mockTabs.props.screenOptions.headerShown).toBe(false)
  })

  it('draws the bar and the rail with its own tab bar, the same function every render (no remount per render)', () => {
    draw()
    const first = mockTabs.props.tabBar
    expect(typeof first).toBe('function')
    draw()
    expect(mockTabs.props.tabBar).toBe(first)
    const { getByText } = renderWithProviders(first({ marker: 'x' }))
    expect(getByText('bar:x')).toBeTruthy()
  })

  it('puts the bar at the bottom on a phone and on a tablet held upright', () => {
    draw()
    expect(mockTabs.props.screenOptions.tabBarPosition).toBe('bottom')
    mockWindow.width = 834; mockWindow.height = 1194
    draw({ platform: 'tablet' })
    expect(mockTabs.props.screenOptions.tabBarPosition).toBe('bottom')
  })

  it('puts it at the left, as the rail, on a tablet held sideways', () => {
    mockWindow.width = 1180; mockWindow.height = 820
    draw({ platform: 'tablet' })
    expect(mockTabs.props.screenOptions.tabBarPosition).toBe('left')
  })

  it('keeps a phone held sideways at the bottom (the rail is the tablet\'s)', () => {
    mockWindow.width = 844; mockWindow.height = 390
    draw()
    expect(mockTabs.props.screenOptions.tabBarPosition).toBe('bottom')
  })

  it('paints the scenes with the page\'s background', () => {
    draw()
    expect(mockTabs.props.screenOptions.sceneStyle).toEqual({ backgroundColor: '#FFFFFF' })
    draw({ theme: themeWithValues((values) => { values.tokens.color.background = '#101010' }) })
    expect(mockTabs.props.screenOptions.sceneStyle).toEqual({ backgroundColor: '#101010' })
  })

  it('builds the Messages tab at launch (its list feeds the unread count) unless the theme hides the tab', () => {
    draw()
    expect(mockTabs.screens.find((screen) => screen.name === 'Messages').options.lazy).toBe(false)
    draw({ theme: themeWithValues((values) => { values.visibility['bottom_nav.messages'] = false }) })
    expect(mockTabs.screens.find((screen) => screen.name === 'Messages').options.lazy).toBe(true)
  })
})
