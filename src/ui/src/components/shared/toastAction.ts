import { useCallback } from 'react'
import { useToast } from '@components'

/**
 * A notice that carries one action ("View order"). The toast's own state (`useToast`) is the logic's and holds a type, a
 * message and a time, nothing else; so the action is kept here, beside it, and the message that goes into the toast
 * carries the number of the action it belongs to. `OToast` draws the action only while the toast on screen is that
 * message: a notice that replaces it, or its end, takes the action with it.
 *
 *   const show = useShowActionToast()
 *   show(ToastType.Success, 'Order #4190 accepted', { text: 'View order', onPress: openOrder }, 5000)
 */
export interface ToastAction {
  /** The action's text. */
  text: string
  /** What it does; the notice hides as it is pressed. */
  onPress: () => void
  testID?: string
}

/** Where a notice shows: at the bottom (every toast's place), or at the top, under the screen's header. */
export type ToastPlacement = 'top' | 'bottom'

const KEY = 'toastActionId'
const PLACEMENT = 'toastPlacement'
let counter = 0
let current: { id: number, action: ToastAction } | null = null

/** The action of the toast whose message is `message`, or nothing: a plain toast, an older one, a notice with none. */
export const toastActionOf = (message: any): ToastAction | undefined => {
  const id = message && typeof message === 'object' ? message[KEY] : undefined
  return current && id === current.id ? current.action : undefined
}

/** Where the toast whose message is `message` shows: the bottom unless it was shown with `'top'`. */
export const toastPlacementOf = (message: any): ToastPlacement =>
  message && typeof message === 'object' && !Array.isArray(message) && message[PLACEMENT] === 'top' ? 'top' : 'bottom'

/** The notice is over (hidden, replaced or its action pressed): its action is forgotten. */
export const clearToastAction = () => { current = null }

/**
 * Shows a notice through the toast's own `showToast`, with its action when it has one. `placement: 'top'` shows it
 * under the screen's header: the place of a notice that comes over a list whose rows carry buttons (it covers none).
 */
export const showActionToast = (
  showToast: ((type: any, message: any, duration?: number) => void) | undefined,
  type: any,
  text: string,
  action: ToastAction | undefined,
  duration?: number,
  placement: ToastPlacement = 'bottom'
) => {
  if (typeof showToast !== 'function') return
  const place = placement === 'top' ? { [PLACEMENT]: 'top' } : null
  if (!action) {
    current = null
    showToast(type, place ? { message: text, ...place } : text, duration)
    return
  }
  counter += 1
  current = { id: counter, action }
  showToast(type, { message: text, [KEY]: counter, ...place }, duration)
}

/** `showActionToast` bound to the app's toast. */
export const useShowActionToast = () => {
  const [, actions] = useToast() as any
  const showToast = actions?.showToast
  return useCallback(
    (type: any, text: string, action: ToastAction | undefined, duration?: number, placement?: ToastPlacement) =>
      showActionToast(showToast, type, text, action, duration, placement),
    [showToast]
  )
}
