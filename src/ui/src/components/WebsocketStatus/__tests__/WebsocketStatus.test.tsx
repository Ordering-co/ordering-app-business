import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import RNRestart from 'react-native-restart'

const mockEmitter = () => {
  const listeners: Record<string, Function[]> = {}
  return {
    on: (name: string, fn: Function) => { listeners[name] = [...(listeners[name] ?? []), fn] },
    off: (name: string, fn: Function) => { listeners[name] = (listeners[name] ?? []).filter((other) => other !== fn) },
    emit: (name: string, value?: any) => (listeners[name] ?? []).forEach((fn) => fn(value)),
    count: (name: string) => (listeners[name] ?? []).length
  }
}
const mockSocket: any = {
  status: 1,
  date: new Date(2026, 10, 19, 12, 31),
  io: { connected: true, disconnect: jest.fn() },
  connect: jest.fn(),
  events: mockEmitter(),
  // The socket manager the app gets from `useWebsocket()`: one object, with `on` / `off` that hold a subscription for the socket to come.
  io_events: mockEmitter(),
  // What a controller that reports the last connect error adds to its props (nothing: today's submodule).
  reported: {} as Record<string, any>,
  manager: null as any
}
mockSocket.manager = {
  get socket () { return mockSocket.io },
  connect: (...args: any[]) => mockSocket.connect(...args),
  on: (name: string, fn: Function) => mockSocket.io_events.on(name, fn),
  off: (name: string, fn: Function) => mockSocket.io_events.off(name, fn)
}
const mockPrinting: any = { printers: [], resultOf: jest.fn(() => undefined) }
const mockPermission: any = { status: 'granted' }

jest.mock('@components', () => {
  const React = require('react')
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    WebsocketStatus: ({ UIComponent, ...props }: any) => <UIComponent {...props} socketStatus={mockSocket.status} connectedDate={mockSocket.date} {...mockSocket.reported} />,
    useWebsocket: () => mockSocket.manager,
    useEvent: () => [mockSocket.events],
    useUtils: () => [{ timeFormat: 'HH:mm' }, {}]
  }
})
jest.mock('@/printing', () => ({ usePrinting: () => mockPrinting }))
jest.mock('react-native-permissions', () => ({ checkNotifications: () => Promise.resolve({ status: mockPermission.status }) }))

import { WebsocketStatus, ConnectionHost, closeConnectionSheet } from '..'
import { markConnectionUpdate, resetConnectionStore } from '../connectionStore'
import { renderHook } from '@testing-library/react-native'
import { connectionStateOf, serverStateOf, useSettledConnection, SOCKET_GRACE_MS } from '../connectionState'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const view = async (net: boolean | null = true, options: Record<string, any> = {}) => {
  const screen = renderWithProviders(
    <OfflineActionsContext.Provider value={[{ isNetConnected: net, canSaveChangesOffline: false, actions: {}, orders: null }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
      <WebsocketStatus />
      <ConnectionHost />
    </OfflineActionsContext.Provider>,
    options
  )
  await act(async () => { await Promise.resolve() })
  return screen
}

/** Taps the pill: the sheet opens and reads the phone's notification permission. */
const openSheet = async (getByTestId: (id: string) => any) => {
  fireEvent.press(getByTestId('connection-pill'))
  await act(async () => { await Promise.resolve() })
}

describe('connection state', () => {
  it('tells the device being offline from the socket being down', () => {
    expect(connectionStateOf({ isNetConnected: true, socketStatus: 1 })).toBe('live')
    expect(connectionStateOf({ isNetConnected: true, socketStatus: 2 })).toBe('reconnecting')
    expect(connectionStateOf({ isNetConnected: true, socketStatus: 0 })).toBe('reconnecting')
    expect(connectionStateOf({ isNetConnected: false, socketStatus: 1 })).toBe('offline')
    // A network that is not known yet is not an offline device.
    expect(connectionStateOf({ isNetConnected: null, socketStatus: 1 })).toBe('live')
    expect(serverStateOf(1)).toBe('connected')
    expect(serverStateOf(0)).toBe('connecting')
    expect(serverStateOf(2)).toBe('disconnected')
  })
})

describe('useSettledConnection (the pill does not flicker)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('keeps Live through a socket that drops and comes back inside the grace', () => {
    const { result, rerender } = renderHook(({ state }: any) => useSettledConnection(state), { initialProps: { state: 'live' } })
    rerender({ state: 'reconnecting' })
    act(() => { jest.advanceTimersByTime(SOCKET_GRACE_MS - 500) })
    expect(result.current).toBe('live')
    rerender({ state: 'live' })
    act(() => { jest.advanceTimersByTime(SOCKET_GRACE_MS * 2) })
    expect(result.current).toBe('live')
  })

  it('says Reconnecting when the socket stays down past the grace', () => {
    const { result, rerender } = renderHook(({ state }: any) => useSettledConnection(state), { initialProps: { state: 'live' } })
    rerender({ state: 'reconnecting' })
    act(() => { jest.advanceTimersByTime(SOCKET_GRACE_MS + 10) })
    expect(result.current).toBe('reconnecting')
  })

  it('shows a lost network and every recovery at once, and the first reading as it is', () => {
    expect(renderHook(() => useSettledConnection('reconnecting')).result.current).toBe('reconnecting')
    const { result, rerender } = renderHook(({ state }: any) => useSettledConnection(state), { initialProps: { state: 'live' } })
    rerender({ state: 'offline' })
    expect(result.current).toBe('offline')
    rerender({ state: 'live' })
    expect(result.current).toBe('live')
    rerender({ state: 'reconnecting' })
    rerender({ state: 'offline' })
    expect(result.current).toBe('offline')
  })
})

