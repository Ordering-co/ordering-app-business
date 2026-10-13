import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useUtils } from '@components'

jest.mock('@ui', () => ({
  DeviceOrientationMethods: {
    useDeviceOrientation: jest.fn(() => [{
      orientation: 'portrait',
      dimensions: { width: 390, height: 844 }
    }])
  }
}))

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { ProductItemAccordion } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const mockParsePrice = jest.fn((value: number) => `SRD ${value}`)

describe('ProductItemAccordion', () => {
  beforeEach(() => {
    mockParsePrice.mockClear()
    ;(useUtils as jest.Mock).mockReturnValue([{
      parsePrice: mockParsePrice
    }])
  })

  it('uses the configured price formatter without overriding its currency', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Burger',
          quantity: 1,
          price: 10,
          options: '[]',
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText('Burger')).toBeTruthy()
    expect(mockParsePrice).toHaveBeenCalledWith(10)
  })

  it('toggles accordion when clickable', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        isClickableEvent
        product={{
          id: 1,
          name: 'Burger',
          quantity: 2,
          price: 10,
          options: '[]',
          ingredients: [],
          comment: 'Extra sauce'
        }}
        currency="USD"
      />
    )
    fireEvent.press(getByText('Burger'))
    expect(getByText('Extra sauce')).toBeTruthy()
  })

  it('renders options when product has nested options', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Pizza',
          quantity: 1,
          price: 12,
          options: JSON.stringify([
            {
              name: 'Toppings',
              suboptions: [{ quantity: 1, name: 'Cheese', position: 'whole', price: 2 }]
            }
          ]),
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText('Pizza')).toBeTruthy()
    expect(getByText(/Cheese/)).toBeTruthy()
  })

  it('still renders when product options JSON is malformed', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Burger',
          quantity: 1,
          price: 10,
          options: '[{"name":',
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText('Burger')).toBeTruthy()
  })

  it('shows remove option when cart pending', () => {
    const onDeleteProduct = jest.fn()
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        isCartPending
        onDeleteProduct={onDeleteProduct}
        getProductMax={() => 2}
        product={{
          id: 1,
          name: 'Salad',
          quantity: 1,
          price: 8,
          options: '[]',
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText('Salad')).toBeTruthy()
  })
})
