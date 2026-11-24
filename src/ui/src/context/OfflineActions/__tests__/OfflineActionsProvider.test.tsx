import React from 'react'
import { Text } from 'react-native'
import { act, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNetInfo } from '@react-native-community/netinfo'
import { useApi, useConfig, useEvent, useSession } from '@components'

import { OfflineActionsProvider, useOfflineActions } from '..'
import { statusChange } from '../offlineActionsQueue'

const save = jest.fn()
const ordersFor = jest.fn((id: number) => ({ save: (body: any) => save(id, body) }))
const ordering = { setAccessToken: () => ({ orders: ordersFor }), root: 'https://api.test' }
const events = { emit: jest.fn(), on: jest.fn(), off: jest.fn() }

let latest: any
const Probe = () => {
  latest = useOfflineActions()
  return <Text>{String(latest[0].canSaveChangesOffline)}</Text>
}

const mount = () => render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)

describe('OfflineActionsProvider', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
    ;(useApi as jest.Mock).mockReturnValue([ordering])
    ;(useSession as jest.Mock).mockReturnValue([{ token: 'token' }])
    ;(useEvent as jest.Mock).mockReturnValue([events])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { allow_save_changes_offline: { value: '1' } } }])
    save.mockResolvedValue({ content: { result: { id: 1 }, error: null } })
    ;(global as any).fetch = jest.fn()
  })

  it('reads allow_save_changes_offline from the configs itself, whichever screen is open', async () => {
    const { getByText } = mount()
    await waitFor(() => expect(getByText('true')).toBeTruthy())
  })

  it('keeps the last value for a start with no network (the configs are not loaded)', async () => {
    mount()
    await waitFor(() => expect(latest[0].canSaveChangesOffline).toBe(true))
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
    const second = mount()
    await waitFor(() => expect(second.getAllByText('true').length).toBeGreaterThan(0))
  })

  it('queues nothing when the server does not allow it', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { allow_save_changes_offline: { value: '0' } } }])
    mount()
    let queued: any
    await act(async () => { queued = await latest[1].applyOffAction(statusChange(1, { status: 4 })) })
    expect(queued).toBe(false)
    expect(await AsyncStorage.getItem('offline_actions_array')).toBeNull()
  })

  it('an unknown network (NetInfo\'s first reading, null) is not offline: it is passed on as null and nothing is replayed or queued', async () => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: null })
    await AsyncStorage.setItem('offline_actions_array', JSON.stringify({ 1: [statusChange(1, { status: 4 })] }))
    mount()
    await waitFor(() => expect(latest[0].canSaveChangesOffline).toBe(true))
    expect(latest[0].isNetConnected).toBeNull()
    expect(latest[0].isNetConnected === false).toBe(false)
    expect(save).not.toHaveBeenCalled()
    expect(await AsyncStorage.getItem('offline_actions_array')).not.toBeNull()
  })

  it('queues a step per order and keeps it in storage', async () => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    mount()
    await waitFor(() => expect(latest[0].canSaveChangesOffline).toBe(true))
    await act(async () => { await latest[1].applyOffAction(statusChange(1, { status: 7, prepared_in: 20 })) })
    await act(async () => { await latest[1].applyOffAction(statusChange(1, { status: 4 })) })
    expect(JSON.parse((await AsyncStorage.getItem('offline_actions_array'))!)['1']).toHaveLength(2)
    expect(latest[0].actions['1']).toHaveLength(2)
    expect(save).not.toHaveBeenCalled()
  })

  it('replays one request per order with the last status, and never a chat message to the customer', async () => {
    await AsyncStorage.setItem('offline_actions_array', JSON.stringify({
      1: [statusChange(1, { status: 7, prepared_in: 20 }), statusChange(1, { status: 4 })],
      2: [statusChange(2, { status: 5, reject_reason: 'Too busy' })]
    }))
    mount()
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save).toHaveBeenCalledWith('1', { status: 4, prepared_in: 20 })
    expect(save).toHaveBeenCalledWith('2', { status: 5, reject_reason: 'Too busy' })
    expect((global as any).fetch).not.toHaveBeenCalled()
    await waitFor(() => expect(events.emit).toHaveBeenCalledWith('offline_actions_synced', expect.any(Array)))
  })

  it('keeps an order whose replay failed for the next connection', async () => {
    await AsyncStorage.setItem('offline_actions_array', JSON.stringify({ 1: [statusChange(1, { status: 4 })] }))
    save.mockResolvedValue({ content: { result: null, error: true } })
    mount()
    await waitFor(() => expect(save).toHaveBeenCalled())
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('offline_actions_array'))!)).toHaveProperty('1'))
  })

  it('moves a changed order between the cached lists and files it under the list its status belongs to', async () => {
    mount()
    await waitFor(() => expect(latest[0].canSaveChangesOffline).toBe(true))
    await AsyncStorage.setItem('active_orders', JSON.stringify([{ id: 5, status: 7 }, { id: 4, status: 7 }]))
    await AsyncStorage.setItem('completed_orders', JSON.stringify([{ id: 1, status: 1 }]))
    await act(async () => { await latest[1].registerOffOrder({ id: 5, status: 15, oldStatus: 4, unsync: true }) })
    expect(latest[0].orders.active.map((order: any) => order.id)).toEqual([4])
    expect(latest[0].orders.completed.map((order: any) => order.id)).toEqual([5, 1])
    // 22 to 26 are open statuses: they stay in the open orders (they were filed as cancelled before).
    await act(async () => { await latest[1].registerOffOrder({ id: 4, status: 23, oldStatus: 7, unsync: true }) })
    expect(latest[0].orders.active.map((order: any) => order.id)).toEqual([4])
  })
})
