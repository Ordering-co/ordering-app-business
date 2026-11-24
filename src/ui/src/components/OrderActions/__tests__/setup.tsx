/**
 * What the action sheets' tests share besides the mocks: the offline queue, an order, and a render that mounts the host.
 */
import React from 'react'
import { act } from '@testing-library/react-native'

import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { orderActions } from '../useOrderActions'
import { resetRequests } from '../store'
import { resetTestState as resetMocks, testState } from './mocks'

export { testState }

export const resetTestState = () => {
  resetMocks()
  resetRequests()
}

export const offline = (state: Partial<{ isNetConnected: boolean | null, canSaveChangesOffline: boolean }> = {}) => {
  const applyOffAction = jest.fn(async () => true)
  const registerOffOrder = jest.fn(async () => undefined)
  const value: any = [
    { isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null, ...state },
    { applyOffAction, registerOffOrder, setState: jest.fn() }
  ]
  return { applyOffAction, registerOffOrder, value }
}

export const order = (extra: any = {}) => ({
  id: 1053,
  status: 0,
  delivery_type: 1,
  customer_id: 9,
  customer: { name: 'James Smith', cellphone: '4155550199', country_phone_code: '1', location: { lat: 1.2, lng: 1.3 } },
  business: { name: 'Luna Pizza', location: { lat: 1.0, lng: 1.1 } },
  ...extra
})

/** Mounts the host (as the shell does) and gives the actions to open a sheet with. */
export const renderHost = async (
  Host: React.ComponentType,
  { platform, offlineValue, themeOverrides }: { platform?: 'phone' | 'tablet', offlineValue?: any, themeOverrides?: any } = {}
) => {
  const tree = (
    <OfflineActionsContext.Provider value={offlineValue ?? offline().value}>
      <Host />
    </OfflineActionsContext.Provider>
  )
  const screen = renderWithProviders(tree, { platform, themeOverrides })
  return { screen, actions: orderActions }
}

export const openSheet = async (open: () => void) => {
  await act(async () => { open() })
}
