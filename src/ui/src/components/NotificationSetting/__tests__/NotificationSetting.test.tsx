import React from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { checkNotifications, openSettings, requestNotifications } from 'react-native-permissions'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { NotificationSetting, NotificationsPermissionSheet } from '..'

jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn(),
  requestNotifications: jest.fn(),
  openSettings: jest.fn()
}))

describe('NotificationSetting (the orders screens\' prompt)', () => {
  beforeEach(() => {
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
    ;(openSettings as jest.Mock).mockResolvedValue(undefined)
  })

  it('stays closed when notifications are granted', async () => {
    const setCheckNotificationStatus = jest.fn()
    renderWithProviders(<NotificationSetting checkNotificationStatus={{ open: false, checked: false }} setCheckNotificationStatus={setCheckNotificationStatus} />)
    await waitFor(() => expect(setCheckNotificationStatus).toHaveBeenCalledWith({ open: false, checked: true }))
  })

  it('opens the explainer when the system has blocked notifications, and "Turn on" goes to the app\'s settings', async () => {
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
    const setCheckNotificationStatus = jest.fn()
    const { getByTestId, getByText, rerender } = renderWithProviders(
      <NotificationSetting checkNotificationStatus={{ open: false, checked: false }} setCheckNotificationStatus={setCheckNotificationStatus} />
    )
    await waitFor(() => expect(setCheckNotificationStatus).toHaveBeenCalledWith({ open: true, checked: false }))
    rerender(<NotificationSetting checkNotificationStatus={{ open: true, checked: false }} setCheckNotificationStatus={setCheckNotificationStatus} />)
    expect(getByText('Turn on order alerts')).toBeTruthy()
    await act(async () => { fireEvent.press(getByTestId('notifications-allow')) })
    expect(openSettings).toHaveBeenCalled()
    expect(requestNotifications).not.toHaveBeenCalled()
    expect(setCheckNotificationStatus).toHaveBeenLastCalledWith({ open: false, checked: true })
  })

  it('"Not now" closes it without asking the system', async () => {
    const setCheckNotificationStatus = jest.fn()
    const { getByTestId } = renderWithProviders(
      <NotificationSetting checkNotificationStatus={{ open: true, checked: false }} setCheckNotificationStatus={setCheckNotificationStatus} />
    )
    fireEvent.press(getByTestId('notifications-later'))
    expect(setCheckNotificationStatus).toHaveBeenCalledWith({ open: false, checked: true })
    expect(openSettings).not.toHaveBeenCalled()
  })
})

describe('NotificationsPermissionSheet', () => {
  beforeEach(() => {
    ;(requestNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
    ;(openSettings as jest.Mock).mockResolvedValue(undefined)
  })

  it('explains why before it asks, then asks the system', async () => {
    const onClose = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(<NotificationsPermissionSheet open onClose={onClose} />)
    expect(getByText('Turn on order alerts')).toBeTruthy()
    expect(getByText('Without notifications you won\'t hear new orders when the app is closed.')).toBeTruthy()
    expect(requestNotifications).not.toHaveBeenCalled()
    await act(async () => { fireEvent.press(getByTestId('notifications-allow')) })
    expect(requestNotifications).toHaveBeenCalledTimes(1)
    expect(openSettings).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('opens the app\'s settings when the system will not ask again', async () => {
    ;(requestNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
    const { getByTestId } = renderWithProviders(<NotificationsPermissionSheet open onClose={jest.fn()} />)
    await act(async () => { fireEvent.press(getByTestId('notifications-allow')) })
    expect(openSettings).toHaveBeenCalled()
  })

  it('lets the shell bring its own way to ask', async () => {
    const onAllow = jest.fn()
    const onClose = jest.fn()
    const { getByTestId } = renderWithProviders(<NotificationsPermissionSheet open onClose={onClose} onAllow={onAllow} />)
    await act(async () => { fireEvent.press(getByTestId('notifications-allow')) })
    expect(onAllow).toHaveBeenCalled()
    expect(requestNotifications).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('closes with Not now and does not ask', () => {
    const onClose = jest.fn()
    const { getByTestId } = renderWithProviders(<NotificationsPermissionSheet open onClose={onClose} />)
    fireEvent.press(getByTestId('notifications-later'))
    expect(onClose).toHaveBeenCalled()
    expect(requestNotifications).not.toHaveBeenCalled()
  })

  it('draws nothing while closed', () => {
    const { queryByText } = renderWithProviders(<NotificationsPermissionSheet open={false} onClose={jest.fn()} />)
    expect(queryByText('Turn on order alerts')).toBeNull()
  })
})
