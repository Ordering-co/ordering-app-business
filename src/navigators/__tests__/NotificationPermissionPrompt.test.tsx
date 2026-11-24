import React from 'react'
import { AppState, Text, TouchableOpacity } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'
import { checkNotifications, openSettings } from 'react-native-permissions'

import { ShellContext, SHELL_DEFAULTS } from '../../context/ShellContext'
import { NOTIFICATIONS_SHEET_DISMISSED_KEY, REOFFER_AFTER_MS } from '../getNotificationPermissionPlan'

const mockStore = { get: jest.fn(), set: jest.fn() }
const mockSheet = { present: true }
jest.mock('@ui', () => {
  const mockReact = require('react')
  const { Text: MockText, TouchableOpacity: MockButton } = require('react-native')
  return {
    StoreMethods: {
      _retrieveStoreData: (...args: any[]) => mockStore.get(...args),
      _setStoreData: (...args: any[]) => mockStore.set(...args)
    },
    get NotificationsPermissionSheet () {
      return mockSheet.present
        // The profile area's sheet: "Turn on notifications" awaits `onAllow`, then closes; "Not now" closes.
        ? ({ open, onClose, onAllow }: any) => open
          ? mockReact.createElement(mockReact.Fragment, null,
            mockReact.createElement(MockText, { testID: 'sheet' }, 'sheet'),
            mockReact.createElement(MockButton, { testID: 'enable', onPress: async () => { await onAllow(); onClose() } }),
            mockReact.createElement(MockButton, { testID: 'later', onPress: onClose }))
          : null
        : undefined
    }
  }
})
jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn(),
  openSettings: jest.fn(async () => undefined)
}))

import { NotificationPermissionPrompt } from '../NotificationPermissionPrompt'

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

const mount = async (requestNotificationPermission = jest.fn(async () => 'granted' as const), auth = true, loaded = true) => {
  const view = render(
    <ShellContext.Provider value={{ ...SHELL_DEFAULTS, requestNotificationPermission }}>
      <NotificationPermissionPrompt auth={auth} loaded={loaded} />
    </ShellContext.Provider>
  )
  await flush()
  return { ...view, requestNotificationPermission }
}

describe('NotificationPermissionPrompt (OQ-20: the system prompt is no longer fired at login)', () => {
  beforeEach(() => {
    mockSheet.present = true
    mockStore.get.mockResolvedValue(undefined)
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'denied' })
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
  })
  afterEach(() => jest.restoreAllMocks())

  it('shows the sheet once signed in when the permission is denied or not asked', async () => {
    const view = await mount()
    expect(view.getByTestId('sheet')).toBeTruthy()
  })

  it('shows nothing when the permission is on, and never asks the system', async () => {
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
    const view = await mount()
    expect(view.queryByTestId('sheet')).toBeNull()
    expect(view.requestNotificationPermission).not.toHaveBeenCalled()
  })

  it('waits for a session and for the app to load', async () => {
    expect((await mount(undefined, false, true)).queryByTestId('sheet')).toBeNull()
    expect((await mount(undefined, true, false)).queryByTestId('sheet')).toBeNull()
    expect(checkNotifications).not.toHaveBeenCalled()
  })

  it('"Turn on notifications" asks the system once through the push provider and closes', async () => {
    const view = await mount()
    fireEvent.press(view.getByTestId('enable'))
    await flush()
    expect(view.requestNotificationPermission).toHaveBeenCalledTimes(1)
    expect(view.queryByTestId('sheet')).toBeNull()
    // Granted, and the sheet's own close after "Turn on" is not a "Not now": nothing to wait a week for.
    expect(mockStore.set).not.toHaveBeenCalled()
  })

  it('asks again in a week when the system said no', async () => {
    const view = await mount(jest.fn(async () => 'denied' as const))
    fireEvent.press(view.getByTestId('enable'))
    await flush()
    expect(mockStore.set).toHaveBeenCalledWith(NOTIFICATIONS_SHEET_DISMISSED_KEY, 1_800_000_000_000)
    expect(mockStore.set).toHaveBeenCalledTimes(1)
  })

  it('"Not now" closes it and holds it back for a week, without asking the system', async () => {
    const view = await mount()
    fireEvent.press(view.getByTestId('later'))
    expect(view.queryByTestId('sheet')).toBeNull()
    expect(mockStore.set).toHaveBeenCalledWith(NOTIFICATIONS_SHEET_DISMISSED_KEY, 1_800_000_000_000)
    expect(view.requestNotificationPermission).not.toHaveBeenCalled()
  })

  it('stays away for a week after "Not now", then comes back', async () => {
    mockStore.get.mockResolvedValue(1_800_000_000_000 - 1000)
    expect((await mount()).queryByTestId('sheet')).toBeNull()
    mockStore.get.mockResolvedValue(1_800_000_000_000 - REOFFER_AFTER_MS)
    expect((await mount()).getByTestId('sheet')).toBeTruthy()
  })

  it('a blocked permission opens the settings instead of the system prompt (and stays quiet for a week if it comes to nothing)', async () => {
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
    const view = await mount()
    expect(view.getByTestId('sheet')).toBeTruthy()
    fireEvent.press(view.getByTestId('enable'))
    await flush()
    expect(openSettings).toHaveBeenCalledTimes(1)
    expect(view.requestNotificationPermission).not.toHaveBeenCalled()
    expect(view.queryByTestId('sheet')).toBeNull()
    expect(mockStore.set).toHaveBeenCalledTimes(1)
    expect(mockStore.set).toHaveBeenCalledWith(NOTIFICATIONS_SHEET_DISMISSED_KEY, 1_800_000_000_000)
  })

  it('looks again when the app comes back from the settings: the sheet is gone once the permission is on', async () => {
    let appState: (state: string) => void = () => {}
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: any) => { appState = fn; return { remove: jest.fn() } }) as any)
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
    const view = await mount()
    fireEvent.press(view.getByTestId('enable'))
    await flush()
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
    act(() => appState('active'))
    await flush()
    expect(view.queryByTestId('sheet')).toBeNull()
    expect(checkNotifications).toHaveBeenCalledTimes(2)
  })

  it('does nothing, and never fires the system prompt, until the profile area ships the sheet', async () => {
    mockSheet.present = false
    const view = await mount()
    expect(view.toJSON()).toBeNull()
    expect(checkNotifications).not.toHaveBeenCalled()
    expect(view.requestNotificationPermission).not.toHaveBeenCalled()
  })
})
