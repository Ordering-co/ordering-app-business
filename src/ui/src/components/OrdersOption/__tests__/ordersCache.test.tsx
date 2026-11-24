import React from 'react'
import { act, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useUtils } from '@components'

import { useOrdersCache } from '../useOrdersCache'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { makeOrder, slot } from './fixtures'

let result: string | null = null
const Probe = ({ ordersGroup, setOrdersGroup, isNetConnected, offline = {} }: any) => {
  result = useOrdersCache({ ordersGroup, setOrdersGroup, isNetConnected })
  return null
}
const mount = (props: any) => render(
  <OfflineActionsContext.Provider value={[{ isNetConnected: true, canSaveChangesOffline: true, actions: {}, orders: props.offlineOrders ?? null }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
    <Probe {...props} />
  </OfflineActionsContext.Provider>
)

describe('useOrdersCache', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    ;(useUtils as jest.Mock).mockReturnValue([{ timeFormat: 'HH:mm' }, {}])
  })

  it('online, writes the lists after they have been still for a moment, with the time of the write', async () => {
    jest.useFakeTimers()
    const group = { active: slot([makeOrder({ id: 2 }), makeOrder({ id: 1 })]), completed: slot([makeOrder({ id: 9, status: 1 })]) }
    mount({ ordersGroup: group, setOrdersGroup: jest.fn(), isNetConnected: true })
    expect(await AsyncStorage.getItem('active_orders')).toBeNull()
    await act(async () => { jest.advanceTimersByTime(1600) })
    jest.useRealTimers()
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem('active_orders'))!)).toHaveLength(2))
    expect(JSON.parse((await AsyncStorage.getItem('completed_orders'))!)).toHaveLength(1)
    expect(await AsyncStorage.getItem('last_sync_at')).toBeTruthy()
  })

  it('does not write a list that is still loading or never loaded', async () => {
    jest.useFakeTimers()
    const group = { active: slot([makeOrder()], { loading: true }), completed: slot([], { fetched: false }) }
    mount({ ordersGroup: group, setOrdersGroup: jest.fn(), isNetConnected: true })
    await act(async () => { jest.advanceTimersByTime(3000) })
    jest.useRealTimers()
    expect(await AsyncStorage.getItem('active_orders')).toBeNull()
    expect(await AsyncStorage.getItem('completed_orders')).toBeNull()
  })

  it('offline, reads the copy back into an empty list and says when it was written', async () => {
    await AsyncStorage.setItem('active_orders', JSON.stringify([{ id: 5, status: 7 }]))
    await AsyncStorage.setItem('last_sync_at', JSON.stringify(new Date(2026, 10, 19, 12, 31).toISOString()))
    const setOrdersGroup = jest.fn()
    mount({ ordersGroup: { active: slot([], { fetched: false }), completed: slot([makeOrder({ id: 1, status: 1 })]) }, setOrdersGroup, isNetConnected: false })
    await waitFor(() => expect(setOrdersGroup).toHaveBeenCalled())
    const next = setOrdersGroup.mock.calls[0][0]({ active: slot([], { fetched: false }), completed: slot([makeOrder({ id: 1, status: 1 })]) })
    expect(next.active.orders).toEqual([{ id: 5, status: 7 }])
    expect(next.active.fetched).toBe(true)
    // A list the screen already has is never replaced by the copy.
    expect(next.completed.orders.map((order: any) => order.id)).toEqual([1])
    await waitFor(() => expect(result).toBe('12:31'))
  })

  it('offline, hands the screen the lists a change made offline moved', async () => {
    const setOrdersGroup = jest.fn()
    mount({
      ordersGroup: { active: slot([makeOrder({ id: 1, status: 7 })]), completed: slot([]) },
      setOrdersGroup,
      isNetConnected: false,
      offlineOrders: { active: [makeOrder({ id: 1, status: 4, unsync: true })] }
    })
    await waitFor(() => expect(setOrdersGroup).toHaveBeenCalled())
    const base = { active: slot([]), completed: slot([]) }
    const results = setOrdersGroup.mock.calls.map((call) => call[0](base))
    expect(results.some((next) => next.active.orders[0]?.id === 1 && next.active.orders[0]?.status === 4 && next.active.orders[0]?.unsync === true)).toBe(true)
  })
})
