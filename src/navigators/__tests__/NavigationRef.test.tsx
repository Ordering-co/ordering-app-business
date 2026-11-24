import {
  currentRoute,
  navigate,
  navigationRef,
  openChatOrderId,
  openMessagesTab,
  openOrderChat,
  openOrderDetails,
  openOrdersTab
} from '../NavigationRef'

describe('NavigationRef (navigating from outside React: a push, the new-order alert)', () => {
  const nav = { navigate: jest.fn(), getCurrentRoute: jest.fn() }

  beforeEach(() => {
    navigationRef.current = nav
    nav.navigate.mockClear()
    nav.getCurrentRoute.mockReset()
  })

  afterEach(() => { navigationRef.current = null })

  it('goes back to a screen already open in the stack instead of pushing a second one (React Navigation 7)', () => {
    navigate('OrderDetails', { orderId: 3 })
    expect(nav.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 3 }, { pop: true })
  })

  it('does nothing before the navigation is ready', () => {
    navigationRef.current = null
    expect(() => navigate('OrderDetails', {})).not.toThrow()
    expect(currentRoute()).toBeUndefined()
  })

  it('opens an order\'s details and its chat by the route names of the contracts', () => {
    openOrderDetails(42)
    expect(nav.navigate).toHaveBeenLastCalledWith('OrderDetails', { orderId: 42, isFromRoot: true }, { pop: true })
    openOrderChat('42')
    expect(nav.navigate).toHaveBeenLastCalledWith('OrderMessage', { orderId: '42', isFromRoot: true }, { pop: true })
  })

  it('takes the business to a tab, whatever screen is in front, asking the Orders tab for a list', () => {
    openOrdersTab('new')
    expect(nav.navigate).toHaveBeenLastCalledWith('BottomTab', { screen: 'Orders', params: { tab: 'new', at: expect.any(Number) } }, { pop: true })
    openMessagesTab()
    expect(nav.navigate).toHaveBeenLastCalledWith('BottomTab', { screen: 'Messages' }, { pop: true })
  })

  it('adds the chip of New to the ask only when one is named', () => {
    openOrdersTab('new', 'preorder')
    expect(nav.navigate).toHaveBeenLastCalledWith('BottomTab', { screen: 'Orders', params: { tab: 'new', stage: 'preorder', at: expect.any(Number) } }, { pop: true })
    openOrdersTab('new')
    expect(nav.navigate.mock.calls[nav.navigate.mock.calls.length - 1][1].params).not.toHaveProperty('stage')
  })

  it('asks for the same list twice with two different params, so the second ask is seen', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1).mockReturnValueOnce(2)
    openOrdersTab('history')
    openOrdersTab('history')
    const [first, second] = nav.navigate.mock.calls.map((call) => call[1].params.at)
    expect(first).not.toBe(second)
    jest.restoreAllMocks()
  })

  describe('openChatOrderId (the order whose chat is in front)', () => {
    it('is the order of the chat in front', () => {
      nav.getCurrentRoute.mockReturnValue({ name: 'OrderMessage', params: { orderId: '12' } })
      expect(openChatOrderId()).toBe(12)
      nav.getCurrentRoute.mockReturnValue({ name: 'OrderMessage', params: { order: { id: 9 } } })
      expect(openChatOrderId()).toBe(9)
    })

    it('is nothing on any other screen, or a chat that names no order', () => {
      nav.getCurrentRoute.mockReturnValue({ name: 'OrderDetails', params: { orderId: 12 } })
      expect(openChatOrderId()).toBeUndefined()
      nav.getCurrentRoute.mockReturnValue({ name: 'OrderMessage', params: {} })
      expect(openChatOrderId()).toBeUndefined()
      nav.getCurrentRoute.mockReturnValue(undefined)
      expect(openChatOrderId()).toBeUndefined()
    })
  })
})
