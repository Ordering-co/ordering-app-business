import { Vibration } from 'react-native'

export function subscribeOrdersRegisterVibration (
  socket: { on?: Function, off?: Function } | null | undefined,
  vibrate: () => void = () => Vibration.vibrate()
) {
  if (!socket || typeof socket.on !== 'function') return () => {}

  const onOrdersRegister = () => vibrate()
  socket.on('orders_register', onOrdersRegister)

  return () => {
    if (typeof socket.off === 'function') {
      socket.off('orders_register', onOrdersRegister)
    }
  }
}
