import React from 'react'
import { BackHandler, Linking } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { useNetInfo } from '@react-native-community/netinfo'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY' }, {}]),
    BusinessList: renderUiController({}),
    // The single-store controller: the business it was given is its state.
    BusinessController: (props: any) => {
      const { UIComponent, ...rest } = props
      return require('react').createElement(UIComponent, { ...rest, businessState: { business: props.business, loading: false, error: null }, updateBusiness: jest.fn() })
    }
  }
})

import { useToast } from '@components'
import { StoresList, StoresListUI } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const NY = 'America/New_York'
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }] }))

const store = (id: number, overrides: any = {}) => ({
  id,
  name: `Store ${id}`,
  slug: `store-${id}`,
  address: `${id} Main St`,
  zipcode: '',
  enabled: true,
  open: true,
  schedule,
  timezone: NY,
  snooze_until: null,
  ...overrides
})

const base = (overrides: any = {}) => ({
  navigation: { navigate: jest.fn() },
  businessesList: { businesses: [store(1), store(2)], loading: false, error: null },
  paginationProps: { currentPage: 1, totalPages: 1, pageSize: 20 },
  getBusinesses: jest.fn(),
  handleChangeSearch: jest.fn(),
  searchValue: '',
  ...overrides
})

const showToast = () => (useToast as jest.Mock)()[1].showToast as jest.Mock

const hideSection = (key: string) => themeWithValues((values) => {
  values.pages.stores.sections.find((section: any) => section.key === key).visible = false
})

