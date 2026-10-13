import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import OrderSummary from '../OrderSummary'

describe('OrderSummary', () => {
  it('renders order summary with route params', () => {
    const order = { id: 10, total: 25.5 }
    const { getByTestId } = renderPage(OrderSummary, {
      route: {
        params: {
          order,
          orderStatus: { slug: 'COMPLETED' }
        }
      }
    })
    expect(getByTestId('order-summary')).toBeTruthy()
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })
})
