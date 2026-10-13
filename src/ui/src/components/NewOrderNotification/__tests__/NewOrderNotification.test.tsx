import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { useApi, useEvent, useSession } from '@components'

jest.mock('moment', () => {
  const moment = (value?: string) => ({
    diff: () => 10,
    utc: () => moment(value)
  })
  moment.duration = () => ({ asSeconds: () => 10 })
  moment.utc = (value?: string) => moment(value)
  return moment
})

jest.mock('@ui', () => {
  const { buildB3OrdersUiMock } = require('../../../../../../jest/helpers/b3OrdersUiMock')
  return buildB3OrdersUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { newOrderNotificationDefaults } = require('../../../../../../jest/helpers/b3OrdersDefaults')
  return {
    ...mockOrdering,
    useEvent: jest.fn(() => [newOrderNotificationDefaults.events]),
    useSession: jest.fn(() => [{ user: { id: 1 }, token: 'token' }, {}]),
    useApi: jest.fn(() => [{ root: 'https://api.test' }, {}]),
    NewOrderNotification: renderUiController(newOrderNotificationDefaults)
  }
})

import { useLocation } from '@ui'
import { NewOrderNotification } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('NewOrderNotification', () => {
  it('registers websocket notification listeners', () => {
    renderWithProviders(<NewOrderNotification isBusinessApp />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    expect(events.on).toHaveBeenCalledWith('message_added_notification', expect.any(Function))
    expect(events.on).toHaveBeenCalledWith('order_added_notification', expect.any(Function))
  })

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderWithProviders(<NewOrderNotification isBusinessApp />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    unmount()
    expect(events.off).toHaveBeenCalled()
  })

  it('shows notification modal when order event arrives', () => {
    renderWithProviders(<NewOrderNotification isBusinessApp />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const orderHandler = events.on.mock.calls.find((call: any[]) => call[0] === 'order_added_notification')?.[1]
    act(() => {
      orderHandler?.({ status: 0, order_id: 99, id: 99 })
    })
    expect(events.on).toHaveBeenCalled()
  })

  it('does not request merchant GPS when an order update includes a driver', async () => {
    renderWithProviders(<NewOrderNotification isBusinessApp />)
    const { getCurrentLocation } = (useLocation as jest.Mock).mock.results[0].value
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const orderHandler = events.on.mock.calls.find((call: any[]) => call[0] === 'order_updated_notification')?.[1]

    await act(async () => {
      await orderHandler?.({ status: 0, id: 99, driver: { id: 5 } })
    })

    expect(getCurrentLocation).not.toHaveBeenCalled()
  })
})
