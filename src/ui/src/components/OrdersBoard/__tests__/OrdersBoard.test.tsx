import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, within } from '@testing-library/react-native'
import { useConfig, useUtils } from '@components'

// The controller is replaced by a component that hands the UI whatever the test sets in `mockController`.
const mockController: { current: Record<string, any> } = { current: {} }
const mockBusinesses: { current: any[] } = { current: [] }
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    OrderListGroups: ({ UIComponent, ...props }: any) => <UIComponent {...props} {...mockController.current} />,
    BusinessList: ({ UIComponent, ...props }: any) => <UIComponent {...props} businessesList={{ businesses: mockBusinesses.current, fetched: true }} paginationProps={{ currentPage: 1, totalPages: 1, totalItems: mockBusinesses.current.length }} getBusinesses={jest.fn()} handleChangeSearch={jest.fn()} searchValue='' />,
    DriverList: () => null,
    PaymethodList: () => null,
    MainSearch: () => null
  }
})
const mockActions = { openAccept: jest.fn(), openReject: jest.fn(), openReview: jest.fn() }
jest.mock('@ui', () => ({
  usePauseOrders: () => ({ loading: true, error: false, stores: [], openCount: 0, sheet: null }),
  useOrderActions: () => mockActions,
  canReviewCustomer: () => false,
  NotificationSetting: () => null
}))
jest.mock('../../WebsocketStatus', () => ({
  WebsocketStatus: () => { const { Text: T } = require('react-native'); return <T>connection</T> }
}))
// The details page is its own area's: here only how the board mounts it.
const mockMounted = jest.fn()
jest.mock('../../OrderDetails/OrderDetailsPage', () => ({
  OrderDetailsPage: (props: any) => {
    const React = require('react')
    const { Text: T, Pressable: P } = require('react-native')
    React.useEffect(() => { mockMounted(props.orderId) }, [])
    return (
      <>
        <T testID='details-page'>{`${props.presentation}:${props.orderId}`}</T>
        <P testID='details-close' onPress={props.onClose} />
      </>
    )
  }
}))
jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn(() => new Promise(() => {})),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

import { OrdersBoard } from '..'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { makeOrder, slot } from '../../OrdersOption/__tests__/fixtures'
import { resetStoresSeen } from '../../PreviousOrders/storesSeen'
import { resetOrdersView } from '../../OrdersOption/ordersView'

const controller = (overrides: Record<string, any> = {}) => ({
  currentTabSelected: 'active',
  setCurrentTabSelected: jest.fn(),
  setCurrentFilters: jest.fn(),
  setOrdersGroup: jest.fn(),
  loadOrders: jest.fn(),
  loadMoreOrders: jest.fn(),
  onFiltered: jest.fn(),
  handleChangeOrderStatus: jest.fn(),
  handleSendCustomerReview: jest.fn(),
  filtered: null,
  ordersFiltered: slot([]),
  supportsCustomerNameFilter: true,
  ordersGroup: {
    active: slot([
      makeOrder({ id: 12, status: 0 }), makeOrder({ id: 11, status: 0 }), makeOrder({ id: 10, status: 13 }),
      makeOrder({ id: 9, status: 7 }), makeOrder({ id: 8, status: 14 }),
      makeOrder({ id: 7, status: 4, delivery_type: 2 }),
      makeOrder({ id: 6, status: 23, driver: { name: 'Omar', lastname: 'H' } })
    ]),
    completed: slot([
      makeOrder({ id: 5, status: 1, delivery_datetime_utc: '2026-11-19 16:20:00' }),
      makeOrder({ id: 4, status: 5, delivery_datetime_utc: '2026-11-19 15:00:00', reject_reason: 'Too busy' })
    ], { currentFilter: [1, 2, 5, 6, 10, 11, 12, 15, 16, 17] }),
    pending: slot([]),
    inProgress: slot([]),
    cancelled: slot([])
  },
  ...overrides
})

