import React from 'react'
import { Linking } from 'react-native'
import { fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('rn-placeholder', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => React.createElement(View, { testID: 'placeholder' }, children),
    PlaceholderLine: () => React.createElement(View, { testID: 'placeholder-line' }),
    Fade: {}
  }
})

jest.mock('@ui', () => {
  const { buildB5StoresUiMock } = require('../../../../../../jest/helpers/b5StoresUiMock')
  return buildB5StoresUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { storesListDefaults } = require('../../../../../../jest/helpers/b5StoresDefaults')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useOrder: jest.fn(() => [{ options: { type: 1 } }, {}]),
    BusinessList: renderUiController(storesListDefaults)
  }
})

import { StoresList } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('StoresList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders stores header and business cards', async () => {
    const { getByText, getByTestId } = renderWithProviders(<StoresList />)
    expect(getByText('Stores')).toBeTruthy()
    await waitFor(() => {
      expect(getByTestId('business-card-1')).toBeTruthy()
      expect(getByText('Store A')).toBeTruthy()
    })
  })

  it('shows empty state when connected with no businesses', async () => {
    const { getByText } = renderWithProviders(
      <StoresList
        businessesList={{ businesses: [], loading: false, error: null }}
      />
    )
    await waitFor(() => {
      expect(getByText('Sorry, no results found')).toBeTruthy()
    })
  })

  it('shows loading placeholders', async () => {
    const { getAllByTestId } = renderWithProviders(
      <StoresList
        businessesList={{ businesses: [], loading: true, error: null }}
      />
    )
    await waitFor(() => {
      expect(getAllByTestId('placeholder').length).toBeGreaterThan(0)
    })
  })

  it('opens dashboard link for more settings', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
    const { getByText } = renderWithProviders(<StoresList />)
    await waitFor(() => expect(getByText(/dashboard\.orderingplus\.com/)).toBeTruthy())
    fireEvent.press(getByText(/dashboard\.orderingplus\.com/))
    expect(openURL).toHaveBeenCalled()
    openURL.mockRestore()
  })

  it('clears search via cancel control', async () => {
    const handleChangeSearch = jest.fn()
    const { getByPlaceholderText, UNSAFE_getAllByType } = renderWithProviders(
      <StoresList searchValue="pizza" handleChangeSearch={handleChangeSearch} />
    )
    await waitFor(() => expect(getByPlaceholderText('Search')).toBeTruthy())
    const { TouchableOpacity } = require('react-native')
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    // SearchBar cancel X is a TouchableOpacity near the search input
    const cancel = buttons.find((node: any) => typeof node.props.onPress === 'function')
    fireEvent.press(cancel)
    expect(handleChangeSearch).toHaveBeenCalledWith('')
  })
})
