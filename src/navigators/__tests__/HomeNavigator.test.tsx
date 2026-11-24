import React from 'react'
import { Text } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { useApi, useSession, useWebsocket } from '@components'
import HomeNavigator from '../HomeNavigator'

jest.mock('@react-navigation/stack', () => {
  const mockReact = require('react')
  const { Text: ScreenName, View: Box } = require('react-native')
  return {
    createStackNavigator: () => ({
      Navigator: ({ children, initialRouteName }: any) => mockReact.createElement(Box, null,
        mockReact.createElement(ScreenName, null, `initial: ${initialRouteName}`), children),
      Screen: ({ name, component: Component }: any) => mockReact.createElement(Box, null,
        mockReact.createElement(ScreenName, null, `screen: ${name}`),
        Component ? mockReact.createElement(Component, { navigation: {}, route: { params: {} } }) : null)
    })
  }
})

// The tabs read the Messages count; a screen of an area reports into it, as the list does.
jest.mock('../BottomNavigator', () => {
  const mockReact = require('react')
  const { Text: Label } = require('react-native')
  const { useUnreadMessages } = require('../../context/UnreadMessagesContext')
  return {
    __esModule: true,
    default: () => mockReact.createElement(Label, null, `tabs: ${JSON.stringify(useUnreadMessages())}`)
  }
})
jest.mock('../routes', () => {
  const mockReact = require('react')
  const { useReportUnreadMessages } = require('../../context/UnreadMessagesContext')
  return {
    signedInScreens: [
      { name: 'OrderDetails', component: () => null },
      { name: 'Lists', component: () => { useReportUnreadMessages({ total: 2, more: true }); return null } },
      { name: 'Chat', component: () => null, options: { gestureEnabled: false } }
    ]
  }
})
jest.mock('../GlobalOverlays', () => ({ GlobalOverlays: () => require('react').createElement(require('react-native').Text, null, 'global overlays') }))
jest.mock('../NotificationPermissionPrompt', () => ({
  NotificationPermissionPrompt: (props: any) => require('react').createElement(require('react-native').Text, null, `permission prompt auth=${props.auth} loaded=${props.loaded}`)
}))
jest.mock('../../pages/Splash', () => ({ __esModule: true, default: () => null }))

const business = (level = 2) => ({ id: 7, level })
const world = ({ loading = false, level = 2, connected = true, socket = { join: jest.fn() } }: any = {}) => {
  ;(useSession as jest.Mock).mockReturnValue([{ loading, user: business(level) }])
  ;(useWebsocket as jest.Mock).mockReturnValue(socket)
  ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }])
  ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: connected })
  return socket
}

describe('HomeNavigator (the signed-in app)', () => {
  it('opens on the tabs, then mounts every area\'s screens in the order they were listed', () => {
    world()
    const view = renderWithProviders(<HomeNavigator />)
    expect(view.getByText('initial: BottomTab')).toBeTruthy()
    const names = view.getAllByText(/^screen: /).map((node) => node.props.children)
    expect(names).toEqual(['screen: BottomTab', 'screen: OrderDetails', 'screen: Lists', 'screen: Chat'])
  })

  it('shows the loading page while the session loads, and nothing of the app', () => {
    world({ loading: true })
    const view = renderWithProviders(<HomeNavigator />)
    expect(view.queryByText('screen: Splash')).toBeTruthy()
    expect(view.queryByText('screen: BottomTab')).toBeNull()
    expect(view.queryByText('global overlays')).toBeNull()
    expect(view.queryByText(/permission prompt/)).toBeNull()
  })

  it('mounts the global overlays and the notification explainer once, over the tabs and the stack', () => {
    world()
    const view = renderWithProviders(<HomeNavigator />)
    expect(view.getAllByText('global overlays')).toHaveLength(1)
    expect(view.getByText('permission prompt auth=true loaded=true')).toBeTruthy()
  })

  it('gives the Messages list the room to report its unread count, and the tabs the count', () => {
    world()
    const view = renderWithProviders(<HomeNavigator />)
    expect(view.getByText('tabs: {"total":2,"more":true}')).toBeTruthy()
  })

  describe('the socket rooms', () => {
    it('joins the manager\'s orders room and the messages room of the business, when connected', () => {
      const socket = world()
      renderWithProviders(<HomeNavigator />)
      expect(socket.join).toHaveBeenCalledWith({ project: 'demo', room: 'orders', user_id: 7, role: 'manager' })
      expect(socket.join).toHaveBeenCalledWith('messages_orders_7')
    })

    it('joins the messages room of everyone for an admin (level 0)', () => {
      const socket = world({ level: 0 })
      renderWithProviders(<HomeNavigator />)
      expect(socket.join).toHaveBeenCalledWith('messages_orders')
      expect(socket.join).not.toHaveBeenCalledWith('messages_orders_7')
    })

    it('joins nothing while offline', () => {
      const socket = world({ connected: false })
      renderWithProviders(<HomeNavigator />)
      expect(socket.join).not.toHaveBeenCalled()
    })
  })
})