const renderBoard = (props: Record<string, any> = {}, offline: any = {}, options: Record<string, any> = {}) => renderWithProviders(
  <OfflineActionsContext.Provider value={[{ isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null, ...offline }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
    <OrdersBoard onNavigationRedirect={jest.fn()} navigation={{ navigate: jest.fn() }} {...props} />
  </OfflineActionsContext.Provider>,
  { platform: 'tablet', ...options }
)

describe('OrdersBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetStoresSeen()
    resetOrdersView()
    mockController.current = controller()
    mockBusinesses.current = []
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => `time(${v})`, timeFormat: 'HH:mm', dateFormat: 'MM/DD/YYYY' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  it('draws New, Preparing and Ready, each with the cards of its stage and no number', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    // New: 2 pending + 1 pre-order. Preparing: 7 and 14. Ready: ready for pickup and with the driver (as the mockup draws them).
    for (const name of ['new', 'preparing', 'ready']) expect(queryByTestId(`board-column-${name}-count`)).toBeNull()
    const column = (name: string, id: number) => within(getByTestId(`board-column-${name}`)).queryAllByTestId(`order-card-${id}`).length
    expect(column('new', 12)).toBe(1)
    expect(column('new', 10)).toBe(1)
    expect(column('preparing', 9)).toBe(1)
    expect(column('preparing', 8)).toBe(1)
    expect(column('ready', 7)).toBe(1)
    expect(column('ready', 6)).toBe(1)
    expect(column('new', 9)).toBe(0)
    expect(queryByTestId('board-columns')).toBeTruthy()
  })

  it('the cards of the columns and of History carry the store when the account has more than one', () => {
    const mcb = { id: 41, name: 'McBonalds', logo: 'https://cdn.example/mcb.jpg' }
    const wine = { id: 49, name: 'Wine..' }
    const base = controller()
    mockController.current = controller({
      ordersGroup: {
        ...base.ordersGroup,
        active: slot([
          makeOrder({ id: 12, status: 0, business_id: 41, business: mcb }),
          makeOrder({ id: 9, status: 7, business_id: 49, business: wine }),
          makeOrder({ id: 7, status: 4, delivery_type: 2, business_id: 41, business: mcb })
        ])
      }
    })
    const { getByTestId } = renderBoard()
    // One store seen by each column alone; the line is on for all of them (the board's lists share what they have seen).
    expect(within(getByTestId('board-column-new')).getByText('McBonalds')).toBeTruthy()
    expect(within(getByTestId('board-column-preparing')).getByText('Wine..')).toBeTruthy()
    expect(within(getByTestId('board-column-ready')).getByText('McBonalds')).toBeTruthy()
    expect(getByTestId('order-card-12-open').props.accessibilityLabel).toContain('McBonalds')
  })

  it('draws no store line on the board for an account with one store', () => {
    const mcb = { id: 41, name: 'McBonalds' }
    const base = controller()
    mockController.current = controller({
      ordersGroup: { ...base.ordersGroup, active: slot([makeOrder({ id: 12, status: 0, business_id: 41, business: mcb }), makeOrder({ id: 9, status: 7, business_id: 41, business: mcb })]) }
    })
    const { queryByTestId } = renderBoard()
    expect(queryByTestId('order-card-store-name')).toBeNull()
  })

  it('the cards carry their actions: Accept and Reject on a new order, Mark ready on a preparing one', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    expect(getByTestId('order-card-12-accept')).toBeTruthy()
    expect(getByTestId('order-card-12-reject')).toBeTruthy()
    expect(getByTestId('order-card-9-ready')).toBeTruthy()
    // A pre-order and an order with a driver have none.
    expect(queryByTestId('order-card-10-accept')).toBeNull()
    expect(queryByTestId('order-card-6-ready')).toBeNull()
    fireEvent.press(getByTestId('order-card-12-accept'))
    expect(mockActions.openAccept).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }), expect.objectContaining({ handleChangeOrderStatus: expect.any(Function) }))
  })

  it('an action from a card is applied to the board\'s lists from the server\'s answer: the card changes column with no socket event (TAB-B2)', async () => {
    const raw = jest.fn(async () => [makeOrder({ id: 12, status: 7 })])
    mockController.current = controller({ handleChangeOrderStatus: raw })
    const { getByTestId } = renderBoard()
    fireEvent.press(getByTestId('order-card-12-accept'))
    // The sheet gets the board's own handler (not the controller's), and it applies the answer to the controller's lists.
    const handler = mockActions.openAccept.mock.calls[0][1].handleChangeOrderStatus
    expect(handler).not.toBe(raw)
    await act(async () => { await handler(7, [12], { status: 7 }) })
    expect(raw).toHaveBeenCalled()
    const setOrdersGroup = mockController.current.setOrdersGroup as jest.Mock
    const apply = setOrdersGroup.mock.calls[setOrdersGroup.mock.calls.length - 1][0]
    const next = apply(mockController.current.ordersGroup)
    const ids = (key: string) => next[key].orders.map((order: any) => order.id)
    expect(ids('active')).toContain(12)
    expect(next.active.orders.find((order: any) => order.id === 12).status).toBe(7)
  })

  it('a column of many orders mounts only the cards near the screen, and its title has no number', () => {
    const many = Array.from({ length: 120 }, (_, index) => makeOrder({ id: 900 - index, status: 0 }))
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot(many) } })
    const { getByTestId, queryByTestId } = renderBoard()
    expect(queryByTestId('board-column-new-count')).toBeNull()
    expect(getByTestId('order-card-900')).toBeTruthy()
    expect(queryByTestId('order-card-800')).toBeNull()
  })

  it('says so in a column with no order, and in New that no new order is waiting', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([makeOrder({ id: 9, status: 7 })]) } })
    const { getByTestId } = renderBoard()
    expect(getByTestId('board-column-new-empty')).toHaveTextContent('No new orders')
    expect(getByTestId('board-column-ready-empty')).toHaveTextContent('No orders ready for pickup')
    expect(getByTestId('order-card-9')).toBeTruthy()
  })

  it('draws a skeleton in each column while the first list loads', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([], { loading: true, fetched: false }) } })
    const { getByTestId, queryByTestId } = renderBoard()
    expect(getByTestId('board-skeleton-new')).toBeTruthy()
    expect(getByTestId('board-skeleton-preparing')).toBeTruthy()
    expect(getByTestId('board-skeleton-ready')).toBeTruthy()
    expect(queryByTestId('board-column-new')).toBeNull()
  })

  it('one state, not three empty columns, when the list could not load', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([], { error: ['Order not found'] }) } })
    const { getByText, queryByTestId } = renderBoard()
    expect(getByText('Order not found')).toBeTruthy()
    expect(queryByTestId('board-column-new')).toBeNull()
  })

  it('tapping a card opens its details as a panel of the theme\'s width over the board, and closing returns', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    expect(queryByTestId('board-panel')).toBeNull()
    fireEvent.press(getByTestId('order-card-9-open'))
    expect(getByTestId('details-page')).toHaveTextContent('panel:9')
    // The panel is the `screen.detail_pane_width` of the theme (440) and the board stays under it.
    const panel = StyleSheet.flatten(getByTestId('board-panel').props.style)
    expect(panel).toMatchObject({ position: 'absolute', width: 440, right: 0 })
    expect(getByTestId('board-columns')).toBeTruthy()
    expect(getByTestId('order-card-9')).toBeTruthy()

    fireEvent.press(getByTestId('details-close'))
    expect(queryByTestId('board-panel')).toBeNull()
  })

  it('accepting from a column says so, and "View order" shows that order in the panel (a card whose order is open has none)', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    fireEvent.press(getByTestId('order-card-12-accept'))
    const options = mockActions.openAccept.mock.calls[0][1]
    expect(options.from).toBe('list')
    expect(queryByTestId('board-panel')).toBeNull()
    act(() => { options.viewOrder(makeOrder({ id: 12, status: 7 })) })
    expect(getByTestId('details-page')).toHaveTextContent('panel:12')

    mockActions.openAccept.mockClear()
    fireEvent.press(getByTestId('order-card-11-accept'))
    expect(mockActions.openAccept.mock.calls[0][1].viewOrder).toEqual(expect.any(Function))
    fireEvent.press(getByTestId('order-card-12-open'))
    // 12 is in the panel now: its own accept has nothing to go to.
    mockActions.openAccept.mockClear()
    fireEvent.press(getByTestId('order-card-12-accept'))
    expect(mockActions.openAccept.mock.calls[0][1].viewOrder).toBeUndefined()
  })

  it('another card replaces the order in the panel (a new mount per order)', () => {
    const { getByTestId } = renderBoard()
    fireEvent.press(getByTestId('order-card-9-open'))
    fireEvent.press(getByTestId('order-card-12-open'))
    expect(getByTestId('details-page')).toHaveTextContent('panel:12')
    expect(mockMounted.mock.calls.map(([id]) => id)).toEqual([9, 12])
  })

  it('it does not navigate to the order: the panel is its details', () => {
    const navigate = jest.fn()
    const { getByTestId } = renderBoard({ onNavigationRedirect: navigate })
    fireEvent.press(getByTestId('order-card-9-open'))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('has the title, the connection pill, History and the search in its header', () => {
    const { getByTestId, getByText } = renderBoard()
    expect(getByText('Orders')).toBeTruthy()
    expect(getByText('connection')).toBeTruthy()
    expect(getByTestId('board-history-button')).toBeTruthy()
    expect(getByTestId('orders-search')).toBeTruthy()
  })

  it('draws no title, pill or search the theme hides', () => {
    const theme = themeWithValues((values) => {
      values.visibility['orders.title'] = false
      values.visibility.connection_status = false
      values.visibility['orders.search'] = false
    }, { platform: 'tablet' })
    const { queryByText, queryByTestId, getByTestId } = renderBoard({}, {}, { themeOverrides: theme as any })
    expect(queryByText('Orders')).toBeNull()
    expect(queryByText('connection')).toBeNull()
    expect(queryByTestId('orders-search')).toBeNull()
    expect(getByTestId('board-column-new')).toBeTruthy()
  })

  it('says it is offline over the columns', () => {
    const { getByTestId } = renderBoard({ isNetConnected: false }, { isNetConnected: false })
    expect(getByTestId('orders-offline')).toBeTruthy()
    expect(getByTestId('board-column-new')).toBeTruthy()
  })

  it('History opens as a screen with the closed orders by day, over the board\'s own list', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    expect(queryByTestId('board-history')).toBeNull()
    fireEvent.press(getByTestId('board-history-button'))
    // The controller's slot follows, as the phone's History tab does.
    expect(mockController.current.setCurrentTabSelected).toHaveBeenCalledWith('completed')
    expect(getByTestId('board-history-chips')).toBeTruthy()
    expect(getByTestId('order-card-5')).toBeTruthy()
    expect(getByTestId('order-card-4')).toBeTruthy()
  })

  it('a History chip narrows the closed orders, and Load more asks for the next page', () => {
    const base = controller()
    mockController.current = controller({ ordersGroup: { ...base.ordersGroup, completed: { ...base.ordersGroup.completed, pagination: { currentPage: 1, pageSize: 50, totalPages: 3, total: 120 } } } })
    const { getByTestId } = renderBoard()
    fireEvent.press(getByTestId('board-history-button'))
    fireEvent.press(getByTestId('board-history-cancelled'))
    expect(mockController.current.setCurrentFilters).toHaveBeenCalledWith([2, 5, 6, 10, 12, 16, 17])
    fireEvent.press(getByTestId('board-history-more'))
    expect(mockController.current.loadMoreOrders).toHaveBeenCalledWith({ allStatusses: false })
  })

  it('an order opened from History shows in the panel, back on the board', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    fireEvent.press(getByTestId('board-history-button'))
    fireEvent.press(getByTestId('order-card-5-open'))
    expect(getByTestId('details-page')).toHaveTextContent('panel:5')
    expect(queryByTestId('board-history')).toBeNull()
  })

  describe('with a filter or a text search on (OQ-02, T3-C5)', () => {
    const filteredController = (results: any[], extra: Record<string, any> = {}) => controller({ filtered: { delivery_type: 2 }, ordersFiltered: slot(results), ...extra })
    const cardsOf = (getByTestId: any, name: string) => within(getByTestId(`board-column-${name}`)).queryAllByTestId(/^order-card-\d+$/).map((node: any) => node.props.testID).sort()

    it('keeps the three columns, each with the matching orders only, under the notice that clears the filter', () => {
      mockController.current = filteredController([
        makeOrder({ id: 10, status: 13 }), makeOrder({ id: 20, status: 7 }), makeOrder({ id: 21, status: 14 }), makeOrder({ id: 30, status: 4, delivery_type: 2 }), makeOrder({ id: 3, status: 1 })
      ])
      const { getByTestId, getByText, queryByTestId } = renderBoard()
      expect(getByTestId('board-columns')).toBeTruthy()
      expect(cardsOf(getByTestId, 'new')).toEqual(['order-card-10'])
      expect(cardsOf(getByTestId, 'preparing')).toEqual(['order-card-20', 'order-card-21'])
      expect(cardsOf(getByTestId, 'ready')).toEqual(['order-card-30'])
      // The closed order is History's, and the orders without the filter (12, 9...) are not here.
      expect(queryByTestId('order-card-3')).toBeNull()
      expect(queryByTestId('order-card-12')).toBeNull()
      expect(getByTestId('orders-filter-notice')).toBeTruthy()
      fireEvent.press(getByText('Clear'))
      expect(mockController.current.onFiltered).toHaveBeenCalledWith(null)
    })

    it('draws a column with no match as an empty column', () => {
      mockController.current = filteredController([makeOrder({ id: 20, status: 7 })])
      const { getByTestId, queryByTestId } = renderBoard()
      expect(getByTestId('board-column-new-empty')).toHaveTextContent('No new orders')
      expect(getByTestId('board-column-ready-empty')).toHaveTextContent('No orders ready for pickup')
      expect(queryByTestId('board-column-preparing-empty')).toBeNull()
      expect(getByTestId('order-card-20')).toBeTruthy()
    })

    it('says "no results" when nothing matched in any status, and shows the skeleton columns while it loads', () => {
      mockController.current = filteredController([])
      const none = renderBoard()
      expect(none.queryByTestId('board-column-new')).toBeNull()
      expect(none.getByText('Sorry, no results found')).toBeTruthy()
      none.unmount()
      mockController.current = filteredController([], { ordersFiltered: slot([], { loading: true, fetched: false }) })
      const loading = renderBoard()
      expect(loading.getByTestId('board-skeleton-new')).toBeTruthy()
    })

    it('the details panel opens from a card and closes as without a filter', () => {
      mockController.current = filteredController([makeOrder({ id: 20, status: 7 })])
      const { getByTestId, queryByTestId } = renderBoard()
      fireEvent.press(getByTestId('order-card-20-open'))
      expect(getByTestId('details-page')).toHaveTextContent('panel:20')
      expect(getByTestId('board-columns')).toBeTruthy()
      fireEvent.press(getByTestId('details-close'))
      expect(queryByTestId('board-panel')).toBeNull()
    })

    it('History holds the closed orders that match, by day, with its chips, and an order opens in the panel', () => {
      mockController.current = filteredController([
        makeOrder({ id: 20, status: 7 }),
        makeOrder({ id: 3, status: 1, delivery_datetime_utc: '2026-11-19 16:20:00' }),
        makeOrder({ id: 2, status: 5, delivery_datetime_utc: '2026-11-19 15:00:00' })
      ])
      const { getByTestId, queryByTestId } = renderBoard()
      fireEvent.press(getByTestId('board-history-button'))
      expect(getByTestId('board-history-chips')).toBeTruthy()
      expect(getByTestId('order-card-3')).toBeTruthy()
      expect(getByTestId('order-card-2')).toBeTruthy()
      // Not the controller's History (orders 5 and 4), and not the open results.
      expect(queryByTestId('order-card-5')).toBeNull()
      expect(within(getByTestId('board-history')).queryByTestId('order-card-20')).toBeNull()
      fireEvent.press(getByTestId('order-card-3-open'))
      expect(getByTestId('details-page')).toHaveTextContent('panel:3')
      expect(queryByTestId('board-history')).toBeNull()
    })

    it('a column draws no number while more pages of results remain either', () => {
      mockController.current = filteredController([makeOrder({ id: 20, status: 7 })], { ordersFiltered: slot([makeOrder({ id: 20, status: 7 })], { pagination: { currentPage: 1, pageSize: 50, total: 90, totalPages: 2 } }) })
      const { queryByTestId } = renderBoard()
      expect(queryByTestId('board-column-preparing-count')).toBeNull()
    })

    it('a card moves to its new column after the app\'s own action, the filter on', async () => {
      const raw = jest.fn(async () => [makeOrder({ id: 12, status: 7 })])
      mockController.current = filteredController([makeOrder({ id: 12, status: 0 }), makeOrder({ id: 11, status: 0 })], { handleChangeOrderStatus: raw })
      const { getByTestId } = renderBoard()
      expect(cardsOf(getByTestId, 'new')).toEqual(['order-card-11', 'order-card-12'])
      fireEvent.press(getByTestId('order-card-12-accept'))
      const handler = mockActions.openAccept.mock.calls[0][1].handleChangeOrderStatus
      await act(async () => { await handler(7, [12], { status: 7 }) })
      expect(cardsOf(getByTestId, 'new')).toEqual(['order-card-11'])
      expect(cardsOf(getByTestId, 'preparing')).toEqual(['order-card-12'])
    })

    it('clearing the filter brings back the controller\'s own columns', () => {
      mockController.current = filteredController([makeOrder({ id: 20, status: 7 })])
      const view = renderBoard()
      expect(view.queryByTestId('order-card-12')).toBeNull()
      mockController.current = controller()
      view.rerender(
        <OfflineActionsContext.Provider value={[{ isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
          <OrdersBoard onNavigationRedirect={jest.fn()} navigation={{ navigate: jest.fn() }} />
        </OfflineActionsContext.Provider>
      )
      expect(view.getByTestId('order-card-12')).toBeTruthy()
    })
  })

  it('the search button opens the search', () => {
    const { getByTestId, queryByTestId } = renderBoard()
    expect(queryByTestId('orders-search-field')).toBeNull()
    act(() => { fireEvent.press(getByTestId('orders-search')) })
    expect(getByTestId('orders-search')).toBeTruthy()
  })

  // The store chip of the header is drawn only when the theme turns `orders.store_filter` on (it is off by default).
  const chipTheme = () => themeWithValues((values) => { values.visibility['orders.store_filter'] = true }, { platform: 'tablet' }) as any

  it('has no store chip by default; with the key on, only with more than one store, and the choice is the controller\'s business filter', () => {
    mockBusinesses.current = [{ id: 1, name: 'Luna Pizza' }, { id: 2, name: 'Luna Sushi' }]
    expect(renderBoard().queryByTestId('board-store-filter')).toBeNull()

    mockBusinesses.current = []
    const none = renderBoard({}, {}, { themeOverrides: chipTheme() })
    expect(none.queryByTestId('board-store-filter')).toBeNull()
    none.unmount()

    mockBusinesses.current = [{ id: 1, name: 'Luna Pizza' }, { id: 2, name: 'Luna Sushi' }]
    const { getByTestId, getByText } = renderBoard({}, {}, { themeOverrides: chipTheme() })
    expect(getByTestId('board-store-filter')).toHaveTextContent(/All stores/)
    fireEvent.press(getByTestId('board-store-filter'))
    fireEvent.press(getByText('Luna Sushi'))
    expect(mockController.current.onFiltered).toHaveBeenCalledWith({ business: '2' })
  })

  it('the store chip shows the chosen store and clears it with All stores', () => {
    mockBusinesses.current = [{ id: 1, name: 'Luna Pizza' }, { id: 2, name: 'Luna Sushi' }]
    const { getByTestId, getByText } = renderBoard({}, {}, { themeOverrides: chipTheme() })
    fireEvent.press(getByTestId('board-store-filter'))
    fireEvent.press(getByText('Luna Sushi'))
    expect(getByTestId('board-store-filter')).toHaveTextContent(/Luna Sushi/)
    expect(mockController.current.onFiltered).toHaveBeenCalledWith({ business: '2' })
    fireEvent.press(getByTestId('board-store-filter'))
    fireEvent.press(getByText('All stores', { exact: true }))
    expect(getByTestId('board-store-filter')).toHaveTextContent(/All stores/)
  })

  it('is the phone\'s data on a tablet\'s layout: the columns are the same lists as the phone\'s sections', () => {
    // A view of the same controller that only counts what a column holds: none is a second source.
    const { getByTestId } = renderBoard()
    const all = ['new', 'preparing', 'ready'].flatMap((name) => within(getByTestId(`board-column-${name}`)).queryAllByTestId(/^order-card-\d+$/).map((node: any) => node.props.testID))
    expect(all.sort()).toEqual(['order-card-10', 'order-card-11', 'order-card-12', 'order-card-6', 'order-card-7', 'order-card-8', 'order-card-9'])
  })
})

