import React from 'react'
import { act, fireEvent, within } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY', parsePrice: (value: number) => '$' + Number(value).toFixed(2) }, {}]),
    StoreProductOptions: renderUiController({})
  }
})

import { StoreProductOptions } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const NOW = new Date('2026-11-19T18:05:09Z')

const extras = [
  { id: 1, name: 'Size', enabled: true },
  { id: 2, name: 'Extras', enabled: true },
  { id: 3, name: 'Sauces', enabled: false }
]

const sizeGroup = {
  loading: false,
  error: null,
  loaded: true,
  options: [{
    id: 11,
    name: 'Size',
    min: 1,
    max: 1,
    enabled: true,
    suboptions: [
      { id: 111, name: 'Small', price: 0, enabled: true },
      { id: 112, name: 'Medium', price: 2, enabled: true },
      { id: 113, name: 'Large', price: 4, enabled: false }
    ]
  }]
}

const extrasGroup = {
  loading: false,
  error: null,
  loaded: true,
  options: [
    { id: 21, name: 'Extras', min: 0, max: 3, enabled: true, suboptions: [{ id: 211, name: 'Fresh basil', price: 1, enabled: true }] },
    { id: 22, name: 'Dip', min: 0, max: 1, enabled: true, suboptions: [] },
    { id: 23, name: 'Crust', min: 1, max: 1, enabled: false, suboptions: [{ id: 231, name: 'Thin', price: 0, enabled: true }] }
  ]
}

const buildProps = (overrides: any = {}): any => ({
  navigation: { navigate: jest.fn(), goBack: jest.fn() },
  businessId: 5,
  productName: 'Margherita pizza',
  productState: { product: { id: 7, name: 'Margherita pizza', enabled: true, snooze_until: null }, extras, productExtraIds: [1, 2], loading: false, error: null },
  extraOptionsState: { 1: sizeGroup, 2: extrasGroup },
  updatingState: { extras: [], options: [], suboptions: [], products: [] },
  filteredExtras: extras,
  extraSearch: '',
  handleChangeExtraSearch: jest.fn(),
  handleLoadExtraOptions: jest.fn(),
  handleChangeProductExtra: jest.fn(),
  handleUpdateProduct: jest.fn(async (changes: any) => changes),
  handleUpdateOption: jest.fn(),
  handleUpdateSuboption: jest.fn(),
  handleReload: jest.fn(),
  ...overrides
})

const renderOptions = (overrides: any = {}, options: any = {}) => {
  const props = buildProps(overrides)
  return { props, ...renderWithProviders(<StoreProductOptions {...props} />, options) }
}

