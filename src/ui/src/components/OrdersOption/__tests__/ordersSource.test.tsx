import React from 'react'
import { Text } from 'react-native'
import { act, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useConfig } from '@components'

const mockReceived: { current: any } = { current: null }
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    OrderListGroups: (props: any) => { mockReceived.current = props; return null }
  }
})
jest.mock('@ui', () => ({ NotificationSetting: () => { const { Text: T } = require('react-native'); return <T>notification-setting</T> } }))

import { OrdersSource, useCombinedLayout } from '../OrdersSource'
import { ACTIVE_STATUSES, HISTORY_STATUSES } from '../orderStatusGroups'

describe('OrdersSource', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  it('configures the controller with the app\'s data model: every open order in one slot, History in the other', async () => {
    render(<OrdersSource UIComponent={() => null} isNetConnected />)
    await waitFor(() => expect(mockReceived.current).toBeTruthy())
    expect(mockReceived.current).toMatchObject({
      combineTabs: true,
      asDashboard: true,
      useDefualtSessionManager: true,
      orderGroupStatusCustom: { active: ACTIVE_STATUSES, completed: HISTORY_STATUSES, cancelled: [] }
    })
    expect(mockReceived.current.orderStatus).toHaveLength(27)
    expect(mockReceived.current.orderStatus[23]).toEqual({ key: 23, text: 'Driver on way' })
  })

  it('says connected unless the network says it is not', async () => {
    const connected = (value: any) => {
      render(<OrdersSource UIComponent={() => null} isNetConnected={value} />)
      return mockReceived.current.isNetConnected
    }
    expect(connected(null)).toBe(true)
    expect(connected(undefined)).toBe(true)
    expect(connected(true)).toBe(true)
    expect(connected(false)).toBe(false)
    await act(async () => {})
  })

  it('mounts the notification setting only when the page asks', async () => {
    const without = render(<OrdersSource UIComponent={() => null} />)
    expect(without.queryByText('notification-setting')).toBeNull()
    const withIt = render(<OrdersSource UIComponent={() => null} checkNotification />)
    expect(withIt.getByText('notification-setting')).toBeTruthy()
    await act(async () => {})
  })
})

describe('useCombinedLayout', () => {
  const Probe = () => <Text>{String(useCombinedLayout())}</Text>

  beforeEach(async () => { await AsyncStorage.clear() })

  it('is the server\'s combine_pending_and_progress_orders, and keeps it for a start with no network', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { combine_pending_and_progress_orders: { value: '1' } } }])
    const online = render(<Probe />)
    expect(online.getByText('true')).toBeTruthy()
    await waitFor(async () => expect(await AsyncStorage.getItem('combine_pending_and_progress_orders')).toBe('true'))
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
    const offline = render(<Probe />)
    await waitFor(() => expect(offline.getByText('true')).toBeTruthy())
  })

  it('is off when the server does not combine them', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { combine_pending_and_progress_orders: { value: '0' } } }])
    const view = render(<Probe />)
    expect(view.getByText('false')).toBeTruthy()
    await act(async () => {})
  })
})
