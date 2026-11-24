import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { StageChips } from '../StageChips'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const chips = [
  { key: 'preparing' as const, text: 'Preparing' },
  { key: 'ready' as const, text: 'Ready for pickup' },
  { key: 'with_driver' as const, text: 'With driver' }
]

describe('StageChips', () => {
  it('draws each chip as its text, the selected one marked, and calls back with the stage tapped', () => {
    const onSelect = jest.fn()
    const { getByTestId } = renderWithProviders(<StageChips chips={chips} selected='preparing' onSelect={onSelect} />)
    expect(getByTestId('orders-stage-preparing').props.accessibilityLabel).toBe('Preparing')
    expect(getByTestId('orders-stage-preparing').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('orders-stage-with_driver').props.accessibilityLabel).toBe('With driver')
    fireEvent.press(getByTestId('orders-stage-ready'))
    expect(onSelect).toHaveBeenCalledWith('ready')
  })

  it('draws no number and keeps no room for one: a chip is its text', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<StageChips chips={chips} selected='preparing' onSelect={jest.fn()} />)
    for (const chip of chips) {
      expect(queryByTestId(`orders-stage-${chip.key}-count`)).toBeNull()
      expect(getByTestId(`orders-stage-${chip.key}`)).not.toHaveTextContent(/\d/)
    }
  })

  it('scrolls sideways, so no chip is cut or truncated on a narrow screen', () => {
    const { getByTestId } = renderWithProviders(<StageChips chips={chips} selected='preparing' onSelect={jest.fn()} />)
    expect(getByTestId('orders-stages').props.horizontal).toBe(true)
  })

  it('is one component for both rows: the keys are the caller\'s, and the row\'s test id too', () => {
    const onSelect = jest.fn()
    const row = [{ key: 'pending' as const, text: 'Pending' }, { key: 'preorder' as const, text: 'Preorder' }]
    const { getByTestId } = renderWithProviders(<StageChips chips={row} selected='pending' onSelect={onSelect} testID='orders-new-stages' />)
    expect(getByTestId('orders-new-stages').props.horizontal).toBe(true)
    expect(getByTestId('orders-stage-preorder').props.accessibilityLabel).toBe('Preorder')
    fireEvent.press(getByTestId('orders-stage-preorder'))
    expect(onSelect).toHaveBeenCalledWith('preorder')
  })

  it('draws All first', () => {
    const row = [{ key: 'all' as const, text: 'All' }, ...chips]
    const { getByTestId } = renderWithProviders(<StageChips chips={row} selected='preparing' onSelect={jest.fn()} />)
    expect(getByTestId('orders-stage-all').props.accessibilityLabel).toBe('All')
    expect(getByTestId('orders-stage-all').props.accessibilityState.selected).toBe(false)
  })
})
