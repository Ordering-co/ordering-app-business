import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))
import { defaultAppTheme } from '../../../../../theme/engine'
import { OListRow } from '../OListRow'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('OListRow, the plain option (the account pages\' rows)', () => {
  const theme = defaultAppTheme()
  const row = theme.native.components.list_row.base

  it('draws the glyph alone, at the list row\'s icon size and color, with no tile', () => {
    const { UNSAFE_getByProps } = renderWithProviders(<OListRow plain title='Printers' icon='print-outline' onPress={jest.fn()} />)
    const glyph = UNSAFE_getByProps({ name: 'print-outline' })
    expect(glyph.props.size).toBe(row.icon_size)
    expect(glyph.props.color).toBe(row.icon_color)
  })

  it('paints a danger row\'s glyph in the danger text color', () => {
    const { UNSAFE_getByProps } = renderWithProviders(<OListRow plain danger title='Logout' icon='log-out-outline' chevron={false} onPress={jest.fn()} />)
    expect(UNSAFE_getByProps({ name: 'log-out-outline' }).props.color).toBe('danger_text')
  })

  it('is as high as the control: lg for a row that opens something, md for one that only says something', () => {
    const { getByTestId } = renderWithProviders(
      <>
        <OListRow plain title='Opens' onPress={jest.fn()} testID='opens' />
        <OListRow plain title='Says' testID='says' />
      </>
    )
    expect(flat(getByTestId('opens')).minHeight).toBe(theme.native.tokens.size.lg)
    expect(flat(getByTestId('says')).minHeight).toBe(theme.native.tokens.size.md)
  })

  it('keeps the title\'s width when there is something at its end, so the end is the one that gives way', () => {
    const { getByText } = renderWithProviders(<OListRow plain title='Orders display' trailing={<Text>Quick actions on</Text>} />)
    let node: any = getByText('Orders display').parent
    while (node && flat(node)?.flexShrink === undefined) node = node.parent
    expect(flat(node).flexShrink).toBe(0)
  })

  it('still opens what it is given', () => {
    const onPress = jest.fn()
    const { getByText } = renderWithProviders(<OListRow plain title='Sessions' onPress={onPress} />)
    fireEvent.press(getByText('Sessions'))
    expect(onPress).toHaveBeenCalled()
  })

  it('leaves the default as it was: the tile, and the list row\'s own minimum height', () => {
    const { getByTestId, UNSAFE_queryAllByProps } = renderWithProviders(<OListRow title='Sessions' icon='phone-portrait-outline' onPress={jest.fn()} testID='row' />)
    expect(flat(getByTestId('row')).minHeight).toBe(row.min_height)
    // The tile draws the glyph in its own ink, not the plain one's.
    const glyph = UNSAFE_queryAllByProps({ name: 'phone-portrait-outline' })[0]
    expect(glyph.props.color).not.toBe(row.icon_color)
  })
})
