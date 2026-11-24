import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { ORDERS_DISPLAY_KEY, forgetOrdersDisplayForTests, setOrdersDisplay } from '@/context/ordersDisplay'
import { OrdersDisplaySettings } from '..'

// The tests say the theme's defaults themselves (quick actions on, clock time off): they do not follow the compiled theme.
const standard = () => ({ themeOverrides: themeWithValues((values) => { values.visibility['orders.quick_actions'] = true; values.visibility['orders.absolute_time'] = false }) })

const open = async (options: any = standard(), navigation: any = { canGoBack: () => true, goBack: jest.fn() }) => {
  const result = renderWithProviders(<OrdersDisplaySettings navigation={navigation} />, options)
  await act(async () => {})
  return { ...result, navigation }
}

const on = (node: any) => node.props.accessibilityState.checked

describe('Orders display (the settings screen)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    forgetOrdersDisplayForTests()
  })

  it('shows the two settings with their texts and the theme\'s defaults: quick actions on, clock time off', async () => {
    const { getByText, getByTestId, queryByTestId } = await open()
    expect(getByText('Orders display')).toBeTruthy()
    expect(getByText('Quick actions')).toBeTruthy()
    expect(getByText('Clock time')).toBeTruthy()
    expect(getByText('Show Accept, Reject and the other buttons on each order card. Off, a card only opens the order.')).toBeTruthy()
    expect(getByText(/Show the clock time beside the elapsed time/)).toBeTruthy()
    expect(on(getByTestId('orders-display-quick-actions-switch'))).toBe(true)
    expect(on(getByTestId('orders-display-clock-time-switch'))).toBe(false)
    // Nothing changed: no "Default" line and no reset.
    expect(queryByTestId('orders-display-quick-actions-default')).toBeNull()
    expect(queryByTestId('orders-display-clock-time-default')).toBeNull()
    expect(queryByTestId('orders-display-reset')).toBeNull()
  })

  it('labels each switch for a screen reader, with its state', async () => {
    const { getByTestId } = await open()
    const quick = getByTestId('orders-display-quick-actions-switch')
    expect(quick.props.accessibilityRole).toBe('switch')
    expect(quick.props.accessibilityLabel).toBe('Quick actions')
    expect(getByTestId('orders-display-clock-time-switch').props.accessibilityLabel).toBe('Clock time')
  })

  it('writes a change at once (no Save), keeps it and says what the default is', async () => {
    const { getByTestId } = await open()
    await act(async () => { fireEvent.press(getByTestId('orders-display-quick-actions-switch')) })
    expect(on(getByTestId('orders-display-quick-actions-switch'))).toBe(false)
    expect(getByTestId('orders-display-quick-actions-default').props.children).toBe('Default: on')
    expect(JSON.parse((await AsyncStorage.getItem(ORDERS_DISPLAY_KEY)) as string)).toEqual({ quickActions: false })

    await act(async () => { fireEvent.press(getByTestId('orders-display-clock-time-switch')) })
    expect(on(getByTestId('orders-display-clock-time-switch'))).toBe(true)
    expect(getByTestId('orders-display-clock-time-default').props.children).toBe('Default: off')
    expect(JSON.parse((await AsyncStorage.getItem(ORDERS_DISPLAY_KEY)) as string)).toEqual({ quickActions: false, absoluteTime: true })
  })

  it('reflects a choice the device already made', async () => {
    await setOrdersDisplay({ absoluteTime: true })
    const { getByTestId, queryByTestId } = await open()
    expect(on(getByTestId('orders-display-clock-time-switch'))).toBe(true)
    expect(getByTestId('orders-display-clock-time-default').props.children).toBe('Default: off')
    expect(queryByTestId('orders-display-quick-actions-default')).toBeNull()
    expect(getByTestId('orders-display-reset')).toBeTruthy()
  })

  it('says the theme\'s default in a changed row ("Default: off" when the theme turns the quick actions off)', async () => {
    const options = { themeOverrides: themeWithValues((values) => { values.visibility['orders.quick_actions'] = false }) }
    const { getByTestId } = await open(options)
    expect(on(getByTestId('orders-display-quick-actions-switch'))).toBe(false)
    await act(async () => { fireEvent.press(getByTestId('orders-display-quick-actions-switch')) })
    expect(on(getByTestId('orders-display-quick-actions-switch'))).toBe(true)
    expect(getByTestId('orders-display-quick-actions-default').props.children).toBe('Default: off')
  })

  it('gives both back to the theme with "Use the app\'s defaults", which then goes away', async () => {
    await setOrdersDisplay({ quickActions: false, absoluteTime: true })
    const { getByTestId, getByText, queryByTestId } = await open()
    expect(getByText('Use the app\'s defaults')).toBeTruthy()
    await act(async () => { fireEvent.press(getByTestId('orders-display-reset')) })
    expect(on(getByTestId('orders-display-quick-actions-switch'))).toBe(true)
    expect(on(getByTestId('orders-display-clock-time-switch'))).toBe(false)
    expect(queryByTestId('orders-display-reset')).toBeNull()
    expect(queryByTestId('orders-display-quick-actions-default')).toBeNull()
    expect(JSON.parse((await AsyncStorage.getItem(ORDERS_DISPLAY_KEY)) as string)).toEqual({})
  })

  it('goes back from the header', async () => {
    const { getByLabelText, navigation } = await open()
    fireEvent.press(getByLabelText(/back/i))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it.each(['phone', 'tablet'] as const)('draws the same screen on a %s', async (platform) => {
    const { getByTestId } = await open({ ...standard(), platform })
    fireEvent.press(getByTestId('orders-display-clock-time-switch'))
    await act(async () => {})
    expect(on(getByTestId('orders-display-clock-time-switch'))).toBe(true)
    expect(getByTestId('orders-display-reset')).toBeTruthy()
  })
})
