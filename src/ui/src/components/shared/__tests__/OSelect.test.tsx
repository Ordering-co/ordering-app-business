import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { defaultAppTheme } from '../../../../../theme/engine'
import { OSelect } from '../index'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const components = defaultAppTheme().native.components
const options = [{ value: 'a', label: 'Luna Pizza' }, { value: 'b', label: 'Green Bowl' }]

/** The one select: its trigger is the input's look, its choices open in a sheet (a centered card on a tablet). */
describe('OSelect', () => {
  it('shows the selected option on a trigger as tall as a field, and opens a sheet of rows', () => {
    const onSelect = jest.fn()
    const view = renderWithProviders(<OSelect title='Store' options={options} value='a' onSelect={onSelect} testID='select' />)
    expect(view.getByText('Luna Pizza')).toBeTruthy()
    expect(flat(view.getByTestId('select')).minHeight).toBe(components.input.sizes.md.height)
    fireEvent.press(view.getByTestId('select'))
    expect(view.getByText('Store')).toBeTruthy()
    fireEvent.press(view.getByText('Green Bowl'))
    expect(onSelect).toHaveBeenCalledWith('b', expect.objectContaining({ value: 'b' }))
  })

  it('opens the same sheet on a tablet, as a card', () => {
    const view = renderWithProviders(<OSelect title='Store' options={options} onSelect={jest.fn()} testID='select' placeholder='Choose' />, { platform: 'tablet' })
    expect(view.getByText('Choose')).toBeTruthy()
    fireEvent.press(view.getByTestId('select'))
    expect(view.getByText('Luna Pizza')).toBeTruthy()
    expect(view.queryByTestId('sheet-handle', { hidden: true })).toBeNull()
  })

  it('says "Search" in the search field of a sheet that was given no placeholder (IPAD-C3), and keeps the one it is given', () => {
    const plain = renderWithProviders(<OSelect title='Store' options={options} onSelect={jest.fn()} testID='select' searchable />)
    fireEvent.press(plain.getByTestId('select'))
    expect(plain.getByPlaceholderText('Search')).toBeTruthy()
    const named = renderWithProviders(<OSelect title='Country' options={options} onSelect={jest.fn()} testID='select2' searchable searchPlaceholder='Find a country' />)
    fireEvent.press(named.getByTestId('select2'))
    expect(named.getByPlaceholderText('Find a country')).toBeTruthy()
  })

  it('does not open when disabled', () => {
    const view = renderWithProviders(<OSelect title='Store' options={options} onSelect={jest.fn()} testID='select' disabled />)
    fireEvent.press(view.getByTestId('select'))
    expect(view.queryByText('Luna Pizza')).toBeNull()
  })
})
