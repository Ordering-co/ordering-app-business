import React from 'react'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { OrderBill } from '../OrderBill'
import { PaymentCard } from '../PaymentCard'

const components = require('@components')

const money = (value: number) => `$${Number(value).toFixed(2)}`

/** An order the bill reads: the amounts of the order's `summary` and what stands between them. */
const order = (summary: any, extra: any = {}) => ({
  id: 2988,
  status: 4,
  delivery_type: 2,
  summary,
  taxes: [],
  fees: [],
  offers: [],
  products: [],
  paymethod: { gateway: 'cash', name: 'Cash' },
  ...extra,
})

beforeEach(() => {
  components.useUtils.mockReturnValue([{ parsePrice: money, parseNumber: (value: number) => value }])
})

describe('OrderBill: the subtotal is a row only when it says something the total does not', () => {
  it('draws no bill when the subtotal is the total and nothing stands between them (a ready pickup)', () => {
    const { queryByTestId, queryByText } = renderWithProviders(<OrderBill order={order({ subtotal: 12, total: 12 })} />)
    expect(queryByTestId('order-bill')).toBeNull()
    expect(queryByText('Subtotal')).toBeNull()
  })

  it('draws it when the amounts differ', () => {
    const { getByText } = renderWithProviders(<OrderBill order={order({ subtotal: 12, total: 14.5 })} />)
    expect(getByText('Subtotal')).toBeTruthy()
    expect(getByText('$12.00')).toBeTruthy()
  })

  it('draws it with the delivery fee, the tip and the discount that stand between it and the total', () => {
    const { getByText } = renderWithProviders(
      <OrderBill order={order({ subtotal: 29.5, total: 32.37, delivery_price: 2.5, driver_tip: 3, discount: 5 }, { delivery_type: 1, driver_tip: 3, discount: 5 })} />
    )
    expect(getByText('Subtotal')).toBeTruthy()
    expect(getByText('Delivery Fee')).toBeTruthy()
    expect(getByText('Driver tip')).toBeTruthy()
    expect(getByText('Discount')).toBeTruthy()
  })

  it('draws it with a line between even when the amounts are the same', () => {
    const { getByText } = renderWithProviders(
      <OrderBill order={order({ subtotal: 20, total: 20, delivery_price: 0 }, { delivery_type: 1 })} />
    )
    expect(getByText('Subtotal')).toBeTruthy()
    expect(getByText('Delivery Fee')).toBeTruthy()
  })

  it('treats amounts that round to the same cent as the same', () => {
    const { queryByTestId } = renderWithProviders(<OrderBill order={order({ subtotal: 12.004, total: 12 })} />)
    expect(queryByTestId('order-bill')).toBeNull()
  })
})

describe('PaymentCard: the total alone', () => {
  it('has the total and no bill, no line over it, for a ready pickup', () => {
    const { getByTestId, queryByTestId, queryByText } = renderWithProviders(<PaymentCard order={order({ subtotal: 12, total: 12 })} />)
    expect(getByTestId('payment-amount').props.children).toBe('$12.00')
    expect(queryByTestId('order-bill')).toBeNull()
    expect(queryByText('Subtotal')).toBeNull()
  })

  it('does not fold a total that has nothing under it', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<PaymentCard folded order={order({ subtotal: 12, total: 12 })} />)
    expect(queryByTestId('payment-folded')).toBeNull()
    expect(getByTestId('payment-total')).toBeTruthy()
  })

  it('keeps the fold when there is a bill to open', () => {
    const { getByTestId } = renderWithProviders(<PaymentCard folded order={order({ subtotal: 12, total: 14.5 })} />)
    expect(getByTestId('payment-folded')).toBeTruthy()
  })
})