describe('StoresList', () => {
  beforeEach(() => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
  })

  it('draws the title, a card per store and the dashboard link at the foot', () => {
    const { getByText, getByTestId } = renderWithProviders(<StoresListUI {...base()} />)
    expect(getByText('Stores')).toBeTruthy()
    expect(getByTestId('store-card-1')).toBeTruthy()
    expect(getByTestId('store-card-2')).toBeTruthy()
    expect(getByText('More store settings in the dashboard')).toBeTruthy()
  })

  // ANDROID-H2: an empty header cell still got the list's `gap` (15 extra under the bar, 30 in all).
  it('draws no header cell when there is nothing in it (the link is at the foot, online)', () => {
    const { getByTestId } = renderWithProviders(<StoresListUI {...base()} />)
    expect(getByTestId('stores-flatlist').props.ListHeaderComponent).toBeUndefined()
  })

  it('draws the header cell offline, for the notice', () => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    const { getByTestId } = renderWithProviders(<StoresListUI {...base()} />)
    expect(getByTestId('stores-offline')).toBeTruthy()
  })

  it('wraps the list controller with this UI and passes the props on', () => {
    const { getByTestId } = renderWithProviders(<StoresList {...base()} />)
    expect(getByTestId('store-card-1')).toBeTruthy()
  })

  it('opens the dashboard at the address of the translation key when the config has none', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
    const { getByTestId } = renderWithProviders(<StoresListUI {...base()} />)
    fireEvent.press(getByTestId('stores-dashboard-link'))
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://dashboard.orderingplus.com'))
  })

  it('hides the dashboard link as a section', () => {
    const { queryByText } = renderWithProviders(<StoresListUI {...base()} />, { themeOverrides: hideSection('dashboard_link') })
    expect(queryByText('More store settings in the dashboard')).toBeNull()
  })

  describe('states', () => {
    it('draws skeleton cards while the first page loads', () => {
      const { getAllByTestId, queryByTestId } = renderWithProviders(<StoresListUI {...base({ businessesList: { businesses: [], loading: true, error: null } })} />)
      expect(getAllByTestId('store-skeleton')).toHaveLength(3)
      expect(queryByTestId('stores-empty')).toBeNull()
    })

    it('says there are no results', () => {
      const { getByText } = renderWithProviders(<StoresListUI {...base({ businessesList: { businesses: [], loading: false, error: null } })} />)
      expect(getByText('Sorry, no results found')).toBeTruthy()
    })

    it('says "Network Error" when it is empty and offline', () => {
      ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
      const { getByText } = renderWithProviders(<StoresListUI {...base({ businessesList: { businesses: [], loading: false, error: null } })} />)
      expect(getByText('Network Error')).toBeTruthy()
    })

    it('shows the error with Retry, and a toast with the reason', () => {
      const props = base({ businessesList: { businesses: [], loading: false, error: ['Boom'] } })
      const { getByTestId } = renderWithProviders(<StoresListUI {...props} />)
      expect(showToast()).toHaveBeenCalledWith('error', 'Boom')
      fireEvent.press(getByTestId('stores-retry'))
      expect(props.getBusinesses).toHaveBeenCalledWith(true)
    })

    it('a spinner at the foot while a next page loads', () => {
      const { getByTestId } = renderWithProviders(<StoresListUI {...base({ businessesList: { businesses: [store(1)], loading: true, error: null } })} />)
      expect(getByTestId('stores-loading-more')).toBeTruthy()
    })
  })

  describe('pagination', () => {
    const endReached = (getByTestId: any) => fireEvent(getByTestId('stores-flatlist'), 'endReached')

    it('asks for the next page when the end is reached and there are more', () => {
      const props = base({ paginationProps: { currentPage: 1, totalPages: 3, pageSize: 20 } })
      const { getByTestId } = renderWithProviders(<StoresListUI {...props} />)
      endReached(getByTestId)
      expect(props.getBusinesses).toHaveBeenCalledTimes(1)
      expect(props.getBusinesses).toHaveBeenCalledWith()
    })

    it('does not ask on the last page, nor while a request is going, nor twice for the same end', () => {
      const last = base({ paginationProps: { currentPage: 3, totalPages: 3, pageSize: 20 } })
      const first = renderWithProviders(<StoresListUI {...last} />)
      endReached(first.getByTestId)
      expect(last.getBusinesses).not.toHaveBeenCalled()
      first.unmount()

      const busy = base({ paginationProps: { currentPage: 1, totalPages: 3 }, businessesList: { businesses: [store(1)], loading: true, error: null } })
      const second = renderWithProviders(<StoresListUI {...busy} />)
      endReached(second.getByTestId)
      expect(busy.getBusinesses).not.toHaveBeenCalled()
      second.unmount()

      const more = base({ paginationProps: { currentPage: 1, totalPages: 3 } })
      const third = renderWithProviders(<StoresListUI {...more} />)
      endReached(third.getByTestId)
      endReached(third.getByTestId)
      expect(more.getBusinesses).toHaveBeenCalledTimes(1)
    })

    it('pull to refresh starts again from the first page', () => {
      const props = base()
      const { getByTestId } = renderWithProviders(<StoresListUI {...props} />)
      act(() => { getByTestId('stores-flatlist').props.refreshControl.props.onRefresh() })
      expect(props.getBusinesses).toHaveBeenCalledWith(true)
    })
  })

  describe('search', () => {
    beforeEach(() => { jest.useFakeTimers() })
    afterEach(() => { jest.useRealTimers() })

    it('opens a field under the header and searches once the typing stops', () => {
      const props = base()
      const { getByTestId, queryByTestId } = renderWithProviders(<StoresListUI {...props} />)
      expect(queryByTestId('stores-search-input')).toBeNull()
      fireEvent.press(getByTestId('stores-search-button'))
      const input = getByTestId('stores-search-input')
      expect(input.props.autoCapitalize).toBe('none')
      fireEvent.changeText(input, 'wi')
      fireEvent.changeText(input, 'wine')
      expect(props.handleChangeSearch).not.toHaveBeenCalled()
      act(() => { jest.advanceTimersByTime(400) })
      expect(props.handleChangeSearch).toHaveBeenCalledTimes(1)
      expect(props.handleChangeSearch).toHaveBeenCalledWith('wine')
    })

    // ANDROID-C10: back with the search open went to the Orders tab and left the search open.
    it('closes the search on Android\'s back (and answers it), instead of leaving for another tab', () => {
      const handlers: Array<() => boolean> = []
      const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, handler: any) => { handlers.push(handler); return { remove: jest.fn() } }) as any)
      const props = base()
      const { getByTestId, queryByTestId } = renderWithProviders(<StoresListUI {...props} navigation={{ ...props.navigation, isFocused: () => true }} />)
      expect(handlers).toHaveLength(0)
      fireEvent.press(getByTestId('stores-search-button'))
      expect(handlers.length).toBeGreaterThan(0)
      let handled = false
      act(() => { handled = handlers[handlers.length - 1]() })
      expect(handled).toBe(true)
      expect(queryByTestId('stores-search-input')).toBeNull()
      add.mockRestore()
    })

    it('leaves the back to another tab when the Stores tab is not the one in front', () => {
      const handlers: Array<() => boolean> = []
      const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, handler: any) => { handlers.push(handler); return { remove: jest.fn() } }) as any)
      const props = base()
      const { getByTestId } = renderWithProviders(<StoresListUI {...props} navigation={{ ...props.navigation, isFocused: () => false }} />)
      fireEvent.press(getByTestId('stores-search-button'))
      let handled = true
      act(() => { handled = handlers[handlers.length - 1]() })
      expect(handled).toBe(false)
      add.mockRestore()
    })

    it('the X clears the text, and closes the field when it is empty', () => {
      const props = base({ searchValue: 'wine' })
      const { getByTestId, queryByTestId } = renderWithProviders(<StoresListUI {...props} />)
      fireEvent.press(getByTestId('stores-search-clear'))
      expect(props.handleChangeSearch).toHaveBeenCalledWith('')
      fireEvent.press(getByTestId('stores-search-clear'))
      expect(queryByTestId('stores-search-input')).toBeNull()
    })

    it('is not offered with its theme key off, nor offline', () => {
      const off = themeWithValues((values) => { values.visibility['stores.search'] = false })
      const first = renderWithProviders(<StoresListUI {...base()} />, { themeOverrides: off })
      expect(first.queryByTestId('stores-search-button')).toBeNull()
      first.unmount()
      ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
      const second = renderWithProviders(<StoresListUI {...base()} />)
      expect(second.queryByTestId('stores-search-button')).toBeNull()
    })
  })

  describe('offline', () => {
    it('says so and turns the switches off', () => {
      ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
      const { getByTestId } = renderWithProviders(<StoresListUI {...base()} />)
      expect(getByTestId('stores-offline')).toBeTruthy()
      expect(getByTestId('store-switch-1').props.accessibilityState.disabled).toBe(true)
    })

    it('has no notice online', () => {
      const { queryByTestId } = renderWithProviders(<StoresListUI {...base()} />)
      expect(queryByTestId('stores-offline')).toBeNull()
    })
  })

  describe('two panes', () => {
    it('selects the first store until the user picks one, and marks the selected', () => {
      const onSelectStore = jest.fn()
      const { rerender } = renderWithProviders(<StoresListUI {...base()} onSelectStore={onSelectStore} />, { platform: 'tablet' })
      expect(onSelectStore).toHaveBeenCalledWith(expect.objectContaining({ slug: 'store-1' }))
      onSelectStore.mockClear()
      rerender(<StoresListUI {...base()} onSelectStore={onSelectStore} selectedSlug='store-2' />)
      expect(onSelectStore).not.toHaveBeenCalled()
    })

    it('a card selects its store instead of navigating', () => {
      const onSelectStore = jest.fn()
      const props = base()
      const { getByTestId } = renderWithProviders(<StoresListUI {...props} onSelectStore={onSelectStore} selectedSlug='store-1' />, { platform: 'tablet' })
      onSelectStore.mockClear()
      fireEvent.press(getByTestId('store-open-2'))
      expect(onSelectStore).toHaveBeenCalledWith(expect.objectContaining({ slug: 'store-2' }))
      expect(props.navigation.navigate).not.toHaveBeenCalled()
    })
  })
})
