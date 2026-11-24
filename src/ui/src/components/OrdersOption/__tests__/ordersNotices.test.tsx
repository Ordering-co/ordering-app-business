import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { OfflineActionsContext } from '../../../context/OfflineActions'
import { OrdersNotices } from '../OrdersNotices'
import { NotFoundSource } from '../../NotFoundSource'
import { useOrdersEmpty } from '../emptyContent'
import { OrdersSkeleton } from '../../PreviousOrders/OrdersSkeleton'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const withActions = (actions: Record<string, any>, ui: React.ReactElement) => (
  <OfflineActionsContext.Provider value={[{ isNetConnected: false, canSaveChangesOffline: true, actions, orders: null }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
    {ui}
  </OfflineActionsContext.Provider>
)

const filters = (overrides: Record<string, any> = {}) => ({ hasFilters: false, storeOnly: false, storeName: '', summary: [] as string[], clear: jest.fn(), ...overrides })

describe('OrdersNotices', () => {
  it('draws nothing online with no filter', () => {
    const { toJSON } = renderWithProviders(withActions({}, <OrdersNotices split={{ isNetConnected: true, lastUpdate: null }} searchState={filters()} />))
    expect(toJSON()).toBeNull()
  })

  it('offline: when the lists are from and how many changes wait (one, or many)', () => {
    const one = renderWithProviders(withActions({ 1: [{}] }, <OrdersNotices split={{ isNetConnected: false, lastUpdate: '12:31 PM' }} searchState={filters()} />))
    expect(one.getByText('You\'re offline')).toBeTruthy()
    expect(one.getByText('Showing orders from 12:31 PM. 1 change will sync when you\'re back online.')).toBeTruthy()
    const none = renderWithProviders(withActions({}, <OrdersNotices split={{ isNetConnected: false, lastUpdate: null }} searchState={filters()} />))
    expect(none.getByText('Orders will update when you\'re back online.')).toBeTruthy()
  })

  it('filters on: what is filtered, and a Clear that clears it', () => {
    const search = filters({ hasFilters: true, summary: ['Delivery', 'Today'] })
    const { getByText } = renderWithProviders(withActions({}, <OrdersNotices split={{ isNetConnected: true, lastUpdate: null }} searchState={search} />))
    expect(getByText('Filters on: Delivery · Today. You may miss new orders.')).toBeTruthy()
    fireEvent.press(getByText('Clear'))
    expect(search.clear).toHaveBeenCalled()
  })

  it('a store alone: names the store, does not say orders may be missed, and has the same Clear', () => {
    const search = filters({ hasFilters: true, storeOnly: true, storeName: 'Luna Pizza' })
    const { getByText, queryByText } = renderWithProviders(withActions({}, <OrdersNotices split={{ isNetConnected: true, lastUpdate: null }} searchState={search} />))
    expect(getByText('Showing Luna Pizza only.')).toBeTruthy()
    expect(queryByText(/miss new orders/)).toBeNull()
    fireEvent.press(getByText('Clear'))
    expect(search.clear).toHaveBeenCalled()
  })

  it('both notices at once, offline with a filter on', () => {
    const { getByTestId } = renderWithProviders(withActions({}, <OrdersNotices split={{ isNetConnected: false, lastUpdate: null }} searchState={filters({ hasFilters: true, summary: ['Delivery'] })} />))
    expect(getByTestId('orders-offline')).toBeTruthy()
    expect(getByTestId('orders-filter-notice')).toBeTruthy()
  })
})

// The orders list says nothing of its own: it asks the app's one empty state (`NotFoundSource`) with these words.
const EmptyOrders = ({ kind, message }: { kind: any, message?: string }) => {
  const emptyOf = useOrdersEmpty()
  return <NotFoundSource fill {...emptyOf(kind, message)} />
}

describe('the empty state of the orders list', () => {
  it.each([
    ['new', 'No new orders'],
    ['tab', 'No orders here'],
    ['progress', 'No orders in progress'],
    ['active', 'No active orders'],
    ['history', 'No past orders'],
    ['completed', 'No completed orders'],
    ['cancelled', 'No cancelled orders'],
    ['preparing', 'No orders being prepared'],
    ['ready', 'No orders ready for pickup'],
    ['with_driver', 'No orders with a driver'],
    ['preorder', 'No preorders'],
    ['results', 'Sorry, no results found'],
    ['offline', 'Network Error']
  ] as const)('%s', (kind, title) => {
    const { getByText, getByTestId } = renderWithProviders(<EmptyOrders kind={kind} />)
    expect(getByText(title)).toBeTruthy()
    expect(getByTestId(`orders-empty-${kind}`)).toBeTruthy()
    // The one empty state's tile, not a copy of it.
    expect(getByTestId('not-found-icon', { includeHiddenElements: true })).toBeTruthy()
  })

  it('error: the API\'s message', () => {
    expect(renderWithProviders(<EmptyOrders kind='error' message='Not allowed' />).getByText('Not allowed')).toBeTruthy()
  })
})

describe('OrdersSkeleton', () => {
  it('draws the number of cards asked, shaped as cards (with or without buttons)', () => {
    expect(renderWithProviders(<OrdersSkeleton count={3} />).getByTestId('orders-skeleton').children).toHaveLength(3)
    expect(renderWithProviders(<OrdersSkeleton count={1} actions={false} />).getByTestId('orders-skeleton').children).toHaveLength(1)
  })

  it('is shaped as the real card: a band of two bones (status and time) over the header, the facts and the buttons', () => {
    const { UNSAFE_getAllByType } = renderWithProviders(<OrdersSkeleton count={1} />)
    const { SkeletonBone } = require('../../shared')
    const bones = UNSAFE_getAllByType(SkeletonBone)
    // band 2, header 4 (tile, two lines, total), facts 3, buttons 2.
    expect(bones).toHaveLength(11)
    expect(renderWithProviders(<OrdersSkeleton count={1} actions={false} />).UNSAFE_getAllByType(SkeletonBone)).toHaveLength(9)
  })
})
