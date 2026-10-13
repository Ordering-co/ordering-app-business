import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useConfig } from '@components'
import { offlineActionsState } from '../../../../../../jest/helpers/b3OrdersUiMock'

jest.mock('@ui', () => {
  const { buildB3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/b3OrdersUiMock')
  return buildB3OrdersIntegrationUiMock()
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/b3OrdersComponentsMock')
  return getMock()
})

import { PreviousOrders } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { makeGroupedOrders, sampleOrder } from '../../../../../../jest/helpers/b3OrdersDefaults'

const baseProps = {
  isBusinessApp: true,
  getOrderStatus: () => 'Pending',
  appTitle: { text: 'Business App' },
  handleChangeOrderStatus: jest.fn(),
  onNavigationRedirect: jest.fn(),
  handleClickOrder: jest.fn()
}

const orderWithoutLogo = {
  ...sampleOrder,
  business: { ...sampleOrder.business, logo: null }
}

const expandOrderGroup = ({ UNSAFE_getAllByType }: { UNSAFE_getAllByType: (type: unknown) => unknown[] }) => {
  const { TouchableOpacity } = require('react-native')
  fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0] as never)
}

describe('PreviousOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders nothing when orders list is empty', () => {
    const { queryByText } = renderWithProviders(
      <PreviousOrders orders={[]} isBusinessApp />
    )
    expect(queryByText('Store A')).toBeNull()
  })

  it('navigates to order details when order is pressed', () => {
    const onNavigationRedirect = jest.fn()
    const handleClickOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[orderWithoutLogo]}
        onNavigationRedirect={onNavigationRedirect}
        handleClickOrder={handleClickOrder}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(handleClickOrder).toHaveBeenCalled()
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderDetails',
      expect.objectContaining({ order: expect.objectContaining({ id: 101 }) })
    )
  })

  it('renders delivery type and status labels', () => {
    const { getByText } = renderWithProviders(
      <PreviousOrders {...baseProps} orders={[orderWithoutLogo]} />
    )
    expect(getByText('Delivery')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('renders pickup label for pickup orders', () => {
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[{ ...orderWithoutLogo, delivery_type: 2 }]}
      />
    )
    expect(getByText('Pickup')).toBeTruthy()
  })

  it('renders external order id when config enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { change_order_id: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[{ ...orderWithoutLogo, external_id: 'EXT-101' }]}
      />
    )
    expect(getByText(/EXT-101/)).toBeTruthy()
  })

  it('shows accept and reject all for grouped pending orders', () => {
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 0 }])}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Accept all'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'accept' })
    )
    fireEvent.press(screen.getByText('Reject all'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'reject' })
    )
  })

  it('marks ready for pickup on in-progress grouped orders', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 7 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Ready for pickup'))
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [101])
  })

  it('ignores a second Ready for pickup tap while the bulk update is pending', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 7 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Ready for pickup'))
    fireEvent.press(screen.getByText('Ready for pickup'))
    expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
  })

  it('does not change status while loadingChangeOrder is true', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 7 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
        loadingChangeOrder
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Ready for pickup'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
  })

  it('shows order not ready action when enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { order_not_ready_enabled: { value: '1' } }
    }])
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 3, delivery_type: 1 }])}
        onNavigationRedirect={onNavigationRedirect}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Order not ready'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'notReady' })
    )
  })

  it('shows review customer for completed grouped orders', () => {
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 1, customer_id: 5 }])}
        getOrderStatus={() => 'Completed'}
        handleSendCustomerReview={jest.fn()}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Review customer'))
    expect(screen.getByText('Review customer')).toBeTruthy()
  })

  it('shows track map action for eligible delivery orders', () => {
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        appTitle={{ text: 'Business App' }}
        orders={makeGroupedOrders([{
          ...orderWithoutLogo,
          status: 9,
          delivery_type: 1,
          customer: { ...orderWithoutLogo.customer, location: { lat: 1, lng: 2 } }
        }])}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Track real time position'))
    expect(screen.getByText('Track real time position')).toBeTruthy()
  })

  it('uses handleClickEvent when provided instead of navigation', () => {
    const handleClickEvent = jest.fn()
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[orderWithoutLogo]}
        handleClickEvent={handleClickEvent}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(handleClickEvent).toHaveBeenCalled()
    expect(onNavigationRedirect).not.toHaveBeenCalled()
  })

  it('renders enterprise timer styling when plan is enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        currentTabSelected="pending"
        orders={[{
          ...orderWithoutLogo,
          time_status: 'at_risk',
          delivery_datetime_utc: '2099-01-01 12:00:00'
        }]}
      />
    )
    expect(getByText('Store A')).toBeTruthy()
  })
})
