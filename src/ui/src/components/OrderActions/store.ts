import type { ActionKind, ActionRequest } from './types'

/**
 * The one open request, outside React: `useOrderActions` and `orderActions` write it, `OrderActionsHost` (mounted once
 * by the shell) reads it. A module-level store, not a context, so a sheet opens from the list, the details, the tablet
 * panel or a push handler alike, without a provider between them.
 */
let current: ActionRequest | null = null
let counter = 0
let busy = false
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const getRequest = () => current

/** A sheet's request is on its way: the sheet must not be closed from under it (its answer, or its error, would go unseen). */
export const markBusy = (value: boolean) => { busy = value }
export const isBusy = () => busy

export const openRequest = (kind: ActionKind, order: any, opts: any = {}) => {
  counter += 1
  current = { key: counter, kind, order, opts }
  emit()
}

/** Closes the open request and tells its screen (`onClosed`), once. */
export const closeRequest = () => {
  const closing = current
  if (!closing) return
  current = null
  emit()
  closing.opts?.onClosed?.()
}

/** Replaces the open request without telling its screen it closed: a sheet that leads to another (More → Adjust time). */
export const replaceRequest = (kind: ActionKind, order: any, opts: any = {}) => {
  counter += 1
  current = { key: counter, kind, order, opts }
  emit()
}

/** For tests: forgets whatever is open. */
export const resetRequests = () => {
  current = null
  busy = false
  emit()
}
