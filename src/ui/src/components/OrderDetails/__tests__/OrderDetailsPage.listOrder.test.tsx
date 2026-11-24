import React from 'react'
import { Text } from 'react-native'
import { act } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

/** What the details controller was given, and a way to make it write an answer into it as the real one does. */
const mockSeen: { order: any } = { order: null }
jest.mock('@components', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    // The real controller keeps the order it is given and, on a status change, `Object.assign(order, result)`.
    OrderDetails: (props: any) => {
      mockSeen.order = props.order
      return React.createElement(Text, { testID: 'controller' }, String(props.order?.status))
    }
  }
})
jest.mock('react-native-maps', () => require('../../OrderActions/__tests__/mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))
jest.mock('../../OrderActions/useOrderActions', () => ({ useOrderActions: () => ({}) }))
jest.mock('../../../context/OfflineActions', () => ({ useOfflineActions: () => [{}, {}] }))

import { OrderDetailsPage } from '../OrderDetailsPage'

describe('OrderDetailsPage hands the controller a copy of the list\'s order', () => {
  it('so the answer the controller writes into its order never reaches the list\'s object (the filtered list that stayed stale)', () => {
    const listed = { id: 3567, status: 7, delivery_type: 2 }
    renderWithProviders(<OrderDetailsPage order={listed} orderId={3567} />)
    expect(mockSeen.order).toEqual(listed)
    expect(mockSeen.order).not.toBe(listed)
    // What `handleChangeOrderStatus` of the controller does with the server's answer:
    Object.assign(mockSeen.order, { status: 4 })
    expect(listed.status).toBe(7)
  })

  it('keeps the same copy while the list\'s order is the same object, and takes a new one when the list gives a new order', () => {
    const listed = { id: 3567, status: 7 }
    const view = renderWithProviders(<OrderDetailsPage order={listed} orderId={3567} />)
    const first = mockSeen.order
    view.rerender(<OrderDetailsPage order={listed} orderId={3567} />)
    expect(mockSeen.order).toBe(first)
    act(() => { view.rerender(<OrderDetailsPage order={{ ...listed, status: 4 }} orderId={3567} />) })
    expect(mockSeen.order).not.toBe(first)
    expect(mockSeen.order.status).toBe(4)
  })

  it('passes nothing when the page has no order yet (it is fetched by id)', () => {
    renderWithProviders(<OrderDetailsPage orderId={3567} />)
    expect(mockSeen.order).toBeUndefined()
  })
})
