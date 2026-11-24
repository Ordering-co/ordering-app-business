import React from 'react'
import { act, render } from '@testing-library/react-native'
import { AppState } from 'react-native'

/** A socket the test drives: `connect` and `disconnect` come when the test says so, as the chip's source does. */
const mockSocket = (() => {
  const handlers: Record<string, Set<() => void>> = {}
  return {
    on: jest.fn((event: string, fn: () => void) => { (handlers[event] ??= new Set()).add(fn) }),
    off: jest.fn((event: string, fn: () => void) => { handlers[event]?.delete(fn) }),
    emit: (event: string) => handlers[event]?.forEach((fn) => fn()),
    count: (event: string) => handlers[event]?.size ?? 0
  }
})()

jest.mock('@components', () => ({ useWebsocket: jest.fn(() => mockSocket) }))

import {
  BACKGROUND_REFETCH_MS,
  FIRST_CONNECT_LATE_MS,
  RECONNECT_SETTLE_MS,
  NETWORK_RETURN_WAIT_MS,
  SocketReconnectProvider,
  useCatchUp,
  useOnReconnect
} from '../SocketReconnectContext'

const Consumer = ({ onReconnect }: { onReconnect: () => void }) => {
  useOnReconnect(onReconnect)
  return null
}

const setup = (onReconnect = jest.fn()) => {
  const view = render(<SocketReconnectProvider><Consumer onReconnect={onReconnect} /></SocketReconnectProvider>)
  return { onReconnect, view }
}

const settle = () => act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS + 10) })

describe('SocketReconnectContext (one place decides the app has to catch up)', () => {
  let appStateHandler: (state: string) => void
  let remove: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    remove = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: any) => {
      appStateHandler = fn
      return { remove }
    }) as any)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('does nothing on the first connect of the socket: the screens load themselves', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
  })

  describe('a first connect that comes after the lists loaded without the socket', () => {
    it('asks once when the first connect follows a failed attempt (the server was down or rejecting)', () => {
      const { onReconnect } = setup()
      act(() => mockSocket.emit('connect_error'))
      act(() => { jest.advanceTimersByTime(2000) })
      act(() => mockSocket.emit('connect_error'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
      act(() => mockSocket.emit('connect'))
      expect(onReconnect).not.toHaveBeenCalled()
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
      // Later connects with no failure in between are not catch-ups.
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('asks once when the first connect comes long after the screens loaded, even without an error', () => {
      const { onReconnect } = setup()
      act(() => { jest.advanceTimersByTime(FIRST_CONNECT_LATE_MS + 1000) })
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('does not ask for a normal connect at launch, about when the lists load', () => {
      const { onReconnect } = setup()
      act(() => { jest.advanceTimersByTime(1500) })
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
    })

    it('shares the debounce with a reconnect: a failed attempt, a connect and a drop is one ask after the last connect', () => {
      const { onReconnect } = setup()
      act(() => mockSocket.emit('connect_error'))
      act(() => mockSocket.emit('connect'))
      act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS / 2) })
      act(() => mockSocket.emit('disconnect'))
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('stops listening to the errors when the navigator leaves', () => {
      const { view } = setup()
      expect(mockSocket.count('connect_error')).toBe(1)
      view.unmount()
      expect(mockSocket.count('connect_error')).toBe(0)
    })
  })

  it('tells the screens once when the socket connects again after having dropped', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('connect'))
    act(() => mockSocket.emit('disconnect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
    act(() => mockSocket.emit('connect'))
    expect(onReconnect).not.toHaveBeenCalled()
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
    // A later connect with no drop in between is not a reconnect.
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('debounces a connection that flaps: one ask for the burst, after it holds', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('connect'))
    for (let i = 0; i < 3; i++) {
      act(() => mockSocket.emit('disconnect'))
      act(() => mockSocket.emit('connect'))
      act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS / 4) })
    }
    expect(onReconnect).not.toHaveBeenCalled()
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('does not tell the screens when the socket drops again before it settled', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    act(() => mockSocket.emit('disconnect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('tells every screen that subscribed, with the latest handler it gave', () => {
    const first = jest.fn()
    const second = jest.fn()
    const view = render(
      <SocketReconnectProvider><Consumer onReconnect={first} /><Consumer onReconnect={second} /></SocketReconnectProvider>
    )
    const latest = jest.fn()
    view.rerender(<SocketReconnectProvider><Consumer onReconnect={latest} /><Consumer onReconnect={second} /></SocketReconnectProvider>)
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops telling a screen that left, and stops listening when the navigator leaves', () => {
    const { onReconnect, view } = setup()
    expect(mockSocket.count('connect')).toBe(1)
    view.unmount()
    expect(mockSocket.count('connect')).toBe(0)
    expect(mockSocket.count('disconnect')).toBe(0)
    expect(remove).toHaveBeenCalled()
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
  })

  describe('the app coming back to the foreground', () => {
    it('asks after more than a short while in the background', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS + 1000) })
      act(() => appStateHandler('active'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('does not ask after a short one (the notification shade, a call)', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS / 3) })
      act(() => appStateHandler('active'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
    })

    it('does not ask for an "inactive" pass (iOS control center), which is not the background', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('inactive'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS * 2) })
      act(() => appStateHandler('active'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
    })

    it('shares the one wait with the reconnect that comes with it: one ask', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => mockSocket.emit('disconnect'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS + 1000) })
      act(() => appStateHandler('active'))
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })
  })

  it('tells nobody anything without a provider', () => {
    const onReconnect = jest.fn()
    render(<Consumer onReconnect={onReconnect} />)
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
  })
})

