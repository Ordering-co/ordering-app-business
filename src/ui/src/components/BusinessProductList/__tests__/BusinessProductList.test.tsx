import React from 'react'
import { Alert, StyleSheet } from 'react-native'
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from 'styled-components/native'

// What the screen is told by the two controllers; each test sets what it needs.
const mockList: { current: any } = { current: {} }
const mockSearch: { current: any } = { current: {} }

jest.mock('@components', () => {
  const React = require('react')
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    __esModule: true,
    ...mockOrdering,
    useUtils: jest.fn(() => [{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY', parsePrice: (value: number) => '$' + Number(value).toFixed(2) }, {}]),
    StoreProductList: (props: any) => React.createElement(props.UIComponent, { ...props, ...mockList.current }),
    StoreProductSearch: (props: any) => React.createElement(props.UIComponent, { ...props, ...mockSearch.current })
  }
})

import * as components from '@components'
import { useToast } from '@components'
import { BusinessProductList } from '..'
import * as OSwitchModule from '../../shared/OSwitch'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const theme: any = defaultAppTheme()
const NY = 'America/New_York'
const NOW = new Date('2026-11-19T18:05:09Z') // 13:05 in New York
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 11, minute: 0 }, close: { hour: 22, minute: 0 } }] }))

const categories = [
  { id: 10, name: 'Pizzas', enabled: true, subcategories: [{ id: 11, name: 'Classic', enabled: true, subcategories: [] }, { id: 12, name: 'Gourmet', enabled: true, subcategories: [] }] },
  { id: 20, name: 'Sides', enabled: true, subcategories: [] },
  { id: 30, name: 'Drinks', enabled: false, subcategories: [] }
]

const product = (id: number, category_id: number, overrides: any = {}) => ({ id, name: `Product ${id}`, price: 10 + id, category_id, enabled: true, snooze_until: null, images: '', category: { id: category_id, name: categories.find((c) => c.id === category_id)?.name ?? 'Classic' }, ...overrides })

const products = [
  product(1, 10),
  product(2, 11),
  product(3, 11, { enabled: false }),
  product(4, 20, { snooze_until: '2026-11-20 16:00:00' }),
  product(5, 20, { snooze_until: '2026-11-19 18:45:09' }),
  product(6, 30)
]

const listProps = (overrides: any = {}) => ({
  businessState: { business: { id: 5, name: 'Luna Pizza', categories, timezone: NY, schedule }, loading: false, error: null },
  categories,
  categoriesState: { loading: false, categories },
  productsList: { products: [], loading: false, error: null, pagination: { currentPage: 1, totalPages: 1 } },
  productSearch: null,
  handleChangeCategory: jest.fn(),
  handleChangeProductSearch: jest.fn(),
  updateStoreCategory: jest.fn(),
  updateStoreProduct: jest.fn(),
  getCategoryProducts: jest.fn(),
  ...overrides
})

const searchProps = (overrides: any = {}) => ({
  productsState: { products, loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, pageSize: 50, totalItems: 6, totalPages: 1 } },
  search: '',
  handleChangeSearch: jest.fn(),
  unavailableOnly: false,
  handleChangeUnavailableOnly: jest.fn(),
  unavailableState: { total: 3, loading: false, error: null },
  loadMoreProducts: jest.fn(),
  reloadProducts: jest.fn(),
  updatingProductIds: [],
  handleUpdateProduct: jest.fn(async (item: any, changes: any) => ({ ...item, ...changes })),
  handleMakeAllAvailable: jest.fn(async () => ({ total: 3, done: 3, failed: 0 })),
  makeAvailableState: { loading: false, total: 0, done: 0, failed: 0, error: null },
  actionError: null,
  clearActionError: jest.fn(),
  ...overrides
})

const navigation = () => ({ navigate: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) })
const showToast = () => (useToast as jest.Mock)()[1].showToast as jest.Mock
const SEARCH_EXPORT = (components as any).StoreProductSearch

const renderMenu = (props: any = {}, options: any = {}) => renderWithProviders(<BusinessProductList slug='luna-pizza' navigation={navigation()} {...props} />, options)

