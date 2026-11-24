import React from 'react'
import { Vibration, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, render, waitFor } from '@testing-library/react-native'

import {
  ALERT_SETTINGS_KEY,
  DEFAULT_ALERT_SETTINGS,
  getAlertSettings,
  normalizeAlertSettings,
  onTestAlert,
  requestTestAlert,
  resetAlertSettings,
  updateAlertSettings,
  useAlertSettings
} from '..'

const Probe = ({ onValue }: { onValue: (value: any) => void }) => {
  const value = useAlertSettings()
  onValue(value)
  return <Text>{value.sound}</Text>
}

describe('AlertSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    resetAlertSettings()
    jest.restoreAllMocks()
  })

  it('starts with today\'s behaviour: rings until opened, vibrates, the bell', async () => {
    expect(DEFAULT_ALERT_SETTINGS).toEqual({ sound: 'bell', ringUntilOpened: true, vibrate: true })
    expect(await getAlertSettings()).toEqual(DEFAULT_ALERT_SETTINGS)
  })

  it('reads what was stored and ignores what it does not know', async () => {
    await AsyncStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify({ sound: 'alarm', vibrate: false, ringUntilOpened: 'yes' }))
    expect(await getAlertSettings()).toEqual({ sound: 'alarm', vibrate: false, ringUntilOpened: true })
    expect(normalizeAlertSettings({ sound: 'siren' }).sound).toBe('bell')
    expect(normalizeAlertSettings(null)).toEqual(DEFAULT_ALERT_SETTINGS)
  })

  it('a change reaches every reader at once and is persisted', async () => {
    let seen: any
    render(<Probe onValue={(value) => { seen = value }} />)
    await waitFor(() => expect(seen.loaded).toBe(true))
    act(() => { seen.update({ sound: 'chime', ringUntilOpened: false }) })
    expect(seen.sound).toBe('chime')
    expect(seen.ringUntilOpened).toBe(false)
    expect(seen.vibrate).toBe(true)
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(ALERT_SETTINGS_KEY)) as string)).toEqual({ sound: 'chime', ringUntilOpened: false, vibrate: true })
    })
    expect(await getAlertSettings()).toMatchObject({ sound: 'chime' })
  })

  it('the test alert goes to the alert module with the current settings', async () => {
    const handler = jest.fn()
    const off = onTestAlert(handler)
    await updateAlertSettings({ sound: 'alarm' })
    requestTestAlert()
    expect(handler).toHaveBeenCalledWith({ sound: 'alarm', ringUntilOpened: true, vibrate: true })
    off()
    handler.mockClear()
    requestTestAlert()
    expect(handler).not.toHaveBeenCalled()
  })

  it('without an alert module the test only vibrates, and only when vibrate is on', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {})
    requestTestAlert()
    expect(vibrate).toHaveBeenCalledTimes(1)
    await updateAlertSettings({ vibrate: false })
    requestTestAlert()
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
