import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const { View, Text } = require('react-native')
  return {
    SafeAreaContainerLayout: ({ children }: any) => <View testID='safe-area-layout'>{children}</View>,
    OrdersDisplaySettings: (props: any) => <Text testID='orders-display'>{typeof props.navigation?.goBack}</Text>
  }
})

import OrdersDisplay from '../OrdersDisplay'

describe('OrdersDisplay', () => {
  it('renders the orders display settings with the stack\'s navigation', () => {
    const { getByTestId } = renderPage(OrdersDisplay)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('orders-display').props.children).toBe('function')
  })
})
