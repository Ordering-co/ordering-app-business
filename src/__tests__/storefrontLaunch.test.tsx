import React from 'react'
import { waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '../../jest/helpers/renderWithProviders'
import RootNavigator from '../navigators/RootNavigator'

// A stack that shows the screen it is asked to start on (or the first one).
jest.mock('@react-navigation/stack', () => {
  const mockReact = require('react')
  const { View } = require('react-native')

  const flattenScreens = (nodes: any): any[] => {
    const screens: any[] = []
    mockReact.Children.forEach(nodes, (child: any) => {
      if (!mockReact.isValidElement(child)) return
      if (child.type === mockReact.Fragment) {
        screens.push(...flattenScreens(child.props.children))
        return
      }
      screens.push(child)
    })
    return screens
  }

  return {
    createStackNavigator: () => ({
      Navigator: ({ children, initialRouteName }: any) => {
        const screens = flattenScreens(children)
        const match = screens.find(child => child.props.name === initialRouteName) || screens[0]
        const ScreenComponent = match?.props?.component
        if (!ScreenComponent) return null
        return mockReact.createElement(View, null, mockReact.createElement(ScreenComponent, {
          navigation: { navigate: jest.fn() },
          route: { params: {} }
        }))
      },
      Screen: () => null
    })
  }
})

jest.mock('@ui', () => ({
  __esModule: true,
  StoreMethods: { _retrieveStoreData: jest.fn(async () => null), _setStoreData: jest.fn(), _removeStoreData: jest.fn() },
  Home: (props: object) => {
    const { Home } = require('../ui/src/components/Home')
    return require('react').createElement(Home, props)
  }
}))

jest.mock('../pages/Splash', () => () => null)
jest.mock('../pages/Login', () => () => require('react').createElement(require('react-native').Text, null, 'login screen'))
jest.mock('../pages/ForgotPassword', () => () => null)
jest.mock('../navigators/HomeNavigator', () => () => null)
jest.mock('../navigators/routes', () => ({
  signedOutScreens: [
    { name: 'Login', component: require('../pages/Login') },
    { name: 'Forgot', component: () => null }
  ]
}))
jest.mock('../config.json', () => ({ use_root_point: false, notification_app: 'businessapp' }))

jest.mock('react-native-onesignal', () => require('../../jest/helpers/mockOneSignal'))
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => null),
  getInitialNotification: jest.fn(async () => null),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn())
}))
jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn(async () => ({ status: 'denied' })),
  requestNotifications: jest.fn(async () => ({ status: 'granted' }))
}))

const ordering = require('@components')
const settings: any = require('../config.json')

describe('business launch, signed out', () => {
  beforeEach(() => {
    ordering.useSession.mockReturnValue([
      { auth: false, user: null, token: null, loading: false },
      { login: jest.fn() }
    ])
    ordering.useOrder.mockReturnValue([{ loading: false, carts: [], options: {} }, {}])
    ordering.useConfig.mockReturnValue([{ loading: false, configs: {} }])
    ordering.useApi.mockReturnValue([{ project: 'test', root: 'https://example.test' }, { setOrdering: jest.fn() }])
    ordering.useWebsocket.mockReturnValue({ on: jest.fn(), off: jest.fn() })
    settings.use_root_point = false
  })

  it('opens on the Login once the order options and the push setup resolve, with no screen before it', async () => {
    const view = renderWithProviders(<RootNavigator />)
    await waitFor(() => {
      expect(view.getByText('login screen')).toBeTruthy()
    })
    expect(view.queryByText('Manage your business')).toBeNull()
  })

  it('opens on the light project step instead when the build is a multi-project one (use_root_point)', async () => {
    settings.use_root_point = true
    const view = renderWithProviders(<RootNavigator />)
    await waitFor(() => {
      expect(view.getByText('Manage your business')).toBeTruthy()
    })
    expect(view.getByText('Set project')).toBeTruthy()
    expect(view.queryByText('login screen')).toBeNull()
  })
})
