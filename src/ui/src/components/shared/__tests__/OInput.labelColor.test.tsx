import React from 'react'
import { StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'
import OInput from '../OInput'

describe('OInput: the ink of its label (`labelColor`)', () => {
  const theme: any = defaultAppTheme()

  it('keeps the field\'s own label color by default', () => {
    const { getByText } = renderWithProviders(<OInput scope='account_page' placeholder='Email' onChange={jest.fn()} />)
    expect(StyleSheet.flatten(getByText('Email').props.style).color).toBe(theme.native.components.field.base.label_color)
  })

  it('paints the label above the box in the color it is given (a field over a photo)', () => {
    const { getByText } = renderWithProviders(
      <OInput scope='account_page' placeholder='Email' labelColor='#ABCDEF' onChange={jest.fn()} />
    )
    expect(StyleSheet.flatten(getByText('Email').props.style).color).toBe('#ABCDEF')
  })

  it('colors the label of a field whose label is its placeholder (every field, in this schema)', () => {
    const { getByText } = renderWithProviders(
      <OInput placeholder='Email' labelColor='#ABCDEF' onChange={jest.fn()} />
    )
    expect(StyleSheet.flatten(getByText('Email').props.style).color).toBe('#ABCDEF')
  })

  it('`inline` keeps the placeholder inside the box, with no label above it; a `label` still goes above', () => {
    const inline = renderWithProviders(<OInput inline placeholder='Search' onChange={jest.fn()} />)
    expect(inline.queryByText('Search')).toBeNull()
    expect(inline.getByPlaceholderText('Search')).toBeTruthy()
    inline.unmount()
    const named = renderWithProviders(<OInput inline label='Find' placeholder='Order number' onChange={jest.fn()} />)
    expect(named.getByText('Find')).toBeTruthy()
    expect(named.getByPlaceholderText('Order number')).toBeTruthy()
  })
})
