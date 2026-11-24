import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act } from '@testing-library/react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../jest/helpers/themeWithValues'
import { defaultAppTheme } from '../../theme/engine'
import { themeVisible } from '../../theme/helpers'
import {
  ORDERS_DISPLAY_KEY,
  cleanChoice,
  forgetOrdersDisplayForTests,
  loadOrdersDisplay,
  resetOrdersDisplay,
  setOrdersDisplay,
  useOrdersDisplay,
  type OrdersDisplay
} from '../ordersDisplay'

const themeSaying = (values: Record<string, boolean>) => ({
  themeOverrides: themeWithValues((theme) => { Object.entries(values).forEach(([key, value]) => { theme.visibility[key] = value }) })
})

// The tests do not depend on what the compiled theme's defaults are today: they say them (quick actions on, clock time off).
const standard = () => themeSaying({ 'orders.quick_actions': true, 'orders.absolute_time': false })

/** A reader of the store: keeps what it saw last and how many times it drew. */
const mountReader = (options: any = standard()) => {
  const seen: { last?: OrdersDisplay, draws: number } = { draws: 0 }
  const Reader = () => {
    seen.last = useOrdersDisplay()
    seen.draws += 1
    return null
  }
  const result = renderWithProviders(<Reader />, options)
  return { seen, ...result }
}

const stored = async () => JSON.parse((await AsyncStorage.getItem(ORDERS_DISPLAY_KEY)) as string)

