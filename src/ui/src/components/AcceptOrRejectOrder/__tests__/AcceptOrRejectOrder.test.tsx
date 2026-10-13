import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return ({ data, defaultButtonText, onSelect }: any) => (
    <View testID="select-dropdown">
      <Text>{defaultButtonText}</Text>
      {data?.map((item: any, index: number) => (
        <TouchableOpacity key={index} onPress={() => onSelect?.(item, index)}>
          <Text>{item?.content ?? item?.label ?? item?.name ?? String(item?.key ?? index)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
})

jest.mock('@ui', () => {
  const { buildB3OrdersUiMock } = require('../../../../../../jest/helpers/b3OrdersUiMock')
  return buildB3OrdersUiMock()
})

import { AcceptOrRejectOrder } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const orderTitle = {
  accept: {
    key: 'PREPARATION_TIME',
    text: 'Preparation time',
    btnKey: 'ACCEPT',
    btnText: 'Accept'
  },
  reject: {
    key: 'REJECT_ORDER',
    text: 'Reject Order',
    btnKey: 'REJECT',
    btnText: 'Reject'
  },
  notReady: {
    key: 'ORDER_NOT_READY',
    text: 'Order not ready',
    btnKey: 'NOT_READY',
    btnText: 'Not ready'
  }
}

describe('AcceptOrRejectOrder', () => {
  it('renders accept flow title and button', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByBusiness' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Preparation time')).toBeTruthy()
    expect(getByText('Accept')).toBeTruthy()
  })

  it('calls handleUpdateOrder on accept', () => {
    const handleUpdateOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByBusiness' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  it('does not submit while loading is true', () => {
    const handleUpdateOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByBusiness' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
        loading
      />
    )
    fireEvent.press(getByText('Accept'))
    expect(handleUpdateOrder).not.toHaveBeenCalled()
  })

  it('does not send a second mutation on double confirm', () => {
    const handleUpdateOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByBusiness' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    fireEvent.press(getByText('Accept'))
    expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
  })

  it('persists accepted status 7 together with prepared_in on confirm', () => {
    const handleUpdateOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByBusiness' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    expect(handleUpdateOrder).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ status: 7, prepared_in: expect.any(Number), id: 1 })
    )
  })

  it('renders reject note when rejecting', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ reject: 'rejectByBusiness' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Reject Order')).toBeTruthy()
    expect(getByText(/Note/)).toBeTruthy()
  })

  it('renders not ready flow for business app', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="notReady"
        orderTitle={orderTitle}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ notReady: 'notReadyByBusiness' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Order not ready')).toBeTruthy()
    expect(getByText('Not ready')).toBeTruthy()
  })

  it('renders driver accept flow', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={{
          accept: { key: 'PREPARATION_TIME', text: 'Preparation time', btnKey: 'ACCEPT', btnText: 'Accept' }
        }}
        appTitle={{ key: 'DELIVERY_APP', text: 'Delivery App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Accept')).toBeTruthy()
  })

  it('renders pickup failed flow with note field', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="pickupFailed"
        orderTitle={{
          pickupFailed: { key: 'PICKUP_FAILED', text: 'Pickup failed', btnKey: 'CONFIRM', btnText: 'Confirm' }
        }}
        appTitle={{ key: 'DELIVERY_APP', text: 'Delivery App' }}
        customerCellphone="5551234"
        orderId={1}
        actions={{ pickupFailed: 'pickupFailedByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Pickup failed')).toBeTruthy()
    expect(getByPlaceholderText('Please type your comments in here')).toBeTruthy()
  })

  describe('forceStatus (order status regression)', () => {
    const forceStatusProps = {
      isPage: true,
      action: 'forceStatus',
      orderTitle: {
        forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' }
      },
      appTitle: { key: 'BUSINESS_APP', text: 'Business App' },
      customerCellphone: '5551234',
      orderId: 1,
      actions: { forceStatus: 'forceStatus' },
      pendingStatusBody: { status: 7, prepared_in: 20 },
      closeModal: jest.fn()
    }

    it('renders the title, the explanation and the reason field', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <AcceptOrRejectOrder {...forceStatusProps} handleUpdateOrder={jest.fn()} />
      )
      expect(getByText('Reason required')).toBeTruthy()
      expect(getByText(/requires a reason/)).toBeTruthy()
      expect(getByPlaceholderText('Please type your comments in here')).toBeTruthy()
    })

    it('does not submit while the reason is empty or whitespace', () => {
      const handleUpdateOrder = jest.fn()
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <AcceptOrRejectOrder {...forceStatusProps} handleUpdateOrder={handleUpdateOrder} />
      )
      fireEvent.press(getByText('Confirm'))
      fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), '   ')
      fireEvent.press(getByText('Confirm'))
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('resends the pending body with the trimmed reason', () => {
      const handleUpdateOrder = jest.fn()
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <AcceptOrRejectOrder {...forceStatusProps} handleUpdateOrder={handleUpdateOrder} />
      )
      fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), '  customer asked  ')
      fireEvent.press(getByText('Confirm'))
      expect(handleUpdateOrder).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 7, prepared_in: 20, reasons: 'customer asked', id: 1 })
      )
    })
  })
})
