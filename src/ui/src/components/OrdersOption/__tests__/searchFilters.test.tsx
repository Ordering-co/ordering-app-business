import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { useConfig, useUtils } from '@components'

jest.mock('@ui', () => ({ useOrderActions: () => ({}), canReviewCustomer: () => false, NotificationSetting: () => null, WebsocketStatus: () => null }))
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    BusinessList: ({ UIComponent, ...props }: any) => <UIComponent {...props} businessesList={{ businesses: mockBusinesses.current, fetched: true }} paginationProps={{ currentPage: 1, totalPages: 1, totalItems: mockBusinesses.current.length }} getBusinesses={jest.fn()} handleChangeSearch={jest.fn()} searchValue='' />,
    DriverList: ({ UIComponent, ...props }: any) => <UIComponent {...props} driverList={{ drivers: [{ id: 4, name: 'Omar', lastname: 'Haddad' }] }} />,
    PaymethodList: ({ UIComponent, ...props }: any) => <UIComponent {...props} paymethodList={{ paymethods: [{ id: 2, name: 'Cash' }] }} />,
    MainSearch: ({ UIComponent, ...props }: any) => <UIComponent {...props} allListValues={{ countries: [{ cities: [{ id: 8, name: 'Austin' }] }] }} />
  }
})
const mockBusinesses: { current: any[] } = { current: [{ id: 1, name: 'Luna Pizza' }, { id: 2, name: 'Luna Sushi' }] }

import { OrdersOptionBusiness } from '../../OrdersOptionBusiness'
import { OrdersOptionDriver } from '../../OrdersOptionDriver'
import { OrdersOptionPaymethod } from '../../OrdersOptionPaymethod'
import { OrdersOptionCity } from '../../OrdersOptionCity'
import { OrdersSearchModal } from '../OrdersSearchForm'
import { EMPTY_SEARCH, type OrdersSearchState } from '../useOrdersSearch'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { resetOrdersView } from '../ordersView'

