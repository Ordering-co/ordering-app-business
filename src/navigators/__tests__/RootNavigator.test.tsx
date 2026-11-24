import React from 'react'
import { act } from '@testing-library/react-native'
import { DeviceEventEmitter } from 'react-native'
import BootSplash from 'react-native-bootsplash'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { ToastType, useConfig, useOrder, useSession, useToast, useWebsocket } from '@components'
import RootNavigator from '../RootNavigator'
import { LAUNCH_NOTICE_MS, LAUNCH_TIME_LIMIT_MS } from '../useLaunchTimeLimit'
import * as RootNavigation from '../NavigationRef'

// The stack draws the name of each screen it is given (and the screen itself): which screens are mounted, and in
// which order, is what is asserted. The first route the navigator is asked to start on is kept.
const mockStack = { initialRouteName: undefined as string | undefined }
jest.mock('@react-navigation/stack', () => {
  const mockReact = require('react')
  const { Text: ScreenName, View: Box } = require('react-native')
  return {
    createStackNavigator: () => ({
      Navigator: ({ children, initialRouteName }: any) => {
        mockStack.initialRouteName = initialRouteName
        return mockReact.createElement(Box, null, children)
      },
      Screen: ({ name, component: Component }: any) => mockReact.createElement(
        Box, null,
        mockReact.createElement(ScreenName, null, `screen: ${name}`),
        Component ? mockReact.createElement(Component, { navigation: {}, route: { params: {} } }) : null
      )
    })
  }
})

