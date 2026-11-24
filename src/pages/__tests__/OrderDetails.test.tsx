import React from 'react'
import { View } from 'react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

const mockPage = jest.fn((props: any) => <View testID='order-details-page' {...{ presentation: props.presentation }} />)
jest.mock('@ui', () => ({
  OrderDetailsPage: (props: any) => mockPage(props),
  SafeAreaContainerLayout: ({ children }: any) => <>{children}</>,
  ScreenContainer: ({ children }: any) => <>{children}</>
}))

import OrderDetails from '../OrderDetails'
import { orderDetailsScreens } from '../../navigators/routes/orderDetails'

describe('OrderDetails page', () => {
  it('is the details as a stack screen, with the order of the route', () => {
    const order = { id: 42, status: 7 }
    const { getByTestId, navigation } = renderPage(OrderDetails, {
      route: { params: { orderId: 42, order, isFromCheckout: false, isFromRoot: true } }
    })
    expect(getByTestId('order-details-page').props.presentation).toBe('screen')
    expect(mockPage).toHaveBeenCalledWith({
      presentation: 'screen',
      navigation,
      orderId: 42,
      order,
      isFromCheckout: false,
      isFromRoot: true
    })
  })

  it('takes the order id from the order of the route when there is no id', () => {
    renderPage(OrderDetails, { route: { params: { order: { id: 99 } } } })
    expect(mockPage.mock.calls[0][0].orderId).toBe(99)
  })

  it('is the OrderDetails route of the stack, without a native header', () => {
    expect(orderDetailsScreens).toEqual([{ name: 'OrderDetails', component: OrderDetails, options: { headerShown: false } }])
  })
})
