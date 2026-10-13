import { subscribeOrdersRegisterVibration } from '../subscribeOrdersRegisterVibration'

function createFakeSocket () {
  const listeners: Record<string, Array<() => void>> = {}

  return {
    on (event: string, fn: () => void) {
      listeners[event] = listeners[event] || []
      listeners[event].push(fn)
    },
    off (event: string, fn: () => void) {
      listeners[event] = (listeners[event] || []).filter((listener) => listener !== fn)
    },
    emit (event: string) {
      ;(listeners[event] || []).forEach((fn) => fn())
    }
  }
}

describe('subscribeOrdersRegisterVibration', () => {
  it('passes the same listener to socket.on and socket.off', () => {
    const socket = {
      on: jest.fn(),
      off: jest.fn()
    }

    const unsubscribe = subscribeOrdersRegisterVibration(socket)
    unsubscribe()

    expect(socket.on).toHaveBeenCalledWith('orders_register', expect.any(Function))
    expect(socket.off).toHaveBeenCalledWith('orders_register', socket.on.mock.calls[0][1])
  })

  it('does not stack vibrations after unsubscribe and resubscribe', () => {
    const socket = createFakeSocket()
    const vibrate = jest.fn()

    const firstUnsubscribe = subscribeOrdersRegisterVibration(socket, vibrate)
    firstUnsubscribe()
    subscribeOrdersRegisterVibration(socket, vibrate)

    socket.emit('orders_register')

    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