describe('StoreProductOptions', () => {
  beforeEach(() => { jest.useFakeTimers({ now: NOW }) })
  afterEach(() => { jest.useRealTimers() })

  it('draws the product name, "Options and extras" and a section per option with its rule', () => {
    const { getByText } = renderOptions()
    expect(getByText('Margherita pizza')).toBeTruthy()
    expect(getByText('Options and extras')).toBeTruthy()
    expect(getByText('Size · Choose 1')).toBeTruthy()
    expect(getByText('Extras · Up to 3')).toBeTruthy()
    expect(getByText('Dip · Up to 1')).toBeTruthy()
  })

  it('asks for the options of every group the product uses', () => {
    const { props } = renderOptions({ extraOptionsState: {} })
    expect(props.handleLoadExtraOptions).toHaveBeenCalledWith(1)
    expect(props.handleLoadExtraOptions).toHaveBeenCalledWith(2)
    expect(props.handleLoadExtraOptions).not.toHaveBeenCalledWith(3)
  })

  describe('rows', () => {
    it('a suboption: name, price and a switch; an unavailable one is muted with its red line', () => {
      const { getByTestId, getByText } = renderOptions()
      expect(getByText('Small')).toBeTruthy()
      expect(within(getByTestId('suboption-switch-111-row')).getByText('+$0.00')).toBeTruthy()
      expect(getByText('+$2.00')).toBeTruthy()
      expect(getByTestId('suboption-switch-111').props.accessibilityState.checked).toBe(true)
      expect(getByTestId('suboption-switch-113').props.accessibilityState.checked).toBe(false)
      expect(within(getByTestId('suboption-switch-113-row')).getByText('Unavailable')).toBeTruthy()
    })

    it('hides the price with its key', () => {
      const theme = themeWithValues((values) => { values.visibility['product.options.price'] = false })
      const { queryByText } = renderOptions({}, { themeOverrides: theme })
      expect(queryByText('+$2.00')).toBeNull()
    })

    it('a suboption switch updates that suboption', () => {
      const { getByTestId, props } = renderOptions()
      fireEvent(getByTestId('suboption-switch-112'), 'press')
      expect(props.handleUpdateSuboption).toHaveBeenCalledWith(1, 11, 112, false)
      fireEvent(getByTestId('suboption-switch-113'), 'press')
      expect(props.handleUpdateSuboption).toHaveBeenCalledWith(1, 11, 113, true)
    })

    it('locks the switch of the suboption that is being saved', () => {
      const { getByTestId } = renderOptions({ updatingState: { extras: [], options: [], suboptions: [112], products: [] } })
      expect(getByTestId('suboption-switch-112').props.accessibilityState.disabled).toBe(true)
      expect(getByTestId('suboption-switch-111').props.accessibilityState.disabled).toBe(false)
    })

    it('an option with no suboptions is one row with its own switch', () => {
      const { getByTestId, props } = renderOptions()
      fireEvent(getByTestId('option-switch-22'), 'press')
      expect(props.handleUpdateOption).toHaveBeenCalledWith(2, 22, false)
    })

    it('a disabled option says so in its header and locks its rows', () => {
      const { getByTestId, getByText } = renderOptions()
      expect(getByText('Disabled')).toBeTruthy()
      expect(getByTestId('suboption-switch-231').props.accessibilityState.disabled).toBe(true)
    })
  })

  describe('the product\'s own availability', () => {
    it('is a switch that turns it off, or on clearing its pause', () => {
      const first = renderOptions()
      fireEvent(first.getByTestId('product-available-switch'), 'press')
      expect(first.props.handleUpdateProduct).toHaveBeenCalledWith({ enabled: false })
      first.unmount()
      const second = renderOptions({ productState: { product: { id: 7, name: 'Margherita pizza', enabled: false }, extras, productExtraIds: [1], loading: false, error: null } })
      fireEvent(second.getByTestId('product-available-switch'), 'press')
      expect(second.props.handleUpdateProduct).toHaveBeenCalledWith({ enabled: true, snooze_until: '' })
    })

    it('says "Shown in the menu" when available and why when not', () => {
      const first = renderOptions()
      expect(first.getByText('Shown in the menu')).toBeTruthy()
      first.unmount()
      const paused = renderOptions({ productState: { product: { id: 7, name: 'Margherita pizza', enabled: true, snooze_until: '2026-11-20 16:00:00' }, extras, productExtraIds: [1], loading: false, error: null } })
      expect(paused.getByTestId('product-available-switch').props.accessibilityState.checked).toBe(false)
      expect(paused.getByText('Unavailable · back tomorrow')).toBeTruthy()
    })

    it('the red line opens the duration sheet; a duration pauses the product', async () => {
      const { getByTestId, getByText, props } = renderOptions({ productState: { product: { id: 7, name: 'Margherita pizza', enabled: false }, extras, productExtraIds: [1], loading: false, error: null } })
      fireEvent.press(getByTestId('product-reason'))
      expect(getByText('Unavailable · Margherita pizza')).toBeTruthy()
      fireEvent.press(getByTestId('pause-option-hour_1'))
      await act(async () => { fireEvent.press(getByTestId('pause-confirm')) })
      expect(props.handleUpdateProduct).toHaveBeenCalledWith({ enabled: true, snooze_until: '2026-11-19 19:05:09' })
    })

    it('is not drawn when the controller cannot update the product (an older submodule)', () => {
      const { queryByTestId } = renderOptions({ handleUpdateProduct: undefined })
      expect(queryByTestId('product-availability')).toBeNull()
    })
  })

  describe('option groups', () => {
    it('a row opens the list of groups with a check on those the product uses', () => {
      const { getByTestId, getByText } = renderOptions()
      expect(getByText('2 used by this product')).toBeTruthy()
      fireEvent.press(getByTestId('option-groups-row'))
      expect(getByTestId('option-group-1').props.accessibilityState.checked).toBe(true)
      expect(getByTestId('option-group-3').props.accessibilityState.checked).toBe(false)
      expect(getByText('Sauces')).toBeTruthy()
      // A disabled group says so with the soft state badge (harmony H9), not a muted line of text.
      expect(getByTestId('option-group-3-disabled')).toBeTruthy()
    })

    it('tapping a group attaches or detaches it', () => {
      const { getByTestId, props } = renderOptions()
      fireEvent.press(getByTestId('option-groups-row'))
      fireEvent.press(getByTestId('option-group-3'))
      expect(props.handleChangeProductExtra).toHaveBeenCalledWith(3, true)
      fireEvent.press(getByTestId('option-group-1'))
      expect(props.handleChangeProductExtra).toHaveBeenCalledWith(1, false)
    })

    it('a group that is being saved cannot be tapped again', () => {
      const { getByTestId, props } = renderOptions({ updatingState: { extras: [3], options: [], suboptions: [], products: [] } })
      fireEvent.press(getByTestId('option-groups-row'))
      fireEvent.press(getByTestId('option-group-3'))
      expect(props.handleChangeProductExtra).not.toHaveBeenCalled()
    })

    it('searches the groups by name', () => {
      const { getByTestId, props } = renderOptions()
      fireEvent.press(getByTestId('option-groups-row'))
      fireEvent.changeText(getByTestId('option-groups-search'), 'sau')
      expect(props.handleChangeExtraSearch).toHaveBeenCalledWith('sau')
    })

    it('says so when the search leaves none', () => {
      const { getByTestId } = renderOptions({ filteredExtras: [], extraSearch: 'zzz' })
      fireEvent.press(getByTestId('option-groups-row'))
      expect(getByTestId('option-groups-empty')).toBeTruthy()
    })

    it('a product with no groups says it has no options and still offers the groups', () => {
      const { getByText, getByTestId } = renderOptions({ productState: { product: { id: 7, name: 'Margherita pizza', enabled: true }, extras, productExtraIds: [], loading: false, error: null }, extraOptionsState: {} })
      expect(getByText('This product has no options')).toBeTruthy()
      expect(getByTestId('option-groups-row')).toBeTruthy()
    })
  })

  describe('the shared-group note', () => {
    it('is drawn at the end, and hidden with its section', () => {
      const shown = renderOptions()
      expect(shown.getByText('Turning off an option hides it in every product that uses this group.')).toBeTruthy()
      shown.unmount()
      const theme = themeWithValues((values) => { values.pages.product_options.sections.find((section: any) => section.key === 'shared_notice').visible = false })
      const hidden = renderOptions({}, { themeOverrides: theme })
      expect(hidden.queryByTestId('options-shared-notice')).toBeNull()
    })

    it('is not drawn when there are no options', () => {
      const { queryByTestId } = renderOptions({ productState: { product: { id: 7, name: 'Margherita pizza', enabled: true }, extras, productExtraIds: [], loading: false, error: null } })
      expect(queryByTestId('options-shared-notice')).toBeNull()
    })
  })

  describe('states', () => {
    it('a skeleton while the product loads', () => {
      const { getByTestId } = renderOptions({ productState: { product: null, extras: [], productExtraIds: [], loading: true, error: null } })
      expect(getByTestId('options-skeleton')).toBeTruthy()
    })

    it('a group still loading is a skeleton in its place', () => {
      const { getByTestId } = renderOptions({ extraOptionsState: { 1: { loading: true, options: [] }, 2: extrasGroup } })
      expect(getByTestId('options-loading-1')).toBeTruthy()
    })

    it('a group that failed says so with Retry for that group', () => {
      const { getByTestId, getByText, props } = renderOptions({ extraOptionsState: { 1: { loading: false, error: ['Boom'], options: [] }, 2: extrasGroup } })
      expect(getByText('Size: Boom')).toBeTruthy()
      fireEvent.press(getByTestId('options-retry-1'))
      expect(props.handleLoadExtraOptions).toHaveBeenCalledWith(1, true)
    })

    it('a product that failed to load says so with Retry', () => {
      const { getByTestId, getByText, props } = renderOptions({ productState: { product: null, extras: [], productExtraIds: [], loading: false, error: ['Not found'] } })
      expect(getByText('We couldn\'t load the product options')).toBeTruthy()
      fireEvent.press(getByTestId('options-retry'))
      expect(props.handleReload).toHaveBeenCalled()
    })
  })

  it('the back arrow goes back', () => {
    const { getByTestId, props } = renderOptions()
    fireEvent.press(within(getByTestId('options-header')).getByRole('button', { name: /go back/i }))
    expect(props.navigation.goBack).toHaveBeenCalled()
  })

  it('as a sheet it has no header of its own', () => {
    const { queryByTestId, getByText } = renderOptions({ variant: 'sheet' }, { platform: 'tablet' })
    expect(queryByTestId('options-header')).toBeNull()
    expect(getByText('Size · Choose 1')).toBeTruthy()
  })
})
