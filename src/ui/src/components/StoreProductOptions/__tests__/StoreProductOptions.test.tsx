import '../../../../../../jest/helpers/registerB5NativeMocks'

import React from 'react'
import { fireEvent, within } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  return {
    ...mockOrdering,
    StoreProductOptions: renderUiController({})
  }
})

import { StoreProductOptions } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const extras = [
  { id: 166, name: 'Adicionales', enabled: true },
  { id: 397, name: 'Size', enabled: false },
  { id: 2971, name: 'Adicionales EXA', enabled: true }
]

const loadedGroup = {
  loading: false,
  error: null,
  loaded: true,
  options: [
    {
      id: 166,
      name: 'Adicional 1',
      enabled: true,
      suboptions: [
        { id: 232, name: 'Crema', enabled: true },
        { id: 468, name: 'Moras', enabled: false }
      ]
    },
    { id: 6964, name: 'Adicional 3', enabled: false, suboptions: [] }
  ]
}

const getToggle = (getByTestId: any, testID: string) =>
  within(getByTestId(testID)).getByTestId('toggle-switch')

const buildProps = (overrides: any = {}): any => ({
  navigation: { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  productName: 'Big burger',
  productState: { product: { id: 1981, name: 'Big burger' }, extras, productExtraIds: [166, 397], loading: false, error: null },
  extraOptionsState: {},
  updatingState: { extras: [], options: [], suboptions: [] },
  handleLoadExtraOptions: jest.fn(),
  handleChangeProductExtra: jest.fn(),
  handleUpdateOption: jest.fn(),
  handleUpdateSuboption: jest.fn(),
  handleReload: jest.fn(),
  ...overrides
})

const renderExpanded = (overrides: any = {}) => {
  const props = buildProps({ extraOptionsState: { 166: loadedGroup }, ...overrides })
  const utils = renderWithProviders(<StoreProductOptions {...props} />)
  fireEvent.press(utils.getByTestId('extra-166'))
  return { props, ...utils }
}

describe('StoreProductOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the product groups collapsed without loading their options', () => {
    const props = buildProps()
    const { getByText, getAllByText, queryByText } = renderWithProviders(<StoreProductOptions {...props} />)
    expect(getByText('Big burger')).toBeTruthy()
    expect(getByText('Adicionales')).toBeTruthy()
    expect(getByText('Size')).toBeTruthy()
    expect(getByText('Adicionales EXA')).toBeTruthy()
    expect(getAllByText('Disabled')).toHaveLength(1)
    expect(queryByText('Adicional 1')).toBeNull()
    expect(props.handleLoadExtraOptions).not.toHaveBeenCalled()
  })

  it('marks the groups attached to the product', () => {
    const { getByTestId } = renderWithProviders(<StoreProductOptions {...buildProps()} />)
    expect(getByTestId('extra-checkbox-166').props.accessibilityState).toMatchObject({ checked: true, disabled: false })
    expect(getByTestId('extra-checkbox-397').props.accessibilityState.checked).toBe(true)
    expect(getByTestId('extra-checkbox-2971').props.accessibilityState.checked).toBe(false)
  })

  it('attaches or detaches a group without expanding it', () => {
    const props = buildProps()
    const { getByTestId } = renderWithProviders(<StoreProductOptions {...props} />)
    fireEvent.press(getByTestId('extra-checkbox-2971'))
    expect(props.handleChangeProductExtra).toHaveBeenLastCalledWith(2971, true)
    fireEvent.press(getByTestId('extra-checkbox-166'))
    expect(props.handleChangeProductExtra).toHaveBeenLastCalledWith(166, false)
    expect(props.handleLoadExtraOptions).not.toHaveBeenCalled()
  })

  it('disables every group checkbox and shows a loader while a group change is saving', () => {
    const props = buildProps({ updatingState: { extras: [2971], options: [], suboptions: [] } })
    const { getByTestId, queryByTestId } = renderWithProviders(<StoreProductOptions {...props} />)
    expect(getByTestId('extra-checkbox-2971-saving')).toBeTruthy()
    expect(queryByTestId('extra-checkbox-166-saving')).toBeNull()
    expect(getByTestId('extra-checkbox-166').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(getByTestId('extra-checkbox-166'))
    expect(props.handleChangeProductExtra).not.toHaveBeenCalled()
  })

  it('expands a group that is not attached to the product', () => {
    const props = buildProps()
    const { getByTestId } = renderWithProviders(<StoreProductOptions {...props} />)
    fireEvent.press(getByTestId('extra-2971'))
    expect(props.handleLoadExtraOptions).toHaveBeenCalledWith(2971)
  })

  it('loads the options of a group when it is expanded', () => {
    const props = buildProps()
    const { getByTestId } = renderWithProviders(<StoreProductOptions {...props} />)
    fireEvent.press(getByTestId('extra-166'))
    expect(props.handleLoadExtraOptions).toHaveBeenCalledWith(166)
    fireEvent.press(getByTestId('extra-166'))
    expect(props.handleLoadExtraOptions).toHaveBeenCalledTimes(1)
  })

  it('renders the loaded options and suboptions including disabled ones', () => {
    const { getByText, getAllByText, getByTestId } = renderExpanded()
    expect(getByText('Adicional 1')).toBeTruthy()
    expect(getByText('Moras')).toBeTruthy()
    expect(getByText('Adicional 3')).toBeTruthy()
    expect(getAllByText('Disabled')).toHaveLength(3)
    expect(getToggle(getByTestId, 'option-toggle-6964').props.isOn).toBe(false)
    expect(getToggle(getByTestId, 'suboption-toggle-232').props.isOn).toBe(true)
  })

  it('shows a loader while the group options load', () => {
    const { getByTestId, queryByText } = renderExpanded({
      extraOptionsState: { 166: { options: [], loading: true, error: null, loaded: false } }
    })
    expect(getByTestId('extra-166-loading')).toBeTruthy()
    expect(queryByText('Adicional 1')).toBeNull()
  })

  it('shows a group error and retries forcing the request', () => {
    const { props, getByText, getByTestId } = renderExpanded({
      extraOptionsState: { 166: { options: [], loading: false, error: ['Network Error'], loaded: false } }
    })
    expect(getByText('We couldn\'t load the product options')).toBeTruthy()
    fireEvent.press(getByTestId('extra-166-retry'))
    expect(props.handleLoadExtraOptions).toHaveBeenLastCalledWith(166, true)
  })

  it('shows an empty group message', () => {
    const { getByText } = renderExpanded({
      extraOptionsState: { 166: { options: [], loading: false, error: null, loaded: true } }
    })
    expect(getByText('This group has no options')).toBeTruthy()
  })

  it('toggles an option with its group id', () => {
    const { props, getByTestId } = renderExpanded()
    getToggle(getByTestId, 'option-toggle-6964').props.onToggle(true)
    expect(props.handleUpdateOption).toHaveBeenCalledWith(166, 6964, true)
  })

  it('toggles a suboption with its group and option ids', () => {
    const { props, getByTestId } = renderExpanded()
    getToggle(getByTestId, 'suboption-toggle-468').props.onToggle(true)
    expect(props.handleUpdateSuboption).toHaveBeenCalledWith(166, 166, 468, true)
  })

  it('disables the toggle and shows a loader while saving', () => {
    const { getByTestId } = renderExpanded({ updatingState: { options: [], suboptions: [468] } })
    expect(getToggle(getByTestId, 'suboption-toggle-468').props.disabled).toBe(true)
    expect(getByTestId('suboption-toggle-468-updating')).toBeTruthy()
    expect(getToggle(getByTestId, 'suboption-toggle-232').props.disabled).toBe(false)
  })

  it('collapses an expanded group', () => {
    const { getByTestId, queryByText } = renderExpanded()
    expect(queryByText('Moras')).toBeTruthy()
    fireEvent.press(getByTestId('extra-166'))
    expect(queryByText('Moras')).toBeNull()
  })

  it('shows the loading state', () => {
    const { getByTestId, queryByText } = renderWithProviders(
      <StoreProductOptions {...buildProps({ productState: { product: null, extras: [], loading: true, error: null } })} />
    )
    expect(getByTestId('product-options-loading')).toBeTruthy()
    expect(queryByText('Adicionales')).toBeNull()
  })

  it('shows the empty state for a product without options', () => {
    const { getByText } = renderWithProviders(
      <StoreProductOptions {...buildProps({ productState: { product: { id: 1 }, extras: [], loading: false, error: null } })} />
    )
    expect(getByText('This product has no options')).toBeTruthy()
  })

  it('shows the product error state and retries', () => {
    const props = buildProps({ productState: { product: null, extras: [], loading: false, error: ['Network Error'] } })
    const { getByText } = renderWithProviders(<StoreProductOptions {...props} />)
    expect(getByText('We couldn\'t load the product options')).toBeTruthy()
    fireEvent.press(getByText('Retry'))
    expect(props.handleReload).toHaveBeenCalled()
  })

  it('goes back when the arrow is pressed', () => {
    const props = buildProps()
    const { UNSAFE_getAllByType } = renderWithProviders(<StoreProductOptions {...props} />)
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(props.navigation.goBack).toHaveBeenCalled()
  })
})
