import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { ProductItemAccordion } from '..'

const components = require('@components')

const product = {
  id: 11,
  quantity: 2,
  name: 'Pizza',
  price: 10,
  comment: 'Well done',
  options: [{ name: 'Size', suboptions: [{ name: 'Large', quantity: 1, price: 2 }, { name: 'Cheese', quantity: 1, price: 4, half_price: 2, position: 'left' }] }],
  ingredients: { 1: { name: 'olives', selected: false } }
}

beforeEach(() => {
  components.useUtils.mockReturnValue([{ parsePrice: (value: number) => `$${Number(value).toFixed(2)}` }, {}])
})

describe('ProductItemAccordion (a product line)', () => {
  it('writes the quantity, the name, the options, the ingredient taken out, the note and the line price (half price for a half option)', () => {
    const { getByText } = renderWithProviders(<ProductItemAccordion product={product} />)
    expect(getByText('2 ×')).toBeTruthy()
    expect(getByText('Pizza')).toBeTruthy()
    expect(getByText('Size: Large, Cheese (left) · No olives')).toBeTruthy()
    expect(getByText('Note: Well done')).toBeTruthy()
    expect(getByText('$28.00')).toBeTruthy()
  })

  it('has no checkbox unless it is on the checklist', () => {
    const { queryByTestId } = renderWithProviders(<ProductItemAccordion product={product} />)
    expect(queryByTestId('product-check-11')).toBeNull()
  })

  it('centers the checkbox\'s touch box on the product\'s first line, not on the row (IPAD-C6)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const line = theme.native.tokens.typography.label.lineHeight ?? theme.native.tokens.typography.label.size * theme.native.tokens.typography.label.line
    const target = theme.native.components.button.sizes.md.height
    const view = renderWithProviders(<ProductItemAccordion product={product} checklist={{ checked: false, onToggle: jest.fn() }} />)
    let box: any = view.getByTestId('product-check-11')
    while (box && StyleSheet.flatten(box.props.style)?.minHeight === undefined) box = box.parent
    const style = StyleSheet.flatten(box.props.style)
    expect(style.minHeight).toBe(target)
    expect(style.marginVertical).toBeCloseTo(-(target - line) / 2, 1)
  })

  it('the checklist checkbox toggles and strikes the line through when checked', () => {
    const onToggle = jest.fn()
    const view = renderWithProviders(<ProductItemAccordion product={product} checklist={{ checked: false, onToggle }} />)
    fireEvent.press(view.getByTestId('product-check-11'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(view.getByText('Pizza').props.style)).not.toContain('line-through')
    view.rerender(<ProductItemAccordion product={product} checklist={{ checked: true, onToggle }} />)
    expect(view.getByTestId('product-check-11').props.accessibilityState.checked).toBe(true)
    expect(JSON.stringify(view.getByText('Pizza').props.style)).toContain('line-through')
  })
})
