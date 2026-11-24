import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  const base = require('../../../jest/helpers/mockUi')
  return {
    ...base,
    ScreenContainer: ({ children }: any) => React.createElement(View, { testID: 'screen-container' }, children),
    StoreProductOptions: (props: any) => React.createElement(View, { testID: 'store-product-options' },
      React.createElement(Text, { testID: 'options-ids' }, JSON.stringify({ businessId: props.businessId, categoryId: props.categoryId, productId: props.productId, productName: props.productName })))
  }
})

import ProductOptions from '../ProductOptions'

describe('ProductOptions', () => {
  it('is the options of the product of the route, in the phone\'s column', () => {
    const { getByTestId } = renderPage(ProductOptions, { route: { params: { businessId: 5, categoryId: 11, productId: 2, productName: 'Margherita' } } })
    expect(getByTestId('store-product-options')).toBeTruthy()
    expect(JSON.parse(getByTestId('options-ids').props.children)).toEqual({ businessId: 5, categoryId: 11, productId: 2, productName: 'Margherita' })
    expect(getByTestId('screen-container')).toBeTruthy()
  })
})