describe('ordersDisplay (how this device shows an order card)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    forgetOrdersDisplayForTests()
    jest.restoreAllMocks()
  })

  it('follows the compiled theme\'s own defaults when the device chose nothing', async () => {
    const { seen } = mountReader({})
    await act(async () => {})
    const defaults = { quickActions: themeVisible(defaultAppTheme(), 'orders.quick_actions'), absoluteTime: themeVisible(defaultAppTheme(), 'orders.absolute_time') }
    expect(seen.last).toMatchObject({ ...defaults, themeDefault: defaults, device: {} })
  })

  it('follows the theme\'s defaults when the device chose nothing (quick actions on, clock time off)', async () => {
    const { seen } = mountReader()
    await act(async () => {})
    expect(seen.last).toMatchObject({
      quickActions: true,
      absoluteTime: false,
      themeDefault: { quickActions: true, absoluteTime: false },
      device: {}
    })
  })

  it('follows a theme that sets other defaults', async () => {
    const { seen } = mountReader(themeSaying({ 'orders.quick_actions': false, 'orders.absolute_time': true }))
    await act(async () => {})
    expect(seen.last).toMatchObject({ quickActions: false, absoluteTime: true, themeDefault: { quickActions: false, absoluteTime: true } })
  })

  it('lets the device\'s choice win over the theme, in both directions', async () => {
    const { seen } = mountReader()
    await act(async () => { await setOrdersDisplay({ quickActions: false, absoluteTime: true }) })
    expect(seen.last).toMatchObject({ quickActions: false, absoluteTime: true, device: { quickActions: false, absoluteTime: true } })
    // The theme says the opposite and still loses.
    const other = mountReader(themeSaying({ 'orders.quick_actions': false, 'orders.absolute_time': true }))
    await act(async () => { await setOrdersDisplay({ quickActions: true, absoluteTime: false }) })
    expect(other.seen.last).toMatchObject({ quickActions: true, absoluteTime: false, themeDefault: { quickActions: false, absoluteTime: true } })
  })

  it('changes one key and leaves the other to the theme', async () => {
    const { seen } = mountReader()
    await act(async () => { await setOrdersDisplay({ absoluteTime: true }) })
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: true, device: { absoluteTime: true } })
    expect('quickActions' in (seen.last as OrdersDisplay).device).toBe(false)
  })

  it('gives a key back to the theme with undefined, and both with the reset', async () => {
    const { seen } = mountReader()
    await act(async () => { await setOrdersDisplay({ quickActions: false, absoluteTime: true }) })
    await act(async () => { await setOrdersDisplay({ quickActions: undefined }) })
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: true, device: { absoluteTime: true } })
    expect('quickActions' in (seen.last as OrdersDisplay).device).toBe(false)
    await act(async () => { await setOrdersDisplay({ quickActions: false, absoluteTime: true }) })
    await act(async () => { await resetOrdersDisplay() })
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: false, device: {} })
    expect(await stored()).toEqual({})
  })

  it('keeps the choice on the device', async () => {
    mountReader()
    await act(async () => { await setOrdersDisplay({ quickActions: false }) })
    expect(await stored()).toEqual({ quickActions: false })
    await act(async () => { await setOrdersDisplay({ absoluteTime: true }) })
    expect(await stored()).toEqual({ quickActions: false, absoluteTime: true })
  })

  it('reads the saved choice once and applies it', async () => {
    await AsyncStorage.setItem(ORDERS_DISPLAY_KEY, JSON.stringify({ quickActions: false, absoluteTime: true }))
    const read = jest.spyOn(AsyncStorage, 'getItem')
    const first = mountReader()
    await act(async () => {})
    expect(first.seen.last).toMatchObject({ quickActions: false, absoluteTime: true })
    // Another reader (another screen) does not read the device again.
    const second = mountReader()
    await act(async () => {})
    expect(second.seen.last).toMatchObject({ quickActions: false, absoluteTime: true })
    expect(read.mock.calls.filter(([key]) => key === ORDERS_DISPLAY_KEY)).toHaveLength(1)
  })

  it('does not let the saved choice undo a change made before it arrived', async () => {
    await AsyncStorage.setItem(ORDERS_DISPLAY_KEY, JSON.stringify({ quickActions: false, absoluteTime: true }))
    let release: (value: string | null) => void = () => {}
    const slow = new Promise<string | null>((resolve) => { release = resolve })
    const saved = await AsyncStorage.getItem(ORDERS_DISPLAY_KEY)
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(slow)
    const { seen } = mountReader()
    let change: Promise<void> = Promise.resolve()
    act(() => { change = setOrdersDisplay({ quickActions: true }) })
    expect(seen.last?.quickActions).toBe(true)
    await act(async () => { release(saved); await change })
    // The change stays; the key the device had saved and did not touch arrives.
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: true })
    // And the save did not drop the key it had not read yet.
    expect(await stored()).toEqual({ quickActions: true, absoluteTime: true })
  })

  it('does not bring back a key the device gave back to the theme before the saved choice arrived', async () => {
    await AsyncStorage.setItem(ORDERS_DISPLAY_KEY, JSON.stringify({ quickActions: false }))
    const saved = await AsyncStorage.getItem(ORDERS_DISPLAY_KEY)
    let release: (value: string | null) => void = () => {}
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise<string | null>((resolve) => { release = resolve }))
    const { seen } = mountReader()
    let change: Promise<void> = Promise.resolve()
    act(() => { change = resetOrdersDisplay() })
    await act(async () => { release(saved); await change })
    expect(seen.last).toMatchObject({ quickActions: true, device: {} })
    expect(await stored()).toEqual({})
  })

  it('cleans a stored entry with junk: only the booleans of the two keys stay', async () => {
    await AsyncStorage.setItem(ORDERS_DISPLAY_KEY, JSON.stringify({ quickActions: 'no', absoluteTime: true, other: 1, nested: { quickActions: false } }))
    const { seen } = mountReader()
    await act(async () => {})
    expect(seen.last?.device).toEqual({ absoluteTime: true })
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: true })
  })

  it('cleanChoice drops everything that is not a boolean of the two keys', () => {
    expect(cleanChoice({ quickActions: false, absoluteTime: true })).toEqual({ quickActions: false, absoluteTime: true })
    expect(cleanChoice({ quickActions: 1, absoluteTime: null, extra: true })).toEqual({})
    expect(cleanChoice(null)).toEqual({})
    expect(cleanChoice(undefined)).toEqual({})
    expect(cleanChoice('quickActions')).toEqual({})
    expect(cleanChoice([true, false])).toEqual({})
  })

  it('survives an entry that is not JSON: the theme decides', async () => {
    await AsyncStorage.setItem(ORDERS_DISPLAY_KEY, '{not json')
    const { seen } = mountReader()
    await act(async () => {})
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: false, device: {} })
  })

  it('survives a read that fails: the theme decides', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('storage down'))
    const { seen } = mountReader()
    await act(async () => { await loadOrdersDisplay() })
    expect(seen.last).toMatchObject({ quickActions: true, absoluteTime: false })
  })

  it('tells every reader of a change, and a reader that left hears nothing', async () => {
    const one = mountReader()
    const two = mountReader()
    await act(async () => {})
    await act(async () => { await setOrdersDisplay({ quickActions: false }) })
    expect(one.seen.last?.quickActions).toBe(false)
    expect(two.seen.last?.quickActions).toBe(false)
    one.unmount()
    const drawn = one.seen.draws
    await act(async () => { await setOrdersDisplay({ quickActions: true }) })
    expect(one.seen.draws).toBe(drawn)
    expect(two.seen.last?.quickActions).toBe(true)
  })
})
