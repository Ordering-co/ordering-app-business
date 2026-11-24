import { Vibration } from 'react-native'

import { getAlertSettings } from '../ui/src/components/AlertSettings'
import { isAlertHostMounted } from '../ui/src/components/NewOrderNotification/alertRing'

/**
 * The single buzz of a new order, for when the new-order alert cannot show it: the alert (global, mounted by the signed-in
 * shell) vibrates by itself, in a repeating pattern, while it is open; this one buzz is the fallback when no alert is
 * mounted. It follows the Vibrate setting of Alerts and sound. `shouldVibrate` is for tests.
 */
export async function shouldBuzz (
  isAlertMounted: () => boolean = isAlertHostMounted,
  readSettings: () => Promise<{ vibrate: boolean }> = getAlertSettings
): Promise<boolean> {
  if (isAlertMounted()) return false
  try {
    return (await readSettings()).vibrate !== false
  } catch {
    return true
  }
}

export function subscribeOrdersRegisterVibration (
  socket: { on?: Function, off?: Function } | null | undefined,
  vibrate: () => void = () => Vibration.vibrate(),
  shouldVibrate: () => Promise<boolean> | boolean = () => shouldBuzz()
) {
  if (!socket || typeof socket.on !== 'function') return () => {}

  const onOrdersRegister = async () => {
    if (await shouldVibrate()) vibrate()
  }
  socket.on('orders_register', onOrdersRegister)

  return () => {
    if (typeof socket.off === 'function') {
      socket.off('orders_register', onOrdersRegister)
    }
  }
}
