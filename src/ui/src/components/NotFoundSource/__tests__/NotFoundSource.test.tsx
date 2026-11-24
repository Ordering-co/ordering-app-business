import React from 'react'
import { Text, View } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { NotFoundSource } from '..'

describe('NotFoundSource', () => {
  it('renders content and handles button press', () => {
    const onClickButton = jest.fn()
    const { getByText } = renderWithProviders(
      <NotFoundSource
        content="Page not found"
        btnTitle="Go back"
        onClickButton={onClickButton}
      />
    )
    expect(getByText('Page not found')).toBeTruthy()
    fireEvent.press(getByText('Go back'))
    expect(onClickButton).toHaveBeenCalled()
  })

  it('writes a footnote under its action (the printers\' PDF line), and nothing without one', () => {
    const view = renderWithProviders(<NotFoundSource content='No printers yet' btnTitle='Add printer' onClickButton={jest.fn()} footnote='Share it as a PDF' />)
    expect(view.getByText('Share it as a PDF')).toBeTruthy()
    expect(renderWithProviders(<NotFoundSource content='x' />).queryByText('Share it as a PDF')).toBeNull()
  })

  it('draws the theme tile and no picture by default', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<NotFoundSource content="Nothing here" />)
    expect(getByTestId('not-found-icon', { includeHiddenElements: true })).toBeTruthy()
    expect(queryByTestId('not-found-image')).toBeNull()
  })

  it('draws the caller\'s picture instead of the tile, and hides a conditioned message under it', () => {
    const { getByTestId, queryByTestId, queryByText } = renderWithProviders(
      <NotFoundSource image={{ uri: 'https://example.com/empty.png' }} content="Hidden" conditioned />
    )
    expect(getByTestId('not-found-image')).toBeTruthy()
    expect(queryByTestId('not-found-icon', { includeHiddenElements: true })).toBeNull()
    expect(queryByText('Hidden')).toBeNull()
  })

  it('shows a conditioned message while there is no picture', () => {
    const { getByText } = renderWithProviders(<NotFoundSource content="Shown" conditioned />)
    expect(getByText('Shown')).toBeTruthy()
  })

  it('renders children and the action together', () => {
    const { getByText } = renderWithProviders(
      <NotFoundSource content="Missing" btnTitle="Retry" onClickButton={() => {}}>
        <View><Text>Custom child</Text></View>
      </NotFoundSource>
    )
    expect(getByText('Custom child')).toBeTruthy()
    expect(getByText('Retry')).toBeTruthy()
  })
})

// Harmony H16: the one empty state. Orders, stores, menu, options and printers draw this instead of their own copies.
describe('NotFoundSource as the app\'s one empty state', () => {
  const { StyleSheet } = require('react-native')
  const { defaultAppTheme } = require('../../../../../theme/engine')
  const empty = defaultAppTheme().native.components.empty_state
  const flat = (node: any) => StyleSheet.flatten(node.props.style)

  it('draws the title and the line from the theme\'s keys (`title`, `text`, `text_color`)', () => {
    const { getByText } = renderWithProviders(<NotFoundSource content='No new orders' text='New orders show up here.' />)
    expect(flat(getByText('No new orders')).fontSize).toBe(empty.base.title.fontSize)
    expect(flat(getByText('New orders show up here.'))).toMatchObject({ fontSize: empty.base.text.fontSize, color: empty.base.text_color })
  })

  it('takes the box\'s gap and padding from the theme, and centres itself in the room it is given with `fill`', () => {
    const { getByTestId } = renderWithProviders(<NotFoundSource content='Nothing' fill testID='empty' />)
    expect(flat(getByTestId('empty'))).toMatchObject({ flexGrow: 1, paddingVertical: empty.base.padding_y, paddingHorizontal: empty.base.padding_x, gap: empty.base.gap })
  })

  it('does not fill the room unless asked (a row of a list)', () => {
    const { getByTestId } = renderWithProviders(<NotFoundSource content='Nothing' testID='empty' />)
    expect(flat(getByTestId('empty')).flexGrow).toBeUndefined()
  })

  it('draws its action as wide as its label (the kit: one soft 44 button), pressable by its test id', () => {
    const onClickButton = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(<NotFoundSource content='Missing' btnTitle='Retry' onClickButton={onClickButton} actionTestID='retry' />)
    fireEvent.press(getByText('Retry'))
    expect(onClickButton).toHaveBeenCalled()
    expect(getByTestId('retry')).toBeTruthy()
  })
})