describe('BusinessProductList (the menu)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
    mockList.current = listProps()
    mockSearch.current = searchProps()
    ;(components as any).StoreProductSearch = SEARCH_EXPORT
  })
  afterEach(() => { jest.useRealTimers() })

  describe('with the cross-category search (StoreProductSearch)', () => {
    it('draws the header with the store name, the notice and the chips with their counts', () => {
      const { getByText, getByTestId } = renderMenu()
      expect(getByText('Menu')).toBeTruthy()
      expect(getByText('Luna Pizza')).toBeTruthy()
      expect(getByText('3 products are unavailable')).toBeTruthy()
      expect(getByTestId('menu-chip-all').props.accessibilityState.selected).toBe(true)
      expect(getByText('All')).toBeTruthy()
      expect(getByText('Pizzas 3')).toBeTruthy()
      expect(getByText('Sides 2')).toBeTruthy()
      expect(getByText('Drinks 1')).toBeTruthy()
    })

    it('does not count while the menu is still being loaded, nor with the count key off', () => {
      mockSearch.current = searchProps({ productsState: { products, loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, pageSize: 50, totalItems: 120, totalPages: 3 } } })
      const loading = renderMenu()
      expect(within(loading.getByTestId('menu-chip-10')).getByText('Pizzas')).toBeTruthy()
      // ...and it asks for the next page itself, so the counts come.
      expect(mockSearch.current.loadMoreProducts).toHaveBeenCalled()
      loading.unmount()
      mockSearch.current = searchProps()
      const off = themeWithValues((values) => { values.visibility['products.category_count'] = false })
      const second = renderMenu({}, { themeOverrides: off })
      expect(within(second.getByTestId('menu-chip-10')).getByText('Pizzas')).toBeTruthy()
    })

    it('"All" groups the products by category with each count', () => {
      const { getByText, getAllByText } = renderMenu()
      expect(getAllByText('1 product').length).toBe(2)
      expect(getAllByText('2 products').length).toBe(2)
      expect(getByText('Classic')).toBeTruthy()
      expect(getByText('Product 1')).toBeTruthy()
      expect(getByText('Product 6')).toBeTruthy()
    })

    it('a category chip shows only its products, with its name, count and switch', () => {
      const { getByTestId, queryByText, getByText } = renderMenu()
      fireEvent.press(getByTestId('menu-chip-20'))
      expect(getByTestId('menu-category-header')).toBeTruthy()
      expect(getByText('Category on')).toBeTruthy()
      expect(getByText('Product 4')).toBeTruthy()
      expect(queryByText('Product 1')).toBeNull()
    })

    it('a category with children shows them as a second row of chips', () => {
      const { getByTestId, queryByTestId, queryByText } = renderMenu()
      expect(queryByTestId('menu-chip-11')).toBeNull()
      fireEvent.press(getByTestId('menu-chip-10'))
      expect(getByTestId('menu-chip-11')).toBeTruthy()
      expect(getByTestId('menu-chip-12')).toBeTruthy()
      fireEvent.press(getByTestId('menu-chip-11'))
      expect(queryByText('Product 1')).toBeNull()
      expect(queryByText('Product 2')).toBeTruthy()
      // Pressing the child again goes back to the parent.
      fireEvent.press(getByTestId('menu-chip-11'))
      expect(queryByText('Product 1')).toBeTruthy()
    })

    it('the category switch turns it off or on', () => {
      const { getByTestId } = renderMenu()
      fireEvent.press(getByTestId('menu-chip-20'))
      fireEvent(getByTestId('menu-category-switch'), 'press')
      expect(mockList.current.updateStoreCategory).toHaveBeenCalledWith(20, { enabled: false })
      fireEvent.press(getByTestId('menu-chip-30'))
      expect(getByTestId('menu-category-header')).toBeTruthy()
      fireEvent(getByTestId('menu-category-switch'), 'press')
      expect(mockList.current.updateStoreCategory).toHaveBeenCalledWith(30, { enabled: true })
    })

    it('a row: name, price, and the switch', () => {
      const { getByTestId, getByText } = renderMenu()
      expect(getByText('$11.00')).toBeTruthy()
      expect(getByTestId('menu-switch-1').props.accessibilityState.checked).toBe(true)
      expect(getByTestId('menu-switch-1').props.accessibilityLabel).toBe('Product 1 available')
    })

    it('a product that is off, or paused, has its switch off and the red line with when it is back', () => {
      const { getByTestId } = renderMenu()
      expect(getByTestId('menu-switch-3').props.accessibilityState.checked).toBe(false)
      expect(within(getByTestId('menu-reason-3')).getByText('Unavailable · until you turn it on')).toBeTruthy()
      expect(within(getByTestId('menu-reason-4')).getByText('Unavailable · back tomorrow')).toBeTruthy()
      expect(within(getByTestId('menu-reason-5')).getByText('Unavailable · back in 40 minutes')).toBeTruthy()
      expect(getByTestId('menu-switch-4').props.accessibilityState.checked).toBe(false)
    })

    it('hides the price and the reason with their keys', () => {
      const theme = themeWithValues((values) => {
        values.visibility['products.price'] = false
        values.visibility['products.unavailable_reason'] = false
      })
      const { queryByText, queryByTestId } = renderMenu({}, { themeOverrides: theme })
      expect(queryByText('$11.00')).toBeNull()
      expect(queryByTestId('menu-reason-3')).toBeNull()
    })

    it('shows the product photo when it has one and the key allows, a glyph tile otherwise', () => {
      mockSearch.current = searchProps({ productsState: { products: [product(1, 10, { images: 'https://example.com/a.jpg' }), product(2, 11)], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } } })
      const { getByTestId, UNSAFE_getAllByType } = renderMenu()
      const { Image } = require('react-native')
      expect(UNSAFE_getAllByType(Image)).toHaveLength(1)
      expect(getByTestId('menu-row-2')).toBeTruthy()
    })

    describe('switching a product', () => {
      it('off sends enabled false with no date, and says so', async () => {
        const { getByTestId } = renderMenu()
        await act(async () => { fireEvent(getByTestId('menu-switch-1'), 'press') })
        expect(mockSearch.current.handleUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { enabled: false })
        expect(showToast()).toHaveBeenCalledWith('success', 'Disabled product')
      })

      it('on sends enabled true and clears its pause', async () => {
        const { getByTestId } = renderMenu()
        await act(async () => { fireEvent(getByTestId('menu-switch-4'), 'press') })
        expect(mockSearch.current.handleUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }), { enabled: true, snooze_until: '' })
        expect(showToast()).toHaveBeenCalledWith('success', 'Enabled product')
      })

      it('shows the reason of a failed save as an error toast', () => {
        mockSearch.current = searchProps({ actionError: ['Not allowed'] })
        renderMenu()
        expect(showToast()).toHaveBeenCalledWith('error', 'Not allowed')
        expect(mockSearch.current.clearActionError).toHaveBeenCalled()
      })

      it('the switch is locked while that product saves', () => {
        mockSearch.current = searchProps({ updatingProductIds: [1] })
        const { getByTestId } = renderMenu()
        expect(getByTestId('menu-switch-1').props.accessibilityState.disabled).toBe(true)
        expect(getByTestId('menu-switch-2').props.accessibilityState.disabled).toBe(false)
      })
    })

    describe('how long a product is unavailable', () => {
      it('tapping the red line opens the duration sheet; a duration pauses it with a date in UTC', async () => {
        const { getByTestId, getByText } = renderMenu()
        fireEvent.press(getByTestId('menu-reason-3'))
        expect(getByText('Unavailable · Product 3')).toBeTruthy()
        fireEvent.press(getByTestId('pause-option-hours_2'))
        await act(async () => { fireEvent.press(getByTestId('pause-confirm')) })
        expect(mockSearch.current.handleUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), { enabled: true, snooze_until: '2026-11-19 20:05:09' })
        expect(showToast()).toHaveBeenCalledWith('success', 'Product unavailable until 3:05 PM')
      })

      it('"Until I turn it back on" keeps it off with no date', async () => {
        const { getByTestId } = renderMenu()
        fireEvent.press(getByTestId('menu-reason-4'))
        fireEvent.press(getByTestId('pause-option-until_resumed'))
        await act(async () => { fireEvent.press(getByTestId('pause-confirm')) })
        expect(mockSearch.current.handleUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }), { enabled: false, snooze_until: '' })
        expect(showToast()).toHaveBeenCalledWith('success', 'Disabled product')
      })
    })

    describe('the unavailable notice and the search', () => {
      it('"View" opens the search on the unavailable filter', () => {
        const { getByTestId } = renderMenu()
        fireEvent.press(getByTestId('menu-notice-view'))
        expect(mockSearch.current.handleChangeUnavailableOnly).toHaveBeenCalledWith(true)
        expect(getByTestId('menu-search-input')).toBeTruthy()
      })

      it('"View" does not focus the search field (the keyboard would cover "Make all available"); the search button does', () => {
        const view = renderMenu()
        fireEvent.press(view.getByTestId('menu-notice-view'))
        expect(view.getByTestId('menu-search-input').props.autoFocus).toBeFalsy()
        view.unmount()
        const search = renderMenu()
        fireEvent.press(search.getByTestId('menu-search-button'))
        expect(search.getByTestId('menu-search-input').props.autoFocus).toBe(true)
      })

      it('"View" does not show the whole menu while the filtered list is on its way: the rows load until the request starts', () => {
        const { getByTestId, queryByTestId, queryByText } = renderMenu()
        fireEvent.press(getByTestId('menu-notice-view'))
        // The controller asks for the filtered list after its search delay: until then the list it holds is the other filter's.
        expect(getByTestId('menu-loading')).toBeTruthy()
        expect(queryByText('Margherita')).toBeNull()
        act(() => { jest.advanceTimersByTime(2000) })
        expect(queryByTestId('menu-loading')).toBeNull()
      })

      it('says "1 product is unavailable", and nothing at zero or with the section hidden', () => {
        mockSearch.current = searchProps({ unavailableState: { total: 1 } })
        const one = renderMenu()
        expect(one.getByText('1 product is unavailable')).toBeTruthy()
        one.unmount()
        mockSearch.current = searchProps({ unavailableState: { total: 0 } })
        const zero = renderMenu()
        expect(zero.queryByTestId('menu-notice')).toBeNull()
        zero.unmount()
        mockSearch.current = searchProps()
        const hidden = renderMenu({}, { themeOverrides: themeWithValues((values) => { values.pages.menu.sections.find((section: any) => section.key === 'notice').visible = false }) })
        expect(hidden.queryByTestId('menu-notice')).toBeNull()
      })

      it('a category chip shows the category\'s row with its switch, a parent with subcategories too (ANDROID-B13)', () => {
        const { getByTestId, getByText } = renderMenu()
        // "All" has no category row; "Pizzas" has subcategories and has one.
        expect(() => getByTestId('menu-category-header')).toThrow()
        fireEvent.press(getByTestId('menu-chip-10'))
        expect(getByTestId('menu-category-header')).toBeTruthy()
        expect(getByText('Category on')).toBeTruthy()
        fireEvent(getByTestId('menu-category-switch'), 'press')
        expect(mockList.current.updateStoreCategory).toHaveBeenCalledWith(10, { enabled: false })
      })

      it('the search button opens a field over the whole menu with the All / Unavailable N filters', () => {
        const { getByTestId, getByText, getByPlaceholderText, queryByText, queryByTestId } = renderMenu()
        fireEvent.press(getByTestId('menu-search-button'))
        // One search form: the box carries its placeholder, no label over it (H3).
        expect(getByPlaceholderText('Search all products')).toBeTruthy()
        expect(queryByText('Search all products')).toBeNull()
        expect(getByText('Unavailable 3')).toBeTruthy()
        expect(queryByTestId('menu-categories')).toBeNull()
        expect(queryByTestId('menu-notice')).toBeNull()
        fireEvent.changeText(getByTestId('menu-search-input'), 'piz')
        expect(mockSearch.current.handleChangeSearch).toHaveBeenCalledWith('piz')
        // A filter chip lowers the search field's keyboard: it never stays over the list that the chip asked for.
        const dismiss = jest.spyOn(require('react-native').Keyboard, 'dismiss')
        fireEvent.press(getByTestId('menu-filter-unavailable'))
        expect(mockSearch.current.handleChangeUnavailableOnly).toHaveBeenCalledWith(true)
        expect(dismiss).toHaveBeenCalledTimes(1)
        fireEvent.press(getByTestId('menu-filter-all'))
        expect(mockSearch.current.handleChangeUnavailableOnly).toHaveBeenCalledWith(false)
        expect(dismiss).toHaveBeenCalledTimes(2)
        dismiss.mockRestore()
      })

      it('the back arrow closes the search first, clearing it, then leaves the screen', () => {
        const nav = navigation()
        const { getByTestId, queryByTestId } = renderMenu({ navigation: nav })
        fireEvent.press(getByTestId('menu-search-button'))
        fireEvent.press(within(getByTestId('menu-header')).getByRole('button', { name: /back|go back/i }))
        expect(queryByTestId('menu-search-input')).toBeNull()
        expect(mockSearch.current.handleChangeSearch).toHaveBeenCalledWith('')
        expect(mockSearch.current.handleChangeUnavailableOnly).toHaveBeenCalledWith(false)
        expect(nav.goBack).not.toHaveBeenCalled()
        fireEvent.press(within(getByTestId('menu-header')).getByRole('button', { name: /back|go back/i }))
        expect(nav.goBack).toHaveBeenCalled()
      })

      it('the system back (beforeRemove) closes the search instead of leaving', () => {
        const nav = navigation()
        const { getByTestId, queryByTestId } = renderMenu({ navigation: nav })
        const listener = (nav.addListener.mock.calls.find((call: any[]) => call[0] === 'beforeRemove') as any)[1]
        const leaving = { preventDefault: jest.fn() }
        listener(leaving)
        expect(leaving.preventDefault).not.toHaveBeenCalled()
        fireEvent.press(getByTestId('menu-search-button'))
        const second = { preventDefault: jest.fn() }
        act(() => { listener(second) })
        expect(second.preventDefault).toHaveBeenCalled()
        expect(queryByTestId('menu-search-input')).toBeNull()
      })

      it('hides the search button with its key', () => {
        const theme = themeWithValues((values) => { values.visibility['products.search'] = false })
        const { queryByTestId } = renderMenu({}, { themeOverrides: theme })
        expect(queryByTestId('menu-search-button')).toBeNull()
      })
    })

    describe('the unavailable view and "Make all available"', () => {
      const open = () => {
        mockSearch.current = searchProps({
          unavailableOnly: true,
          productsState: { products: [products[2], products[3], products[4]], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } }
        })
        const screen = renderMenu()
        fireEvent.press(screen.getByTestId('menu-notice-view'))
        return screen
      }

      it('lists the unavailable products with their category and when they are back', () => {
        const { getByTestId } = open()
        expect(within(getByTestId('menu-row-3')).getByText('Classic · until you turn it on')).toBeTruthy()
        expect(within(getByTestId('menu-row-4')).getByText('Sides · back tomorrow')).toBeTruthy()
        expect(within(getByTestId('menu-row-5')).getByText('Sides · back in 40 minutes')).toBeTruthy()
      })

      it('the button asks first, then makes them all available', async () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const { getByTestId } = open()
        fireEvent.press(getByTestId('menu-make-all'))
        expect(alert).toHaveBeenCalled()
        expect((alert.mock.calls[0][2] as any)[0].text).toBe('Make all available')
                expect(mockSearch.current.handleMakeAllAvailable).not.toHaveBeenCalled()
        await act(async () => { (alert.mock.calls[0][2] as any)[0].onPress() })
        expect(mockSearch.current.handleMakeAllAvailable).toHaveBeenCalled()
        expect(showToast()).toHaveBeenCalledWith('success', 'Products made available')
      })

      it('says how many it could do when some failed', async () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        mockSearch.current = searchProps({
          unavailableOnly: true,
          handleMakeAllAvailable: jest.fn(async () => ({ total: 3, done: 2, failed: 1 })),
          productsState: { products: [products[2]], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } }
        })
        const { getByTestId } = renderMenu()
        fireEvent.press(getByTestId('menu-notice-view'))
        fireEvent.press(getByTestId('menu-make-all'))
        await act(async () => { (alert.mock.calls[0][2] as any)[0].onPress() })
        expect(showToast()).toHaveBeenCalledWith('error', '2 of 3 products made available')
      })

      // H17: the bar is the app's own (a line, the bar padding, the 1:1 button, the toast's height reported), not a copy.
      it('is the app\'s pinned bar, with the main (solid) button of its theme', () => {
        mockSearch.current = searchProps({
          unavailableOnly: true,
          productsState: { products: [products[2]], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } }
        })
        const { getByTestId } = renderMenu()
        fireEvent.press(getByTestId('menu-notice-view'))
        const bar = theme.native.components.bottom_bar.base
        const style = StyleSheet.flatten(getByTestId('menu-bar').props.style)
        expect(style.paddingTop).toBe(bar.padding)
        expect(style.borderTopWidth).toBe(bar.border_top.borderWidth)
        expect(getByTestId('menu-make-all-cell')).toBeTruthy()
      })

      it('is not there outside the unavailable view, with the key off, or with nothing to make available', () => {
        const browse = renderMenu()
        expect(browse.queryByTestId('menu-make-all')).toBeNull()
        browse.unmount()
        const theme = themeWithValues((values) => { values.visibility['products.make_all_available'] = false })
        mockSearch.current = searchProps({ unavailableOnly: true })
        const off = renderMenu({}, { themeOverrides: theme })
        fireEvent.press(off.getByTestId('menu-notice-view'))
        expect(off.queryByTestId('menu-make-all')).toBeNull()
        off.unmount()
        mockSearch.current = searchProps({ unavailableOnly: true, productsState: { products: [], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } } })
        const empty = renderMenu()
        fireEvent.press(empty.getByTestId('menu-notice-view'))
        expect(empty.queryByTestId('menu-make-all')).toBeNull()
      })

      // IOS-C12: "Unavailable 0" said "Sorry, no results found", as a search that failed; the search field capitalized.
      it('says all products are available (not "no results") in the unavailable view with nothing in it, and does not capitalize the search', () => {
        mockSearch.current = searchProps({ unavailableOnly: true, productsState: { products: [], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } } })
        const { getByTestId, getByText, queryByText } = renderMenu()
        fireEvent.press(getByTestId('menu-notice-view'))
        expect(getByText('All products are available')).toBeTruthy()
        expect(queryByText('Sorry, no results found')).toBeNull()
        expect(getByTestId('menu-search-input').props.autoCapitalize).toBe('none')
      })
    })

    describe('opening a product', () => {
      it('goes to ProductOptions with the ids and the name', () => {
        const nav = navigation()
        const { getByTestId } = renderMenu({ navigation: nav })
        fireEvent.press(getByTestId('menu-open-2'))
        expect(nav.navigate).toHaveBeenCalledWith('ProductOptions', { businessId: 5, categoryId: 11, productId: 2, productName: 'Product 2' })
      })

      it('on a tablet pane it hands the product to the pane (a sheet) and has no back arrow', () => {
        const nav = navigation()
        const onOpenProduct = jest.fn()
        const { getByTestId, queryByRole } = renderMenu({ navigation: nav, embedded: true, onOpenProduct })
        fireEvent.press(getByTestId('menu-open-2'))
        expect(onOpenProduct).toHaveBeenCalledWith({ businessId: 5, categoryId: 11, productId: 2, productName: 'Product 2' })
        expect(nav.navigate).not.toHaveBeenCalled()
        expect(queryByRole('button', { name: /go back/i })).toBeNull()
      })
    })

    describe('states', () => {
      it('skeleton rows while it loads', () => {
        mockSearch.current = searchProps({ productsState: { products: [], loading: true, loadingMore: false, error: null, pagination: { currentPage: 0, totalPages: null } } })
        const { getAllByTestId } = renderMenu()
        expect(getAllByTestId('menu-skeleton')).toHaveLength(6)
      })

      it('skeleton while the business itself loads, and the name from the route meanwhile', () => {
        mockList.current = listProps({ businessState: { business: {}, loading: true, error: null }, categories: [] })
        const { getAllByTestId, getByText } = renderMenu({ fallbackName: 'Luna Pizza' })
        expect(getAllByTestId('menu-skeleton').length).toBeGreaterThan(0)
        expect(getByText('Luna Pizza')).toBeTruthy()
      })

      it('says there are no products', () => {
        mockSearch.current = searchProps({ productsState: { products: [], loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 1 } } })
        const { getByText } = renderMenu()
        expect(getByText('Sorry, no results found')).toBeTruthy()
      })

      it('shows a failed load with Retry', () => {
        mockSearch.current = searchProps({ productsState: { products: [], loading: false, loadingMore: false, error: ['Boom'], pagination: { currentPage: 0, totalPages: null } } })
        const { getByText, getByTestId } = renderMenu()
        expect(getByText('Boom')).toBeTruthy()
        fireEvent.press(getByTestId('menu-retry'))
        expect(mockSearch.current.reloadProducts).toHaveBeenCalled()
      })

      it('in search, the end of the list asks for the next page', () => {
        mockSearch.current = searchProps({ productsState: { products, loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, totalPages: 2 } } })
        const { getByTestId, UNSAFE_getByType } = renderMenu()
        mockSearch.current.loadMoreProducts.mockClear()
        fireEvent.press(getByTestId('menu-search-button'))
        const { FlatList } = require('react-native')
        fireEvent(UNSAFE_getByType(FlatList), 'endReached')
        expect(mockSearch.current.loadMoreProducts).toHaveBeenCalled()
      })
    })

    it('hides the categories section with its theme section', () => {
      const theme = themeWithValues((values) => { values.pages.menu.sections.find((section: any) => section.key === 'categories').visible = false })
      const { queryByTestId } = renderMenu({}, { themeOverrides: theme })
      expect(queryByTestId('menu-categories')).toBeNull()
    })
  })

  describe('without StoreProductSearch (an older submodule)', () => {
    beforeEach(() => {
      ;(components as any).StoreProductSearch = undefined
      mockList.current = listProps({
        productsList: { products: [product(1, 10), product(3, 10, { enabled: false })], loading: false, error: null, pagination: { currentPage: 1, totalPages: 2 } }
      })
    })

    it('has no All chip, no counts, no notice and picks the first category', async () => {
      const { queryByTestId, getByTestId, queryByText } = renderMenu()
      expect(queryByTestId('menu-chip-all')).toBeNull()
      expect(queryByTestId('menu-notice')).toBeNull()
      expect(within(getByTestId('menu-chip-10')).getByText('Pizzas')).toBeTruthy()
      expect(queryByText('Pizzas 3')).toBeNull()
      await waitFor(() => expect(mockList.current.handleChangeCategory).toHaveBeenCalledWith(categories[0]))
    })

    it('the products are the chosen category\'s; choosing another category asks for it', () => {
      const { getByTestId, getByText } = renderMenu()
      expect(getByText('Product 1')).toBeTruthy()
      fireEvent.press(getByTestId('menu-chip-20'))
      expect(mockList.current.handleChangeCategory).toHaveBeenCalledWith(categories[1])
    })

    it('a child chip asks for the child, and pressing it again for the parent', () => {
      const { getByTestId } = renderMenu()
      fireEvent.press(getByTestId('menu-chip-10'))
      mockList.current.handleChangeCategory.mockClear()
      fireEvent.press(getByTestId('menu-chip-11'))
      expect(mockList.current.handleChangeCategory).toHaveBeenLastCalledWith(categories[0].subcategories[0])
      fireEvent.press(getByTestId('menu-chip-11'))
      expect(mockList.current.handleChangeCategory).toHaveBeenLastCalledWith(categories[0])
    })

    it('the search stays inside the category: only a field, searched after the typing stops; no filters', () => {
      const { getByTestId, getByText, getByPlaceholderText, queryByTestId } = renderMenu()
      fireEvent.press(getByTestId('menu-search-button'))
      expect(getByPlaceholderText('Search products')).toBeTruthy()
      expect(queryByTestId('menu-filters')).toBeNull()
      expect(queryByTestId('menu-categories')).toBeTruthy()
      fireEvent.changeText(getByTestId('menu-search-input'), 'mar')
      expect(mockList.current.handleChangeProductSearch).not.toHaveBeenCalled()
      act(() => { jest.advanceTimersByTime(400) })
      expect(mockList.current.handleChangeProductSearch).toHaveBeenCalledWith('mar')
    })

    it('a switch updates through the category controller', () => {
      const { getByTestId } = renderMenu()
      fireEvent(getByTestId('menu-switch-1'), 'press')
      expect(mockList.current.updateStoreProduct).toHaveBeenCalledWith(10, 1, { enabled: false })
      fireEvent(getByTestId('menu-switch-3'), 'press')
      expect(mockList.current.updateStoreProduct).toHaveBeenCalledWith(10, 3, { enabled: true, snooze_until: '' })
    })

    it('the end of the list asks for the next page of the category', () => {
      const { UNSAFE_getByType } = renderMenu()
      const { FlatList } = require('react-native')
      fireEvent(UNSAFE_getByType(FlatList), 'endReached')
      expect(mockList.current.getCategoryProducts).toHaveBeenCalledWith(false)
    })

    it('the search closes with the back arrow and clears the category search', () => {
      mockList.current = listProps({ ...mockList.current, productSearch: 'mar' })
      const { getByTestId, queryByTestId } = renderMenu()
      fireEvent.press(getByTestId('menu-search-button'))
      fireEvent.press(within(getByTestId('menu-header')).getByRole('button', { name: /go back/i }))
      expect(queryByTestId('menu-search-input')).toBeNull()
      expect(mockList.current.handleChangeProductSearch).toHaveBeenCalledWith('')
    })
  })

  it('wraps the category controller with the business fields the menu needs', () => {
    const { getByText } = renderMenu()
    expect(getByText('Luna Pizza')).toBeTruthy()
  })

  // Performance finding 4: the rows are memoized, and used to get new objects and arrow functions on every render, so none
  // ever skipped one. Only a row whose own product changed is drawn again.
  describe('the rows are not drawn again for what is not theirs', () => {
    const switchDraws = (spy: jest.SpyInstance) => spy.mock.calls.map((call: any[]) => call[0].testID)

    it('draws no row again on a minute\'s tick that changes nothing for it', () => {
      const spy = jest.spyOn(OSwitchModule, 'default')
      const { getByTestId } = renderMenu()
      expect(getByTestId('menu-switch-1')).toBeTruthy()
      spy.mockClear()
      act(() => { jest.advanceTimersByTime(60000) })
      // The paused product that is back in 40 minutes counts down ("back in 39 minutes"): the only row that changes.
      const redrawn = switchDraws(spy)
      expect(redrawn).not.toContain('menu-switch-1')
      expect(redrawn).not.toContain('menu-switch-2')
      expect(redrawn).not.toContain('menu-switch-3')
      expect(redrawn).not.toContain('menu-switch-4')
      spy.mockRestore()
    })

    it('draws only the product whose data changed when the list is handed again', () => {
      const spy = jest.spyOn(OSwitchModule, 'default')
      // One theme object for both renders (a new theme redraws every row, as it should).
      const fixed: any = defaultAppTheme()
      const nav = navigation()
      const tree = () => <SafeAreaProvider><ThemeProvider theme={fixed}><BusinessProductList slug='luna-pizza' navigation={nav} /></ThemeProvider></SafeAreaProvider>
      const { rerender, getByTestId } = render(tree())
      expect(getByTestId('menu-switch-1')).toBeTruthy()
      spy.mockClear()
      mockSearch.current = searchProps({ productsState: { products: products.map((item) => item.id === 2 ? { ...item, enabled: false } : item), loading: false, loadingMore: false, error: null, pagination: { currentPage: 1, pageSize: 50, totalItems: 6, totalPages: 1 } } })
      rerender(tree())
      const redrawn = switchDraws(spy)
      expect(redrawn).toContain('menu-switch-2')
      expect(redrawn).not.toContain('menu-switch-1')
      expect(redrawn).not.toContain('menu-switch-3')
      spy.mockRestore()
    })

    it('still opens and toggles the right product from the shared functions', async () => {
      const nav = navigation()
      const { getByTestId } = renderMenu({ navigation: nav })
      fireEvent.press(getByTestId('menu-open-2'))
      expect(nav.navigate).toHaveBeenCalledWith('ProductOptions', expect.objectContaining({ productId: 2 }))
      await act(async () => { fireEvent(getByTestId('menu-switch-2'), 'press') })
      expect(mockSearch.current.handleUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), { enabled: false })
    })
  })
})