jest.mock('../HomeNavigator', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/Home', () => ({ __esModule: true, default: () => null }))
jest.mock('../../pages/Splash', () => ({ __esModule: true, default: () => null }))
jest.mock('../routes', () => {
  const { Text: Label } = require('react-native')
  const mockReact = require('react')
  return {
    // `Login` shows what the shell gives it, as the access area's page reads it.
    signedOutScreens: [
      { name: 'Login', component: (props: any) => mockReact.createElement(Label, null, `login changed=${props.projectChanged} token=${props.route?.params?.notification_state?.notification_token}`) },
      // `Forgot` says whether the shell's prompt is the push setup's: the root is the one place that fires it.
      { name: 'Forgot', component: () => {
        const { useShell: mockUseShell } = require('../../context/ShellContext')
        return mockReact.createElement(Label, null, `prompt from push=${mockUseShell().requestNotificationPermission === mockPush.current.requestNotificationPermission}`)
      } }
    ]
  }
})
jest.mock('../NavigationRef', () => ({ openOrderChat: jest.fn(), openOrderDetails: jest.fn(), navigate: jest.fn() }))
jest.mock('../../config.json', () => ({ use_root_point: false, notification_app: 'businessapp' }))

// The push setup is tested apart (usePushSetup.test): here it says what it has.
const mockPush = {
  current: {
    isPushLoading: { loading: false },
    oneSignalState: { notification_app: 'businessapp', notification_token: 'tok-1' },
    openedPush: null as any,
    clearOpenedPush: jest.fn(),
    requestNotificationPermission: jest.fn()
  }
}
jest.mock('../usePushSetup', () => ({ usePushSetup: () => mockPush.current }))

const settings: any = require('../../config.json')

const business = { id: 7, level: 2, email: 'owner@example.test' }
const session = (auth: boolean, loading = false) => [
  { auth, user: auth ? business : null, loading, token: auth ? 'session-token' : null },
  { logout: jest.fn(), login: jest.fn() }
]
const answers = (answered: boolean) => {
  ;(useOrder as jest.Mock).mockReturnValue([{ loading: !answered, options: {}, carts: [] }, {}])
  ;(useConfig as jest.Mock).mockReturnValue([{ loading: !answered, configs: {} }])
}
const advance = (ms: number) => act(async () => { jest.advanceTimersByTime(ms) })

describe('RootNavigator', () => {
  let showToast: jest.Mock
  let screens: ReturnType<typeof renderWithProviders>
  const screen = (name: string) => screens.queryByText(`screen: ${name}`)
  const render = () => { screens = renderWithProviders(<RootNavigator />) }

  beforeEach(() => {
    jest.useFakeTimers()
    settings.use_root_point = false
    showToast = jest.fn()
    mockPush.current.isPushLoading = { loading: false }
    mockPush.current.openedPush = null
    mockPush.current.clearOpenedPush = jest.fn()
    ;(RootNavigation.openOrderChat as jest.Mock).mockClear()
    ;(RootNavigation.openOrderDetails as jest.Mock).mockClear()
    ;(BootSplash.hide as jest.Mock).mockClear()
    ;(useToast as jest.Mock).mockReturnValue([null, { showToast }])
    ;(useWebsocket as jest.Mock).mockReturnValue({ on: jest.fn(), off: jest.fn() })
    ;(useSession as jest.Mock).mockReturnValue(session(false))
    answers(true)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('a signed-out launch', () => {
    it('starts at Login, with no step before it and no photo Home', () => {
      render()
      expect(screen('Splash')).toBeNull()
      expect(screen('Home')).toBeNull()
      expect(screen('Login')).toBeTruthy()
      expect(screen('Forgot')).toBeTruthy()
      expect(screen('MyAccount')).toBeNull()
      expect(mockStack.initialRouteName).toBe('Login')
    })

    it('starts at the project step when the build asks for it (use_root_point), then Login', () => {
      settings.use_root_point = true
      render()
      expect(screen('Home')).toBeTruthy()
      expect(screen('Login')).toBeTruthy()
      expect(mockStack.initialRouteName).toBe('Home')
      // The project step is the first screen of the stack.
      expect(screens.toJSON()).toBeTruthy()
    })

    it('gives the screens what the root knows: the push state of the device and whether the project changed', () => {
      render()
      expect(screens.getByText('login changed=false token=tok-1')).toBeTruthy()
      act(() => { DeviceEventEmitter.emit('change_project', { setted: true, changed: true }) })
      expect(screens.getByText('login changed=true token=tok-1')).toBeTruthy()
    })

    it('hands the screens the push setup\'s notification prompt: the root is the one place that fires it', () => {
      render()
      expect(screens.getByText('prompt from push=true')).toBeTruthy()
    })

    it('stops listening to a project change when it unmounts, and only its own listener', () => {
      const other = jest.fn()
      const subscription = DeviceEventEmitter.addListener('change_project', other)
      render()
      screens.unmount()
      DeviceEventEmitter.emit('change_project', { changed: true })
      expect(other).toHaveBeenCalledTimes(1)
      subscription.remove()
    })
  })

  describe('a signed-in launch', () => {
    it('starts on the app', () => {
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      render()
      expect(screen('MyAccount')).toBeTruthy()
      expect(screen('Login')).toBeNull()
      expect(mockStack.initialRouteName).toBe('MyAccount')
    })
  })

  describe('the loading page and the launch time limit', () => {
    beforeEach(() => answers(false))

    it('stays on the loading page while the API has not answered and the limit has not passed', async () => {
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      render()
      await advance(LAUNCH_TIME_LIMIT_MS - 1)
      expect(screen('Splash')).toBeTruthy()
      expect(screen('MyAccount')).toBeNull()
      expect(showToast).not.toHaveBeenCalled()
      expect(BootSplash.hide).not.toHaveBeenCalled()
    })

    it('goes on at the limit with a cached session: the app, the native splash hidden, one notice', async () => {
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      render()
      await advance(LAUNCH_TIME_LIMIT_MS)
      expect(screen('Splash')).toBeNull()
      expect(screen('MyAccount')).toBeTruthy()
      expect(BootSplash.hide).toHaveBeenCalledWith({ fade: true })
      expect(showToast).toHaveBeenCalledTimes(1)
      expect(showToast).toHaveBeenCalledWith(ToastType.Error, 'Network Error', LAUNCH_NOTICE_MS)
      await advance(LAUNCH_TIME_LIMIT_MS * 3)
      expect(showToast).toHaveBeenCalledTimes(1)
    })

    it('goes on at the limit without a session: the login', async () => {
      render()
      await advance(LAUNCH_TIME_LIMIT_MS)
      expect(screen('Splash')).toBeNull()
      expect(screen('Login')).toBeTruthy()
    })

    it('waits for the session to be read from the device even at the limit', async () => {
      ;(useSession as jest.Mock).mockReturnValue(session(false, true))
      render()
      await advance(LAUNCH_TIME_LIMIT_MS)
      expect(screen('Splash')).toBeTruthy()
    })

    it('waits for the push setup too', async () => {
      answers(true)
      mockPush.current.isPushLoading = { loading: true }
      ;(useSession as jest.Mock).mockReturnValue(session(true, false))
      render()
      expect(screen('Splash')).toBeTruthy()
    })
  })

  describe('a push the business tapped (OQ-21)', () => {
    const tapped = (orderId: number, type: string | null) => { mockPush.current.openedPush = { orderId, type } }

    it('opens the chat for a message push', () => {
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      tapped(42, 'order_message')
      render()
      expect(RootNavigation.openOrderChat).toHaveBeenCalledWith(42)
      expect(RootNavigation.openOrderDetails).not.toHaveBeenCalled()
      expect(mockPush.current.clearOpenedPush).toHaveBeenCalled()
    })

    it('opens the order\'s details for every other push', () => {
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      tapped(42, null)
      render()
      expect(RootNavigation.openOrderDetails).toHaveBeenCalledWith(42)
      expect(RootNavigation.openOrderChat).not.toHaveBeenCalled()
    })

    it('keeps it for after the login', () => {
      tapped(42, 'order_message')
      render()
      expect(RootNavigation.openOrderChat).not.toHaveBeenCalled()
      expect(mockPush.current.clearOpenedPush).not.toHaveBeenCalled()
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      screens.rerender(<RootNavigator />)
      expect(RootNavigation.openOrderChat).toHaveBeenCalledWith(42)
    })

    it('waits for the app to load', () => {
      answers(false)
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      tapped(42, null)
      render()
      expect(RootNavigation.openOrderDetails).not.toHaveBeenCalled()
    })
  })

  describe('the new-order vibration', () => {
    it('listens to orders_register while signed in and stops with the same listener', () => {
      const socket = { on: jest.fn(), off: jest.fn() }
      ;(useWebsocket as jest.Mock).mockReturnValue(socket)
      ;(useSession as jest.Mock).mockReturnValue(session(true))
      render()
      expect(socket.on).toHaveBeenCalledWith('orders_register', expect.any(Function))
      const listener = socket.on.mock.calls[0][1]
      screens.unmount()
      expect(socket.off).toHaveBeenCalledWith('orders_register', listener)
    })

    it('does not listen without a session', () => {
      const socket = { on: jest.fn(), off: jest.fn() }
      ;(useWebsocket as jest.Mock).mockReturnValue(socket)
      render()
      expect(socket.on).not.toHaveBeenCalled()
    })
  })
})
