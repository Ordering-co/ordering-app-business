import React from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { checkNotifications, openSettings } from 'react-native-permissions'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { ALERT_SETTINGS_KEY, BUNDLED_ALERT_SOUNDS, getAlertSettings, onTestAlert, resetAlertSettings } from '../../AlertSettings'
import { AlertsAndSound } from '../AlertsAndSound'
import { alertSoundSource } from '../../NewOrderNotification/alertRing'
import SoundPlayer from 'react-native-sound-player'

jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn(),
  requestNotifications: jest.fn(),
  openSettings: jest.fn()
}))

const open = async (status = 'granted', navigation: any = { canGoBack: () => true, goBack: jest.fn() }) => {
  ;(checkNotifications as jest.Mock).mockResolvedValue({ status })
  const result = renderWithProviders(<AlertsAndSound navigation={navigation} />)
  await act(async () => {})
  return { ...result, navigation }
}

describe('Alerts and sound', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    resetAlertSettings()
    ;(openSettings as jest.Mock).mockResolvedValue(undefined)
  })

  it('says notifications are on when the system grants them', async () => {
    const { getByTestId, queryByTestId } = await open('granted')
    expect(getByTestId('notifications-on')).toBeTruthy()
    expect(queryByTestId('notifications-off')).toBeNull()
  })

  it('says they are off with "Open settings" when the system does not', async () => {
    const { getByTestId, queryByTestId } = await open('blocked')
    expect(getByTestId('notifications-off')).toBeTruthy()
    expect(queryByTestId('notifications-on')).toBeNull()
    fireEvent.press(getByTestId('notifications-open-settings'))
    expect(openSettings).toHaveBeenCalled()
  })

  it('says nothing about the permission where the system has none to give', async () => {
    const { queryByTestId } = await open('unavailable')
    expect(queryByTestId('notifications-on')).toBeNull()
    expect(queryByTestId('notifications-off')).toBeNull()
  })

  it('reads the permission again when the app comes back from the settings', async () => {
    const listeners: Array<(state: string) => void> = []
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: any) => {
      listeners.push(listener)
      return { remove: jest.fn() }
    }) as any)
    const { getByTestId } = await open('blocked')
    expect(getByTestId('notifications-off')).toBeTruthy()
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
    await act(async () => { listeners.forEach((listener) => listener('active')) })
    expect(getByTestId('notifications-on')).toBeTruthy()
  })

  it('shows the new-order alert as always on: it has no switch', async () => {
    const { getByTestId, queryByTestId, getByText } = await open()
    expect(getByTestId('alert-new-order')).toBeTruthy()
    expect(getByText('Always on')).toBeTruthy()
    expect(queryByTestId('alert-new-order-switch')).toBeNull()
  })

  it('does not draw the server-side switches (new messages, order updates)', async () => {
    const { queryByText } = await open()
    expect(queryByText('New messages')).toBeNull()
    expect(queryByText('Order updates')).toBeNull()
  })

  it('starts as today behaves: ring until opened on, vibrate on, the bell', async () => {
    const { getByTestId } = await open()
    expect(getByTestId('alert-ring-switch').props.accessibilityState).toMatchObject({ checked: true })
    expect(getByTestId('alert-vibrate-switch').props.accessibilityState).toMatchObject({ checked: true })
  })

  it('changes the switches at once and keeps them', async () => {
    const { getByTestId } = await open()
    fireEvent.press(getByTestId('alert-ring-switch'))
    fireEvent.press(getByTestId('alert-vibrate-switch'))
    expect(getByTestId('alert-ring-switch').props.accessibilityState).toMatchObject({ checked: false })
    await waitFor(async () => expect(await getAlertSettings()).toMatchObject({ ringUntilOpened: false, vibrate: false }))
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(ALERT_SETTINGS_KEY)) as string)).toMatchObject({ ringUntilOpened: false, vibrate: false }))
  })

  it('offers the three bundled sounds, Bell chosen, with the other controls and the note on pushes in the background', async () => {
    expect(BUNDLED_ALERT_SOUNDS).toEqual(['bell', 'chime', 'alarm'])
    const { getByTestId, getByText } = await open()
    expect(getByTestId('alert-sounds')).toBeTruthy()
    expect(getByText('Sound')).toBeTruthy()
    expect(getByTestId('alert-sound-bell').props.accessibilityState).toMatchObject({ checked: true })
    expect(getByTestId('alert-sound-note')).toHaveTextContent('A notification that arrives while the app is in the background plays the Bell.')
    expect(getByTestId('alert-ring-switch')).toBeTruthy()
    expect(getByTestId('alert-vibrate-switch')).toBeTruthy()
    expect(getByTestId('alert-test')).toBeTruthy()
  })

  it('chooses the sound by its name: Bell, Chime, Kitchen alarm', async () => {
    const { getByTestId, getByText } = await open()
    expect(getByText('Bell')).toBeTruthy()
    expect(getByText('Chime')).toBeTruthy()
    expect(getByText('Kitchen alarm (loud)')).toBeTruthy()
    fireEvent.press(getByTestId('alert-sound-alarm'))
    expect((await getAlertSettings()).sound).toBe('alarm')
    expect(getByTestId('alert-sound-alarm').props.accessibilityState).toMatchObject({ checked: true })
    expect(getByTestId('alert-sound-bell').props.accessibilityState).toMatchObject({ checked: false })
  })

  it('plays the sound once as it is chosen, stopping the one before, and stops it on leaving', async () => {
    ;(SoundPlayer.playAsset as jest.Mock).mockClear()
    ;(SoundPlayer.stop as jest.Mock).mockClear()
    const { getByTestId, unmount } = await open()
    fireEvent.press(getByTestId('alert-sound-chime'))
    expect(SoundPlayer.playAsset).toHaveBeenLastCalledWith(alertSoundSource('chime').asset)
    fireEvent.press(getByTestId('alert-sound-alarm'))
    expect(SoundPlayer.stop).toHaveBeenCalledTimes(1)
    expect(SoundPlayer.playAsset).toHaveBeenLastCalledWith(alertSoundSource('alarm').asset)
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(2)
    unmount()
    expect(SoundPlayer.stop).toHaveBeenCalledTimes(2)
  })

  it('sends a test alert to the alert module with the settings in force', async () => {
    const handler = jest.fn()
    const off = onTestAlert(handler)
    const { getByTestId } = await open()
    fireEvent.press(getByTestId('alert-vibrate-switch'))
    fireEvent.press(getByTestId('alert-test'))
    expect(handler).toHaveBeenCalledWith({ sound: 'bell', ringUntilOpened: true, vibrate: false })
    off()
  })

  it('goes back from the bar\'s arrow', async () => {
    const { getByLabelText, navigation } = await open()
    fireEvent.press(getByLabelText(/back/i))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