describe('useCatchUp (the network and the socket are one refresh when they come together)', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  const Screen = ({ online, refresh }: { online: boolean, refresh: () => void }) => {
    useCatchUp({ online, refresh })
    return null
  }
  const mount = (online: boolean) => {
    const refresh = jest.fn()
    const view = render(<SocketReconnectProvider><Screen online={online} refresh={refresh} /></SocketReconnectProvider>)
    const set = (next: boolean) => view.rerender(<SocketReconnectProvider><Screen online={next} refresh={refresh} /></SocketReconnectProvider>)
    return { refresh, set, view }
  }
  const networkWait = () => act(() => { jest.advanceTimersByTime(NETWORK_RETURN_WAIT_MS + 10) })

  it('loads once for a network return and the socket reconnect that comes with it (the network first)', () => {
    const { refresh, set } = mount(false)
    act(() => mockSocket.emit('disconnect'))
    set(true)
    act(() => { jest.advanceTimersByTime(300) })
    act(() => mockSocket.emit('connect'))
    settle()
    networkWait()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('loads once when the socket reconnect comes first and the network flag follows', () => {
    const { refresh, set } = mount(false)
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    // The reconnect is told while the device is still reported offline: nothing yet.
    settle()
    expect(refresh).not.toHaveBeenCalled()
    set(true)
    networkWait()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('loads once for the network alone (the socket never dropped), after the short wait', () => {
    const { refresh, set } = mount(false)
    set(true)
    expect(refresh).not.toHaveBeenCalled()
    networkWait()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('loads once for the socket alone (the network was never reported down), at once after it settles', () => {
    const { refresh } = mount(true)
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(refresh).toHaveBeenCalledTimes(1)
    networkWait()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('loads again for a socket that reconnects after the network load already ran (its gap is another one)', () => {
    const { refresh, set } = mount(false)
    act(() => mockSocket.emit('disconnect'))
    set(true)
    networkWait()
    expect(refresh).toHaveBeenCalledTimes(1)
    act(() => mockSocket.emit('connect'))
    settle()
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('does not load when the network goes away again before the wait is over, nor after unmount', () => {
    const { refresh, set, view } = mount(false)
    set(true)
    set(false)
    networkWait()
    expect(refresh).not.toHaveBeenCalled()
    set(true)
    view.unmount()
    networkWait()
    expect(refresh).not.toHaveBeenCalled()
  })
})
