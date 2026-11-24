import React from 'react'
import fs from 'fs'
import path from 'path'
import { FlatList, Text } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

/**
 * The Messages screen is built at launch and stays in the tree while another tab is shown, so its
 * unread count is the tab bar's badge from the start. Here the real `Contacts` controller (the one
 * that loads the list and listens to the socket) runs under the real list, with a fake API and a fake
 * socket, and nothing tells the screen it is visible: the count is read from the context, as the tab
 * bar reads it.
 */
const mockSocket = (() => {
  const handlers: Record<string, Array<(payload: any) => void>> = {}
  return {
    socket: {},
    handlers,
    on: jest.fn((event: string, handler: (payload: any) => void) => { (handlers[event] ||= []).push(handler) }),
    off: jest.fn((event: string, handler: (payload: any) => void) => { handlers[event] = (handlers[event] || []).filter(h => h !== handler) }),
    join: jest.fn(),
    leave: jest.fn(),
    emit: (event: string, payload: any) => (handlers[event] || []).forEach(handler => handler(payload))
  }
})()

/** The app's event bus, as the order controller announces a read chat on it (`order_message_read`). */
const mockEvents = new (jest.requireActual('@/@/components/src/components/Emitter').Emitter)()

/** What the API answers: the list's page, and an order by id. */
let mockList: any[] = []
let mockOrderById: Record<number, any> = {}
/** The list's answers to give before the real one, one per request (an API error: `['No tienes permiso.']`). */
let mockFailures: string[][] = []
const mockGetList = jest.fn()
const mockGetOrder = jest.fn()

/** The session the app has: none until the user signs in. */
let mockSession: any = { token: 'token', user: { id: 7, level: 2 } }

/**
 * The API object is one, shared and mutable, as the SDK's: it answers 401 to a request that leaves with no
 * token on it, and the token is put there by whoever sets it (`setAccessToken`).
 */
const mockApi: any = {
  accessToken: null,
  orderId: undefined,
  setAccessToken: (token: string) => { mockApi.accessToken = token; return mockApi },
  orders: (id?: number) => { mockApi.orderId = id; return mockApi },
  parameters: () => mockApi,
  asDashboard: () => mockApi,
  get: async () => {
    if (mockApi.orderId !== undefined) {
      const id = mockApi.orderId
      mockApi.orderId = undefined
      mockGetOrder(id)
      return { content: { result: mockOrderById[id], error: false } }
    }
    mockGetList(mockApi.accessToken)
    if (!mockApi.accessToken) return { content: { result: ['No tienes permiso.'], error: true } }
    const failure = mockFailures.shift()
    if (failure) return { content: { result: failure, error: true } }
    return { content: { result: mockList, error: false, pagination: { current_page: 1, total_pages: 1 } } }
  }
}

jest.mock('@/@/components/src/contexts/SessionContext', () => ({ useSession: () => [mockSession] }))
jest.mock('@/@/components/src/contexts/ApiContext', () => ({ useApi: () => [mockApi] }))
jest.mock('@/@/components/src/contexts/WebsocketContext', () => ({ useWebsocket: () => mockSocket }))

/** The chat on screen (the navigation's `OrderMessage`), if any: what the list reads to keep that chat's count at zero. */
let mockOpenChat: number | undefined
jest.mock('../../../../../navigators/NavigationRef', () => ({ openChatOrderId: () => mockOpenChat }))

/** What the list does when the app has to catch up (the provider's own suite covers when it is told). */
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

jest.mock('@ui', () => {
  const React = require('react')
  const { Text } = require('react-native')
  const shared = require('../../shared')
  const { PreviousMessages } = require('../../PreviousMessages')
  return {
    ...shared,
    PreviousMessages,
    // The empty state belongs to another area: its text is what is checked here.
    NotFoundSource: ({ content }: any) => React.createElement(Text, null, content)
  }
})

jest.mock('@components', () => {
  const mockOrderingHooks = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrderingHooks,
    useSession: () => [mockSession],
    useApi: () => [mockApi],
    useEvent: () => [mockEvents],
    useUtils: jest.fn(() => [{ parseDate: (v: string) => v || '2026-01-01', optimizeImage: (url: string) => url }]),
    Contacts: jest.requireActual('@/@/components/src/components/Contacts').Contacts
  }
})

import { MessagesOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { UnreadMessagesProvider, useUnreadMessages } from '../../../../../context/UnreadMessagesContext'
import { sampleOrder } from '../../../../../../jest/helpers/b4MessagesDefaults'
import { ORDER_CHANGED_EVENT } from '../../OrdersOption/orderChanges'

const order = (id: number, unread: number) => ({
  ...sampleOrder,
  id,
  unread_count: unread,
  unread_direct_count: unread,
  customer: { ...sampleOrder.customer, name: `Store ${id}`, lastname: '' }
})
const Badge = () => <Text testID='badge'>{JSON.stringify(useUnreadMessages())}</Text>
const render = () => renderWithProviders(
  <UnreadMessagesProvider>
    <Badge />
    <MessagesOption
      firstFetch='orders'
      sortParams={{ param: 'last_direct_message_at', direction: 'asc' }}
      paginationSettings={{ page: 1, pageSize: 45, controlType: 'infinity' }}
    />
  </UnreadMessagesProvider>
)
const known = (view: any) => JSON.parse(view.getByTestId('badge').props.children)

describe('the Messages list kept in the tree while another tab is shown', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockSocket.handlers)) delete mockSocket.handlers[key]
    mockEvents._events = {}
    mockList = [order(1, 2), order(2, 0)]
    mockOrderById = {}
    mockFailures = []
    mockSession = { token: 'token', user: { id: 7, level: 2 } }
    mockApi.accessToken = null
    mockOpenChat = undefined
    jest.clearAllMocks()
  })

  it('loads its list once at launch and reports the unread count with no help from a visit', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(1)
  })

  it('joins the socket rooms of the business user at launch, to hear a message while another tab is shown', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).not.toBeNull())
    expect(mockSocket.join).toHaveBeenCalledWith('messages_orders_7')
    expect(mockSocket.join).toHaveBeenCalledWith('orders_7')
  })

  it('counts a new message of a known order, from the socket\'s `message` event', async () => {
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(2))
    mockOrderById[2] = order(2, 3)
    await act(async () => { mockSocket.emit('message', { order_id: 2 }) })
    await waitFor(() => expect(known(view)).toEqual({ total: 5, more: false }))
    expect(mockGetOrder).toHaveBeenCalledWith(2)
  })

  it('counts a message of an order the list did not have', async () => {
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(2))
    mockOrderById[9] = order(9, 1)
    await act(async () => { mockSocket.emit('message', { order_id: 9 }) })
    await waitFor(() => expect(known(view)).toEqual({ total: 3, more: false }))
  })

  // The chat is opened from the order's details, from this list or from a push; each reads it through the same
  // order controller, which announces it on the event bus (see `OrderMessage.test.tsx`), so the list hears it
  // whichever opened the chat.
  it('drops the count of an order whose chat was read, and counts the next message again', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))

    act(() => { mockEvents.emit('order_message_read', 1) })
    await waitFor(() => expect(known(view)).toEqual({ total: 0, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(1)
    expect(mockGetOrder).not.toHaveBeenCalled()

    mockOrderById[1] = order(1, 1)
    await act(async () => { mockSocket.emit('message', { order_id: 1 }) })
    await waitFor(() => expect(known(view)).toEqual({ total: 1, more: false }))
  })

  it('leaves the other orders\' counts alone when one chat is read, and ignores a chat with nothing unread', async () => {
    mockList = [order(1, 2), order(2, 4)]
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(6))
    act(() => { mockEvents.emit('order_message_read', 2) })
    await waitFor(() => expect(known(view).total).toBe(2))
    act(() => { mockEvents.emit('order_message_read', 2) })
    act(() => { mockEvents.emit('order_message_read', 99) })
    expect(known(view)).toEqual({ total: 2, more: false })
  })

  // The orders list and the Messages list show the order's status: both hear the same event of the app's own actions.
  describe('an action of the app on an order (ORDER_CHANGED_EVENT)', () => {
    it('moves the status its row shows, without a refetch and keeping its unread count', async () => {
      mockList = [order(1, 2), order(2, 0)]
      const view = render()
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      expect(view.getAllByText('Pending')).toHaveLength(2)
      mockGetList.mockClear()

      // The server's answer carries its own counts: the conversation's are kept.
      act(() => { mockEvents.emit(ORDER_CHANGED_EVENT, { id: 1, status: 4, unread_count: 0 }) })
      await waitFor(() => expect(view.getByText('Ready for pickup')).toBeTruthy())
      expect(view.getAllByText('Pending')).toHaveLength(1)
      expect(known(view)).toEqual({ total: 2, more: false })

      act(() => { mockEvents.emit(ORDER_CHANGED_EVENT, { id: 1, status: 15 }) })
      await waitFor(() => expect(view.getByText('Picked up by customer')).toBeTruthy())
      expect(view.queryByText('Ready for pickup')).toBeNull()
      expect(mockGetList).not.toHaveBeenCalled()
    })

    it('finds the row whether the id came as text or as a number, and leaves the others and unknown orders alone', async () => {
      const view = render()
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      act(() => { mockEvents.emit(ORDER_CHANGED_EVENT, { id: '2', status: 7 }) })
      await waitFor(() => expect(view.getByText('Accepted by business')).toBeTruthy())
      expect(view.getAllByText('Pending')).toHaveLength(1)
      act(() => { mockEvents.emit(ORDER_CHANGED_EVENT, { id: 999, status: 1 }) })
      expect(view.queryByText('Completed')).toBeNull()
    })
  })

  describe('a message of the chat that is open on screen', () => {
    it('never keeps the count the refetch brings, even when it lands after the chat\'s own read (the race)', async () => {
      const view = render()
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      mockOpenChat = 1
      // The chat reads as the message arrives (its event comes first)...
      act(() => { mockEvents.emit('order_message_read', 1) })
      await waitFor(() => expect(known(view)).toEqual({ total: 0, more: false }))
      // ...and the list's own refetch of the order, which left before the read, answers with the old count.
      mockOrderById[1] = order(1, 1)
      await act(async () => { mockSocket.emit('message', { order_id: 1 }) })
      await waitFor(() => expect(mockGetOrder).toHaveBeenCalledWith(1))
      await waitFor(() => expect(known(view)).toEqual({ total: 0, more: false }))
    })

    it('does not count it, and counts the same message of an order whose chat is not open', async () => {
      const view = render()
      await waitFor(() => expect(known(view).total).toBe(2))
      mockOpenChat = 2
      mockOrderById[2] = order(2, 1)
      await act(async () => { mockSocket.emit('message', { order_id: 2 }) })
      await waitFor(() => expect(mockGetOrder).toHaveBeenCalledWith(2))
      expect(known(view)).toEqual({ total: 2, more: false })
      // Another order's message still counts.
      mockOrderById[1] = order(1, 3)
      await act(async () => { mockSocket.emit('message', { order_id: 1 }) })
      await waitFor(() => expect(known(view)).toEqual({ total: 3, more: false }))
    })
  })

  describe('catching up when the socket comes back', () => {
    it('loads the list again, with the counts that changed meanwhile', async () => {
      const view = render()
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      expect(mockGetList).toHaveBeenCalledTimes(1)
      mockList = [order(1, 2), order(2, 5)]
      await act(async () => { mockReconnect!() })
      await waitFor(() => expect(known(view)).toEqual({ total: 7, more: false }))
      expect(mockGetList).toHaveBeenCalledTimes(2)
    })

    it('asks again through a new controller when the list had failed', async () => {
      mockFailures = [['No tienes permiso.']]
      const view = render()
      await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
      await act(async () => { mockReconnect!() })
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      expect(view.queryByText('No tienes permiso.')).toBeNull()
    })
  })

  it('stops listening when it leaves (the tab bar goes with the session)', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).not.toBeNull())
    view.unmount()
    expect(mockSocket.handlers.message ?? []).toHaveLength(0)
    expect(mockEvents._events.order_message_read ?? []).toHaveLength(0)
  })
})

