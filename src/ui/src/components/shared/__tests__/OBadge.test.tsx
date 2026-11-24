import React from 'react'
import { StyleSheet } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { defaultAppTheme } from '../../../../../theme/engine'
import { OBadge } from '../OBadge'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('OBadge', () => {
  const sm = defaultAppTheme().native.components.badge.sizes.sm

  it('keeps the size\'s side padding on a count, so "99+" sits inside its pill (IPAD-C1)', () => {
    const { getByTestId } = renderWithProviders(<OBadge count variant='danger' testID='count'>99+</OBadge>)
    expect(flat(getByTestId('count')).paddingHorizontal).toBe(sm.padding_x)
    // A digit is still a circle: the width is at least the height.
    expect(flat(getByTestId('count')).minWidth).toBe(sm.height)
  })

  it('is never wider than the room it is given, and its text gives way to an ellipsis (a status from the server)', () => {
    const { getByTestId, getByText } = renderWithProviders(<OBadge testID='state'>Order picked up completed by customer</OBadge>)
    expect(flat(getByTestId('state')).maxWidth).toBe('100%')
    expect(getByText('Order picked up completed by customer').props.numberOfLines).toBe(1)
  })

  it('is a medium badge unless it is a count', () => {
    const md = defaultAppTheme().native.components.badge.sizes.md
    const state = renderWithProviders(<OBadge testID='state'>Paid</OBadge>)
    expect(flat(state.getByTestId('state')).minHeight).toBe(md.height)
    const count = renderWithProviders(<OBadge count testID='count'>3</OBadge>)
    expect(flat(count.getByTestId('count')).minHeight).toBe(sm.height)
  })

  it('with `wrap` the text takes as many lines as it needs, whole, inside the same box', () => {
    const { getByTestId, getByText } = renderWithProviders(<OBadge wrap testID='state'>Driver almost at the customer</OBadge>)
    expect(getByText('Driver almost at the customer').props.numberOfLines).toBeUndefined()
    expect(flat(getByText('Driver almost at the customer')).textAlign).toBe('center')
    expect(flat(getByTestId('state')).maxWidth).toBe('100%')
  })

  it('draws a glyph before its text when it has one', () => {
    const plain = renderWithProviders(<OBadge>Preorder</OBadge>)
    const glyph = renderWithProviders(<OBadge icon='calendar-outline'>Preorder</OBadge>)
    expect(plain.UNSAFE_queryAllByProps({ name: 'calendar-outline' })).toHaveLength(0)
    expect(glyph.UNSAFE_queryAllByProps({ name: 'calendar-outline' }).length).toBeGreaterThan(0)
  })
})
