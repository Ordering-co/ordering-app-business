import React from 'react'
import { Text } from 'react-native'

import { defaultAppTheme } from '../../../../../theme/engine'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { CardRow, RowsCard } from '../RowsCard'
import { ProfileRow } from '../ProfileRow'

describe('RowsCard and ProfileRow', () => {
  it('puts a divider between the rows and the trailing row, not before the first', () => {
    const { getAllByTestId, getByText } = renderWithProviders(
      <RowsCard trailing={<Text>trailing</Text>}>
        <CardRow testID='row'><Text>one</Text></CardRow>
        <CardRow testID='row'><Text>two</Text></CardRow>
      </RowsCard>
    )
    expect(getAllByTestId('row')).toHaveLength(2)
    expect(getByText('trailing')).toBeTruthy()
  })

  it('shows the value of a row at its end, one line, before the chevron of a row that opens something', () => {
    const { getByText, UNSAFE_queryAllByProps } = renderWithProviders(
      <RowsCard><ProfileRow title='Language' value='English' icon='globe-outline' onPress={jest.fn()} /></RowsCard>
    )
    expect(getByText('English').props.numberOfLines).toBe(1)
    expect(UNSAFE_queryAllByProps({ name: 'chevron-forward' }).length).toBeGreaterThan(0)
  })

  it('writes an information row inverted: the name muted, the value in the body text', () => {
    const { getByText } = renderWithProviders(
      <RowsCard><ProfileRow information title='Name' value='Ana' /></RowsCard>
    )
    const { StyleSheet } = require('react-native')
    const theme = defaultAppTheme()
    expect(StyleSheet.flatten(getByText('Name').props.style).color).toBe(theme.native.tokens.color.text_muted)
    expect(StyleSheet.flatten(getByText('Ana').props.style).color).toBe(theme.native.tokens.color.text)
  })
})
