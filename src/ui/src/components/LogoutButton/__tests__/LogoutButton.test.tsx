import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { captureDialogs } from '../../../../../../jest/helpers/confirmDialogs'
import { DEVICE_SETTINGS_KEYS, KEPT_ON_LOGOUT, StoreMethods } from '../../../providers/StoreUtil'

jest.mock('@components', () => require('../../../../../../jest/helpers/profileMocks').buildComponentsMock())

import { LogoutButton } from '..'

const profileMocks = require('../../../../../../jest/helpers/profileMocks')

/** What a signed-in device holds: the device's setup, the language and what belongs to the person. */
const stored: Record<string, string> = {
  printers: JSON.stringify([{ nickname: 'Kitchen' }]),
  auto_print_after_accept_order: 'true',
  ticket_print_options: JSON.stringify({ show_order_status: true }),
  ticket_copies: '2',
  printer_last_results: JSON.stringify({}),
  alert_settings: JSON.stringify({ sound: 'alarm' }),
  language: JSON.stringify('es'),
  isTutorial: 'true',
  project_name: JSON.stringify('luna'),
  notification_state: JSON.stringify({ token: 'push-token' }),
  pending_orders: JSON.stringify([1]),
  offline_actions_array: JSON.stringify([]),
  last_date_connection: JSON.stringify('2026-11-19')
}

describe('LogoutButton', () => {
  let dialogs: ReturnType<typeof captureDialogs>

  beforeEach(async () => {
    await AsyncStorage.clear()
    await Promise.all(Object.entries(stored).map(([key, value]) => AsyncStorage.setItem(key, value)))
    profileMocks.logoutDefaults.handleLogoutClick = jest.fn(() => Promise.resolve(true))
    dialogs = captureDialogs()
  })

  afterEach(() => dialogs.off())

  it('is a danger row of its own, with its glyph and no chevron, and asks before it does anything', () => {
    const { getByTestId, getByText, UNSAFE_queryAllByProps } = renderWithProviders(<LogoutButton />)
    expect(getByText('Logout')).toBeTruthy()
    expect(UNSAFE_queryAllByProps({ name: 'log-out-outline' }).length).toBeGreaterThan(0)
    expect(UNSAFE_queryAllByProps({ name: 'chevron-forward' })).toHaveLength(0)
    fireEvent.press(getByTestId('logout'))
    expect(dialogs.requests).toHaveLength(1)
    expect(dialogs.last()).toMatchObject({
      message: 'Are you sure that you want to log out?',
      acceptText: 'Logout',
      cancelText: 'Cancel',
      destructive: true
    })
    expect(profileMocks.logoutDefaults.handleLogoutClick).not.toHaveBeenCalled()
  })

  it('cancelling leaves the session and the storage as they were', async () => {
    const { getByTestId } = renderWithProviders(<LogoutButton />)
    fireEvent.press(getByTestId('logout'))
    dialogs.cancel()
    expect(profileMocks.logoutDefaults.handleLogoutClick).not.toHaveBeenCalled()
    expect((await AsyncStorage.getAllKeys()).length).toBe(Object.keys(stored).length)
  })

  it('logs out sending the push state, and keeps the printers, their settings, the alert settings and the language', async () => {
    const setRootState = jest.fn()
    const { getByTestId } = renderWithProviders(<LogoutButton setRootState={setRootState} />)
    fireEvent.press(getByTestId('logout'))
    await act(async () => { dialogs.accept() })
    expect(profileMocks.logoutDefaults.handleLogoutClick).toHaveBeenCalledWith({ token: 'push-token' })
    await waitFor(async () => {
      expect((await AsyncStorage.getAllKeys()).sort()).toEqual([...KEPT_ON_LOGOUT].filter((key) => key in stored).sort())
    })
    for (const key of ['printers', 'auto_print_after_accept_order', 'ticket_print_options', 'ticket_copies', 'alert_settings', 'language', 'isTutorial']) {
      expect(await AsyncStorage.getItem(key)).toBe(stored[key])
    }
    // What belongs to the person goes, the project's name included.
    for (const key of ['project_name', 'notification_state', 'pending_orders', 'offline_actions_array', 'last_date_connection']) {
      expect(await AsyncStorage.getItem(key)).toBeNull()
    }
    expect(setRootState).toHaveBeenCalledWith({ isAuth: false, token: null })
  })

  it('keeps the whole storage when the server did not end the session', async () => {
    profileMocks.logoutDefaults.handleLogoutClick = jest.fn(() => Promise.resolve(false))
    const { getByTestId } = renderWithProviders(<LogoutButton />)
    fireEvent.press(getByTestId('logout'))
    await act(async () => { dialogs.accept() })
    expect((await AsyncStorage.getAllKeys()).length).toBe(Object.keys(stored).length)
  })

  it('shows the error the logout action reports', () => {
    const { showToast } = (useToast as jest.Mock)()[1]
    const original = profileMocks.logoutDefaults.formState
    profileMocks.logoutDefaults.formState = { loading: false, result: { error: true, result: 'Could not log out' } }
    renderWithProviders(<LogoutButton />)
    profileMocks.logoutDefaults.formState = original
    expect(showToast).toHaveBeenCalledWith('error', 'Could not log out')
  })
})

describe('what a log out keeps', () => {
  it('lists the device\'s setup and nothing of the person', () => {
    expect(DEVICE_SETTINGS_KEYS).toEqual(expect.arrayContaining(['printers', 'auto_print_after_accept_order', 'ticket_print_options', 'ticket_copies', 'alert_settings']))
    expect(KEPT_ON_LOGOUT).toEqual(expect.arrayContaining(['isTutorial', 'language']))
    expect(KEPT_ON_LOGOUT).not.toContain('project_name')
    expect(KEPT_ON_LOGOUT).not.toContain('notification_state')
    expect(StoreMethods._clearStoreDataOnLogout).toBeDefined()
  })

  it('removing the account keeps only the tutorial flag and the language', async () => {
    await AsyncStorage.clear()
    await Promise.all(Object.entries(stored).map(([key, value]) => AsyncStorage.setItem(key, value)))
    await StoreMethods._clearStoreData({ excludedKeys: ['isTutorial', 'language'] })
    await waitFor(async () => expect((await AsyncStorage.getAllKeys()).sort()).toEqual(['isTutorial', 'language']))
  })
})
