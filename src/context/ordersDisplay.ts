import { useSyncExternalStore } from 'react'
import { useTheme } from 'styled-components/native'

import { themeVisible } from '@/theme/helpers'
import { _retrieveStoreData, _setStoreData } from '../ui/src/providers/StoreUtil'

/**
 * How this device shows an order card: its quick actions and the clock time beside the elapsed time. The theme sets
 * the default of each (`orders.quick_actions`, `orders.absolute_time`); the device can change both from Profile →
 * Orders display, and its choice wins over the theme in either direction (the owner's decision, 2026-11-20). The
 * choice lives on the device only, in one storage entry; a key the device never touched follows the theme.
 *
 * A small store outside React (no provider to mount): every reader of `useOrdersDisplay` sees a change at once.
 */
export interface OrdersDisplayChoice {
  /** The card's action buttons; undefined follows the theme. */
  quickActions?: boolean
  /** The clock time beside the elapsed time, for an order that is not a preorder; undefined follows the theme. */
  absoluteTime?: boolean
}

export const ORDERS_DISPLAY_KEY = 'orders_display'

const KEYS: Array<keyof OrdersDisplayChoice> = ['quickActions', 'absoluteTime']

let choice: OrdersDisplayChoice = {}
let asked = false
// What the device changed before the saved choice came: the saved one does not undo it.
const touched = new Set<keyof OrdersDisplayChoice>()
const listeners = new Set<() => void>()

const tell = () => listeners.forEach((listener) => listener())

/** Only the booleans of the two keys: anything else a stored entry holds is dropped. */
export const cleanChoice = (value: unknown): OrdersDisplayChoice => {
  const clean: OrdersDisplayChoice = {}
  if (!value || typeof value !== 'object') return clean
  KEYS.forEach((key) => {
    const own = (value as Record<string, unknown>)[key]
    if (typeof own === 'boolean') clean[key] = own
  })
  return clean
}

// The read of the saved choice, while it is in flight: a save waits for it, so it never writes over a key it has not read yet.
let loading: Promise<void> | null = null

const readSaved = async (): Promise<void> => {
  try {
    const saved = cleanChoice(await _retrieveStoreData(ORDERS_DISPLAY_KEY))
    const next: OrdersDisplayChoice = { ...saved }
    touched.forEach((key) => {
      if (choice[key] === undefined) delete next[key]
      else next[key] = choice[key]
    })
    if (KEYS.some((key) => next[key] !== choice[key])) {
      choice = next
      tell()
    }
  } catch (error) {
    // Nothing saved can be read: the theme decides.
  }
}

/** Reads the device's saved choice once; a failed read leaves the theme's values. */
export const loadOrdersDisplay = (): Promise<void> => {
  asked = true
  loading = readSaved().finally(() => { loading = null })
  return loading
}

/** Sets one or both keys for this device (`undefined` gives a key back to the theme) and saves the choice. */
export const setOrdersDisplay = async (change: OrdersDisplayChoice): Promise<void> => {
  const next: OrdersDisplayChoice = { ...choice }
  KEYS.forEach((key) => {
    if (!(key in change)) return
    touched.add(key)
    if (typeof change[key] === 'boolean') next[key] = change[key]
    else delete next[key]
  })
  choice = next
  tell()
  // Saves what the device holds once the saved choice has been read: a change made before it arrived keeps the other key.
  await loading
  await _setStoreData(ORDERS_DISPLAY_KEY, choice)
}

/** Gives both keys back to the theme. */
export const resetOrdersDisplay = (): Promise<void> => setOrdersDisplay({ quickActions: undefined, absoluteTime: undefined })

/** For tests: the store as a fresh app has it. */
export const forgetOrdersDisplayForTests = () => {
  choice = {}
  asked = false
  loading = null
  touched.clear()
  tell()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (!asked) loadOrdersDisplay()
  return () => { listeners.delete(listener) }
}

const current = () => choice

export interface OrdersDisplay {
  /** What the cards draw: the device's choice, else the theme's. */
  quickActions: boolean
  absoluteTime: boolean
  /** What the theme says, for the settings screen ("Default: on"). */
  themeDefault: { quickActions: boolean, absoluteTime: boolean }
  /** What the device chose; a missing key follows the theme. */
  device: OrdersDisplayChoice
}

/** What an order card shows on this device. Read it once per list and pass it down, not once per card. */
export const useOrdersDisplay = (): OrdersDisplay => {
  const theme: any = useTheme()
  const device = useSyncExternalStore(subscribe, current, current)
  const themeDefault = {
    quickActions: themeVisible(theme, 'orders.quick_actions'),
    absoluteTime: themeVisible(theme, 'orders.absolute_time')
  }
  return {
    quickActions: device.quickActions ?? themeDefault.quickActions,
    absoluteTime: device.absoluteTime ?? themeDefault.absoluteTime,
    themeDefault,
    device
  }
}