const tree = () => (
  <UnreadMessagesProvider>
    <Badge />
    <MessagesOption
      firstFetch='orders'
      sortParams={{ param: 'last_direct_message_at', direction: 'asc' }}
      paginationSettings={{ page: 1, pageSize: 45, controlType: 'infinity' }}
    />
  </UnreadMessagesProvider>
)
const refresh = (view: any) => act(async () => { view.UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh() })

describe('the list and the session', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockSocket.handlers)) delete mockSocket.handlers[key]
    mockEvents._events = {}
    mockList = [order(1, 2), order(2, 0)]
    mockOrderById = {}
    mockFailures = []
    mockSession = { token: 'token', user: { id: 7, level: 2 } }
    mockApi.accessToken = null
    jest.clearAllMocks()
  })

  it('does not ask before there is a session, and shows the list as loading with nothing counted', async () => {
    mockSession = { token: null, user: null }
    const view = render()
    await act(async () => {})
    expect(mockGetList).not.toHaveBeenCalled()
    expect(known(view)).toBeNull()
    expect(view.queryByText('No tienes permiso.')).toBeNull()
    expect(view.queryByText('Sorry, no results found')).toBeNull()
    expect(mockSocket.join).not.toHaveBeenCalled()
  })

  it('asks once, with the token, when the session becomes available (no 401, no error to recover from)', async () => {
    mockSession = { token: null, user: null }
    const view = render()
    await act(async () => {})
    mockSession = { token: 'fresh', user: { id: 7, level: 2 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(1)
    expect(mockGetList).toHaveBeenCalledWith('fresh')
    expect(view.queryByText('No tienes permiso.')).toBeNull()
    expect(view.getByText(/· Store 1$/)).toBeTruthy()
    expect(mockSocket.join).toHaveBeenCalledWith('messages_orders_7')
  })

  it('puts the session\'s token on the API object before the first request, which the controller does not do itself', async () => {
    mockApi.accessToken = null
    const view = render()
    await waitFor(() => expect(known(view)).not.toBeNull())
    expect(mockGetList).toHaveBeenCalledWith('token')
    expect(view.queryByText('No tienes permiso.')).toBeNull()
  })

  it('shows the error of a first answer, counts nothing, and a refresh asks again and replaces it with the list', async () => {
    mockFailures = [['No tienes permiso.']]
    const view = render()
    await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
    expect(known(view)).toBeNull()
    expect(mockGetList).toHaveBeenCalledTimes(1)

    await refresh(view)
    await waitFor(() => expect(view.queryByText('No tienes permiso.')).toBeNull())
    expect(mockGetList).toHaveBeenCalledTimes(2)
    expect(view.getByText(/· Store 1$/)).toBeTruthy()
    expect(known(view)).toEqual({ total: 2, more: false })
  })

  it('keeps asking while the answers are errors, and recovers on the first good one', async () => {
    mockFailures = [['No tienes permiso.'], ['Network Error']]
    const view = render()
    await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
    await refresh(view)
    await waitFor(() => expect(view.getByText('Network Error')).toBeTruthy())
    expect(view.queryByText('No tienes permiso.')).toBeNull()
    await refresh(view)
    await waitFor(() => expect(view.queryByText('Network Error')).toBeNull())
    expect(view.getByText(/· Store 2$/)).toBeTruthy()
    expect(mockGetList).toHaveBeenCalledTimes(3)
  })

  it('a list that worked and then failed shows the error, counts nothing, and recovers the same way', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    mockFailures = [['Network Error']]
    await refresh(view)
    await waitFor(() => expect(view.getByText('Network Error')).toBeTruthy())
    expect(known(view)).toBeNull()
    await refresh(view)
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(view.queryByText('Network Error')).toBeNull()
  })

  it('asks again, for the new user, when the user changes, and joins the new user\'s rooms', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    mockList = [order(5, 4)]
    mockSession = { token: 'other', user: { id: 8, level: 2 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).toEqual({ total: 4, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(2)
    expect(mockGetList).toHaveBeenLastCalledWith('other')
    expect(mockSocket.join).toHaveBeenCalledWith('messages_orders_8')
    expect(mockSocket.leave).toHaveBeenCalledWith('messages_orders_7')
    expect(view.queryByText(/· Store 1$/)).toBeNull()
    expect(view.getByText(/· Store 5$/)).toBeTruthy()
  })

  it('counts nothing and asks nothing when the session ends, and asks again when one starts', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    mockSession = { token: null, user: null }
    view.rerender(tree())
    expect(known(view)).toBeNull()
    expect(mockGetList).toHaveBeenCalledTimes(1)
    mockSession = { token: 'again', user: { id: 7, level: 2 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(2)
  })
})

describe('nothing of the Messages screen depends on its being visible', () => {
  // The screen is built before its tab opens and is never told it is shown: a rule that ran on focus
  // (a focus effect, marking as read, a sound, an analytics event) would run at launch or never.
  const sources = [
    'src/pages/Messages.tsx',
    'src/ui/src/components/MessagesOption/index.tsx',
    'src/ui/src/components/PreviousMessages/index.tsx',
    'src/ui/src/components/PreviousMessages/FooterMessageComponent.tsx',
    'src/ui/src/components/PreviousMessages/ConversationRow.tsx'
  ]
  const forbidden = /useFocusEffect|useIsFocused|addListener|\breadMessages\b|Sound|analytics|Analytics|Sentry|StatusBar|AppState|Vibration|Keyboard(?!Screen)/

  it.each(sources)('%s has no focus effect, marking as read, sound or analytics', (file) => {
    const text = fs.readFileSync(path.join(__dirname, '../../../../../../', file), 'utf8')
    expect(text).not.toMatch(forbidden)
  })
})