describe('the select filters of the orders search', () => {
  beforeEach(() => {
    resetOrdersView()
    mockBusinesses.current = [{ id: 1, name: 'Luna Pizza' }, { id: 2, name: 'Luna Sushi' }]
    ;(useUtils as jest.Mock).mockReturnValue([{ parseDate: (v: any) => String(v), dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  const choose = (Filter: any, testID: string, label: string, expected: Record<string, any>, extra: Record<string, any> = {}) => {
    const onSearch = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(<Filter search={{ ...EMPTY_SEARCH, ...extra }} onSearch={onSearch} />)
    fireEvent.press(getByTestId(testID))
    fireEvent.press(getByText(label))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining(expected))
  }

  it('store: a row that opens a sheet and answers the store and its name', () => {
    choose(OrdersOptionBusiness, 'orders-search-business', 'Luna Sushi', { business: '2', businessName: 'Luna Sushi' })
  })

  it('driver: the full name', () => {
    choose(OrdersOptionDriver, 'orders-search-driver', 'Omar Haddad', { driver: 4, driverName: 'Omar Haddad' })
  })

  it('payment method', () => {
    choose(OrdersOptionPaymethod, 'orders-search-paymethod', 'Cash', { paymethod: 2, paymethodName: 'Cash' })
  })

  it('city: the cities of every country', () => {
    choose(OrdersOptionCity, 'orders-search-city', 'Austin', { city: 8, cityName: 'Austin' })
  })

  it('"Any" clears the filter', () => {
    choose(OrdersOptionDriver, 'orders-search-driver', 'Any', { driver: '', driverName: '' }, { driver: 4, driverName: 'Omar Haddad' })
  })

  it('shows the chosen value on the row', () => {
    const { getByText } = renderWithProviders(<OrdersOptionDriver search={{ ...EMPTY_SEARCH, driver: 4 }} onSearch={jest.fn()} />)
    expect(getByText('Omar Haddad')).toBeTruthy()
  })

  it('has no store row for an account with one store', () => {
    mockBusinesses.current = [{ id: 1, name: 'Luna Pizza' }]
    const { queryByTestId } = renderWithProviders(<OrdersOptionBusiness search={EMPTY_SEARCH} onSearch={jest.fn()} />)
    expect(queryByTestId('orders-search-business')).toBeNull()
  })
})

describe('OrdersSearchModal', () => {
  const state = (overrides: Partial<OrdersSearchState> = {}): OrdersSearchState => ({
    search: EMPTY_SEARCH,
    setSearch: jest.fn(),
    open: true,
    setOpen: jest.fn(),
    apply: jest.fn(),
    clear: jest.fn(),
    hasFilters: false,
    storeOnly: false,
    storeName: '',
    summary: [],
    supportsName: true,
    ...overrides
  })

  beforeEach(() => {
    ;(useUtils as jest.Mock).mockReturnValue([{ parseDate: (v: any) => String(v), dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A' }, {}])
  })

  it('says what the field takes: customers only when the logic can search them', () => {
    const withNames = renderWithProviders(<OrdersSearchModal searchState={state()} />)
    expect(withNames.getByPlaceholderText('Order number, customer or phone')).toBeTruthy()
    const without = renderWithProviders(<OrdersSearchModal searchState={state({ supportsName: false })} />)
    expect(without.getByPlaceholderText('Order number or phone')).toBeTruthy()
  })

  it('writes every chip and row into the form and the two buttons clear and send it', () => {
    const search = state()
    const { getByTestId } = renderWithProviders(<OrdersSearchModal searchState={search} showSla />)
    fireEvent.press(getByTestId('orders-search-date-yesterday'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ date: { type: 'yesterday', from: '', to: '' } }))
    fireEvent.press(getByTestId('orders-search-type-3'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ types: [3] }))
    fireEvent.press(getByTestId('orders-search-state-cancelled'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ states: ['cancelled'] }))
    fireEvent.press(getByTestId('orders-search-sla-delayed'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ timeStatus: 'delayed' }))
    fireEvent.press(getByTestId('orders-search-apply'))
    expect(search.apply).toHaveBeenCalled()
    fireEvent.press(getByTestId('orders-search-clear'))
    expect(search.clear).toHaveBeenCalled()
  })

  it('a chosen chip is pressed again to turn it off', () => {
    const search = state({ search: { ...EMPTY_SEARCH, types: [1, 2], date: { type: 'today', from: '', to: '' } } })
    const { getByTestId } = renderWithProviders(<OrdersSearchModal searchState={search} />)
    fireEvent.press(getByTestId('orders-search-type-2'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ types: [1] }))
    fireEvent.press(getByTestId('orders-search-date-today'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ date: { type: '', from: '', to: '' } }))
  })

  it('writes its words in sentence case: "SLA", "At risk", the status "In progress"', () => {
    const { getByText, queryByText } = renderWithProviders(<OrdersSearchModal searchState={state()} showSla />)
    expect(getByText('SLA')).toBeTruthy()
    expect(queryByText('SLA\'s')).toBeNull()
    expect(getByText('At risk')).toBeTruthy()
    expect(getByText('In progress')).toBeTruthy()
  })

  it('has no SLA filter without the enterprise plan', () => {
    const { queryByTestId } = renderWithProviders(<OrdersSearchModal searchState={state()} />)
    expect(queryByTestId('orders-search-sla')).toBeNull()
  })

  it('sends the form with the keyboard\'s search key and empties the text with its button', () => {
    const search = state({ search: { ...EMPTY_SEARCH, text: 'Ana' } })
    const { getByTestId } = renderWithProviders(<OrdersSearchModal searchState={search} />)
    fireEvent(getByTestId('orders-search-text'), 'submitEditing')
    expect(search.apply).toHaveBeenCalled()
    fireEvent.press(getByTestId('orders-search-text-clear'))
    expect(search.setSearch).toHaveBeenLastCalledWith(expect.objectContaining({ text: '' }))
  })

  it('picks a custom range on the calendar and closes it once both days are chosen', () => {
    const search = state()
    const { getByTestId, getByText, queryByTestId } = renderWithProviders(<OrdersSearchModal searchState={search} />)
    expect(queryByTestId('orders-search-calendar')).toBeNull()
    fireEvent.press(getByTestId('orders-search-date-custom'))
    expect(getByTestId('orders-search-calendar')).toBeTruthy()
    // One day is not a range yet: the calendar stays open and nothing is written.
    fireEvent.press(getByText('10'))
    expect(search.setSearch).not.toHaveBeenCalled()
    fireEvent.press(getByText('12'))
    const written = (search.setSearch as jest.Mock).mock.calls.at(-1)[0]
    expect(written.date).toEqual({ type: 'custom', from: expect.stringMatching(/^\d\d\/10\/\d{4}$/), to: expect.stringMatching(/^\d\d\/12\/\d{4}$/) })
    expect(queryByTestId('orders-search-calendar')).toBeNull()
  })

  it('writes a picked range as the custom chip\'s text', () => {
    const search = state({ search: { ...EMPTY_SEARCH, date: { type: 'custom', from: '11/03/2026', to: '11/05/2026' } } })
    const { getByTestId } = renderWithProviders(<OrdersSearchModal searchState={search} />)
    expect(getByTestId('orders-search-date-custom')).toHaveTextContent(/–/)
  })

  it('draws nothing while it is closed', () => {
    const { queryByTestId } = renderWithProviders(<OrdersSearchModal searchState={state({ open: false })} />)
    expect(queryByTestId('orders-search-form')).toBeNull()
  })
})