describe('WebsocketStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetConnectionStore()
    mockSocket.status = 1
    mockSocket.io = { connected: true, disconnect: jest.fn() }
    mockSocket.events = mockEmitter()
    mockSocket.io_events = mockEmitter()
    mockSocket.reported = {}
    mockPrinting.printers = []
    mockPrinting.resultOf = jest.fn(() => undefined)
    mockPermission.status = 'granted'
  })

  it('writes the state on the pill with a dot, never by color alone', async () => {
    const { getByText, getByTestId } = await view()
    expect(getByText('Live')).toBeTruthy()
    expect(getByTestId('connection-status-dot')).toBeTruthy()
    expect(getByTestId('connection-pill').props.accessibilityLabel).toBe('Connection: Live')
  })

  it('says Reconnecting while the socket is down or connecting, and Offline when the device has no network', async () => {
    mockSocket.status = 2
    const down = await view()
    expect(down.getByText('Reconnecting')).toBeTruthy()
    down.unmount()

    mockSocket.status = 0
    const connecting = await view()
    expect(connecting.getByText('Reconnecting')).toBeTruthy()
    connecting.unmount()

    mockSocket.status = 1
    const offline = await view(false)
    expect(offline.getByText('Offline')).toBeTruthy()
    expect(offline.queryByText('Live')).toBeNull()
  })

  it('is as wide as the text of its state, up to the theme\'s maximum: no hidden copies of the other states hold it wider', async () => {
    const screen = await view(true)
    const { getByTestId, getAllByText } = screen
    const flat = (node: any) => require('react-native').StyleSheet.flatten(node.props.style)
    const badge = flat(getByTestId('connection-status'))
    // Its own content gives the width (not stretched to a sizer), and the theme caps it: a longer text ends in an ellipsis.
    expect(badge.alignSelf).toBe('center')
    expect(badge.maxWidth).toBe(require('../../../../../theme.compiled.json').values.components.header.base.status_max_width.$value)
    expect(badge.maxWidth).toBeGreaterThan(0)
    expect(getAllByText('Live', { includeHiddenElements: true })).toHaveLength(1)
    for (const word of ['Reconnecting', 'Offline']) {
      expect(screen.queryAllByText(word, { includeHiddenElements: true })).toHaveLength(0)
    }
  })

  it('draws no pill when the theme hides the connection status', async () => {
    const theme = themeWithValues((values) => { values.visibility.connection_status = false })
    const { queryByTestId } = await view(true, { themeOverrides: theme as any })
    expect(queryByTestId('connection-pill')).toBeNull()
  })

  it('opens the sheet with the state named, when the last update came, the server and the notifications', async () => {
    const { getByTestId, getByText, queryByTestId } = await view()
    expect(queryByTestId('connection-sheet')).toBeNull()
    await openSheet(getByTestId)
    expect(getByTestId('connection-sheet')).toBeTruthy()
    expect(getByTestId('connection-state')).toHaveTextContent('Live')
    expect(getByTestId('connection-description')).toHaveTextContent('Orders update in real time. Last update 12:31.')
    expect(getByTestId('connection-server')).toHaveTextContent('Connected')
    expect(getByTestId('connection-notifications')).toHaveTextContent('On')
    expect(getByText('If orders stop arriving, check your Wi-Fi or mobile data.')).toBeTruthy()
    // No printer saved: no printer line.
    expect(queryByTestId('connection-row-printer')).toBeNull()
  })

  it('the last update is the newest of the connection and the last order event', async () => {
    const { getByTestId } = await view()
    act(() => markConnectionUpdate(new Date(2026, 10, 19, 12, 45).getTime()))
    await openSheet(getByTestId)
    expect(getByTestId('connection-description')).toHaveTextContent(/Last update 12:45\./)
    // An order event moves it.
    act(() => markConnectionUpdate(new Date(2026, 10, 19, 12, 50).getTime()))
    expect(getByTestId('connection-description')).toHaveTextContent(/Last update 12:50\./)
  })

  it('tells a socket that is down from a device without network in the sheet', async () => {
    mockSocket.status = 2
    const down = await view(true)
    await openSheet(down.getByTestId)
    expect(down.getByTestId('connection-state')).toHaveTextContent('Reconnecting')
    expect(down.getByTestId('connection-description')).toHaveTextContent(/Lost the connection to the server/)
    expect(down.getByTestId('connection-server')).toHaveTextContent('Disconnected')
    down.unmount()

    const offline = await view(false)
    await openSheet(offline.getByTestId)
    expect(offline.getByTestId('connection-state')).toHaveTextContent('Offline')
    expect(offline.getByTestId('connection-description')).toHaveTextContent(/No internet connection/)
  })

  describe('why the socket is not connected', () => {
    const REJECTED = /^The server did not accept this session\. Sign in again if it does not reconnect\./
    const LOST = /^Lost the connection to the server\. Trying to reconnect\./

    it('says the session was not accepted when the server rejects it (an authentication error), the pill staying as it is', async () => {
      for (const message of ['invalid signature', 'jwt malformed', 'Token expired.', 'Project development not valid (cache).']) {
        mockSocket.status = 2
        const screen = await view(true)
        act(() => { mockSocket.io_events.emit('connect_error', new Error(message)) })
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(REJECTED)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(/Last update 12:31\./)
        // The state, its words and the pill do not change.
        expect(screen.getByTestId('connection-state')).toHaveTextContent('Reconnecting')
        expect(screen.getByTestId('connection-pill').props.accessibilityLabel).toBe('Connection: Reconnecting')
        screen.unmount()
        closeConnectionSheet()
      }
    })

    it('keeps the lost-connection words for a network error', async () => {
      mockSocket.status = 2
      const screen = await view(true)
      for (const message of ['xhr poll error', 'websocket error', 'timeout']) {
        act(() => { mockSocket.io_events.emit('connect_error', new Error(message)) })
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(LOST)
        expect(screen.getByTestId('connection-description')).not.toHaveTextContent(REJECTED)
      }
    })

    it('forgets the error once the socket connects, and the next failure is read again', async () => {
      mockSocket.status = 2
      const screen = await view(true)
      act(() => { mockSocket.io_events.emit('connect_error', new Error('jwt malformed')) })
      await openSheet(screen.getByTestId)
      expect(screen.getByTestId('connection-description')).toHaveTextContent(REJECTED)
      act(() => { mockSocket.io_events.emit('connect') })
      // The socket drops again, with no new error: it is a lost connection, not a rejection.
      expect(screen.getByTestId('connection-description')).toHaveTextContent(LOST)
      act(() => { mockSocket.io_events.emit('connect_error', new Error('xhr poll error')) })
      expect(screen.getByTestId('connection-description')).toHaveTextContent(LOST)
    })

    it('a device without network says so, whatever the last error was', async () => {
      const screen = await view(false)
      act(() => { mockSocket.io_events.emit('connect_error', new Error('jwt malformed')) })
      await openSheet(screen.getByTestId)
      expect(screen.getByTestId('connection-description')).toHaveTextContent(/No internet connection/)
    })

    describe('a controller that reports the error (the connectError props)', () => {
      it('says the session was not accepted from the props, and does not listen to the socket itself', async () => {
        mockSocket.status = 2
        mockSocket.reported = { connectError: 'something the app would not classify', connectErrorIsAuth: true }
        const screen = await view(true)
        expect(mockSocket.io_events.count('connect_error')).toBe(0)
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(REJECTED)
        expect(screen.getByTestId('connection-pill').props.accessibilityLabel).toBe('Connection: Reconnecting')
      })

      it('keeps the lost-connection words for a network error, whatever the socket emits, and for no error', async () => {
        mockSocket.status = 2
        mockSocket.reported = { connectError: 'websocket error', connectErrorIsAuth: false }
        const screen = await view(true)
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(LOST)
        // The props rule: the socket's own events are not read (a rejection the socket emits changes nothing here).
        act(() => { mockSocket.io_events.emit('connect_error', new Error('jwt malformed')) })
        expect(screen.getByTestId('connection-description')).toHaveTextContent(LOST)
        screen.unmount()
        closeConnectionSheet()

        mockSocket.reported = { connectError: null, connectErrorIsAuth: false }
        const none = await view(true)
        await openSheet(none.getByTestId)
        expect(none.getByTestId('connection-description')).toHaveTextContent(LOST)
      })

      it('says the session was not accepted for a rejection the controller reports without its flag set: the flag is only the socket\'s own narrow rule', async () => {
        mockSocket.status = 2
        mockSocket.reported = { connectError: 'Project development not valid (cache).', connectErrorIsAuth: false }
        const screen = await view(true)
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).not.toHaveTextContent(LOST)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(/did not accept this session/)
      })

      it('reads the message itself when the controller gives the error without the flag', async () => {
        mockSocket.status = 2
        mockSocket.reported = { connectError: 'Token expired.' }
        const screen = await view(true)
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(REJECTED)
      })

      it('goes back to the lost-connection words when the controller clears the error', async () => {
        mockSocket.status = 2
        mockSocket.reported = { connectError: 'jwt malformed', connectErrorIsAuth: true }
        const screen = await view(true)
        await openSheet(screen.getByTestId)
        expect(screen.getByTestId('connection-description')).toHaveTextContent(REJECTED)
        screen.unmount()
        closeConnectionSheet()
        mockSocket.reported = { connectError: null, connectErrorIsAuth: false }
        const cleared = await view(true)
        await openSheet(cleared.getByTestId)
        expect(cleared.getByTestId('connection-description')).toHaveTextContent(LOST)
      })
    })

    it('listens once while the sheet is hosted, and stops when it goes away', async () => {
      const screen = await view(true)
      expect(mockSocket.io_events.count('connect_error')).toBe(1)
      expect(mockSocket.io_events.count('connect')).toBe(1)
      screen.unmount()
      expect(mockSocket.io_events.count('connect_error')).toBe(0)
      expect(mockSocket.io_events.count('connect')).toBe(0)
    })
  })

  it('names the printer and how its last ticket went', async () => {
    mockPrinting.printers = [{ nickname: 'Kitchen' }]
    mockPrinting.resultOf = jest.fn(() => ({ ok: true, at: 1 }))
    const ok = await view()
    await openSheet(ok.getByTestId)
    expect(ok.getByText('Printer · Kitchen')).toBeTruthy()
    expect(ok.getByTestId('connection-printer')).toHaveTextContent('Ready')
    ok.unmount()
    closeConnectionSheet()

    mockPrinting.printers = [{ nickname: 'Kitchen' }, { nickname: 'Bar' }]
    mockPrinting.resultOf = jest.fn(() => ({ ok: false, at: new Date(2026, 10, 19, 12, 14).getTime() }))
    const failed = await view()
    await openSheet(failed.getByTestId)
    expect(failed.getByText('Printer · Kitchen and 1 more')).toBeTruthy()
    expect(failed.getByTestId('connection-printer')).toHaveTextContent('Offline')
    expect(failed.getByText('The last ticket failed at 12:14.')).toBeTruthy()
  })

  it('says the notifications are off when the phone does not allow them', async () => {
    mockPermission.status = 'denied'
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    expect(getByTestId('connection-notifications')).toHaveTextContent('Off')
  })

  it('Reconnect now reconnects the socket without restarting the app', async () => {
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    fireEvent.press(getByTestId('connection-reconnect'))
    // A socket that thinks it is connected is dropped first, then connected: the catch-up of the lists runs on that `connect`.
    expect(mockSocket.io.disconnect).toHaveBeenCalledTimes(1)
    expect(mockSocket.connect).toHaveBeenCalledTimes(1)
    expect(mockSocket.io.disconnect.mock.invocationCallOrder[0]).toBeLessThan(mockSocket.connect.mock.invocationCallOrder[0])
    expect(RNRestart.restart).not.toHaveBeenCalled()
  })

  it('Reconnect now only connects a socket that is already down', async () => {
    mockSocket.status = 2
    mockSocket.io = { connected: false, disconnect: jest.fn() }
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    fireEvent.press(getByTestId('connection-reconnect'))
    expect(mockSocket.io.disconnect).not.toHaveBeenCalled()
    expect(mockSocket.connect).toHaveBeenCalledTimes(1)
  })

  it('closes with its close button', async () => {
    const { getByTestId, queryByTestId, getByLabelText } = await view()
    await openSheet(getByTestId)
    fireEvent.press(getByLabelText('Close'))
    expect(queryByTestId('connection-sheet')).toBeNull()
  })

  it('marks the last update on every order event the list hears', async () => {
    const { getByTestId } = await view()
    act(() => { mockSocket.events.emit('order_added', { id: 1 }) })
    await openSheet(getByTestId)
    // The mark is "now": newer than the connection of 12:31.
    expect(getByTestId('connection-description')).not.toHaveTextContent(/Last update 12:31\./)
  })
})
