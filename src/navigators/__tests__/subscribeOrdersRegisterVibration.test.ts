import { shouldBuzz, subscribeOrdersRegisterVibration } from '../subscribeOrdersRegisterVibration'

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

const flush = () => new Promise((resolve) => setImmediate(resolve))

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

  it('does not stack vibrations after unsubscribe and resubscribe', async () => {
    const socket = createFakeSocket()
    const vibrate = jest.fn()

    const firstUnsubscribe = subscribeOrdersRegisterVibration(socket, vibrate, () => true)
    firstUnsubscribe()
    subscribeOrdersRegisterVibration(socket, vibrate, () => true)

    socket.emit('orders_register')
    await flush()

    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('does not buzz when the rule says no', async () => {
    const socket = createFakeSocket()
    const vibrate = jest.fn()
    subscribeOrdersRegisterVibration(socket, vibrate, () => false)
    socket.emit('orders_register')
    await flush()
    expect(vibrate).not.toHaveBeenCalled()
  })
})

describe('shouldBuzz', () => {
  it('stays quiet while the new-order alert is mounted: it vibrates by itself', async () => {
    const read = jest.fn().mockResolvedValue({ vibrate: true })
    expect(await shouldBuzz(() => true, read)).toBe(false)
    expect(read).not.toHaveBeenCalled()
  })

  it('buzzes once when no alert can show it, and follows the Vibrate setting', async () => {
    expect(await shouldBuzz(() => false, async () => ({ vibrate: true }))).toBe(true)
    expect(await shouldBuzz(() => false, async () => ({ vibrate: false }))).toBe(false)
  })

  it('buzzes when the settings cannot be read', async () => {
    expect(await shouldBuzz(() => false, async () => { throw new Error('storage') })).toBe(true)
  })
})
