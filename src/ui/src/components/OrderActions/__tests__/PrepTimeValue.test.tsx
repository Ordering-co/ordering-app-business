import React from 'react'
import dayjs from 'dayjs'
import { Keyboard } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => require('./mocks').componentsMock())
jest.mock('@/printing/usePrinting', () => require('./mocks').printingMock())
jest.mock('react-native-maps', () => require('./mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))
jest.mock('react-native-map-link', () => ({ getApps: jest.fn(async () => []) }))

import { OrderActionsHost } from '..'
import { orderActions } from '../useOrderActions'
import { getRequest } from '../store'
import { digitsOnly } from '../PrepTimeValue'
import { order, renderHost, resetTestState } from './setup'

const press = async (screen: any, id: string) => { await act(async () => { fireEvent.press(screen.getByTestId(id)) }) }
const type = async (screen: any, id: string, text: string) => { await act(async () => { fireEvent.changeText(screen.getByTestId(id), text) }) }
const submit = async (screen: any, id: string) => { await act(async () => { fireEvent(screen.getByTestId(id), 'submitEditing') }) }
const selected = (screen: any, id: string) => screen.getByTestId(id).props.accessibilityState.selected

describe('digitsOnly', () => {
  it('keeps the digits, at most three', () => {
    expect(digitsOnly('3a7')).toBe('37')
    expect(digitsOnly('-4.5')).toBe('45')
    expect(digitsOnly('12345')).toBe('123')
    expect(digitsOnly('')).toBe('')
  })
})

describe('the preparation time typed in the accept sheet', () => {
  beforeEach(() => resetTestState())

  const open = async (opts: any = {}, platform?: 'phone' | 'tablet') => {
    const { screen } = await renderHost(OrderActionsHost, { platform })
    await act(async () => { orderActions.openAccept(order(), { changeStatus: jest.fn(async () => ({ id: 1053, status: 7 })), ...opts }) })
    return screen
  }

  it('reads as editable: a button of at least 44 points with its spoken label, and no glyph beside the number', async () => {
    const screen = await open()
    const button = screen.getByTestId('prep-minutes-edit')
    expect(button.props.accessibilityRole).toBe('button')
    expect(button.props.accessibilityLabel).toBe('Preparation time, 20 minutes. Tap to type a value')
    const style = [button.props.style].flat(3).filter(Boolean).reduce((all: any, item: any) => ({ ...all, ...item }), {})
    expect(style.minHeight).toBeGreaterThanOrEqual(44)
    expect(screen.queryByTestId('prep-minutes-input')).toBeNull()
  })

  it('has no button of its own while typing: leaving the field ends it, and the stepper buttons sit level with the value', async () => {
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    expect(screen.queryByTestId('prep-minutes-done')).toBeNull()
    await type(screen, 'prep-minutes-input', '37')
    await act(async () => { fireEvent(screen.getByTestId('prep-minutes-input'), 'blur') })
    expect(screen.queryByTestId('prep-minutes-input')).toBeNull()
    expect(screen.getByTestId('prep-minutes').props.children).toBe('37 min')
    // The figure's button is the stepper's line: as tall as the boxes of the minus and the plus.
    const flat = (node: any) => [node.props.style].flat(3).filter(Boolean).reduce((all: any, item: any) => ({ ...all, ...item }), {})
    const line = flat(screen.getByTestId('prep-minutes-edit')).minHeight
    expect(line).toBeGreaterThanOrEqual(44)
    let box = screen.getByTestId('prep-minus').parent
    while (box && flat(box).minHeight === undefined) box = box.parent
    expect(flat(box).minHeight).toBe(line)
  })

  it('opens a numbers field holding the minutes, and sends what was typed', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'prep-minutes-edit')
    const input = screen.getByTestId('prep-minutes-input')
    expect(input.props.keyboardType).toBe('number-pad')
    expect(input.props.value).toBe('20')
    await type(screen, 'prep-minutes-input', '3a7')
    expect(screen.getByTestId('prep-minutes-input').props.value).toBe('37')
    await submit(screen, 'prep-minutes-input')
    expect(screen.queryByTestId('prep-minutes-input')).toBeNull()
    expect(screen.getByTestId('prep-minutes').props.children).toBe('37 min')
    expect(screen.getByText('Accept · 37 min')).toBeTruthy()
    // No preset is 37.
    for (const preset of [10, 15, 20, 30, 45]) expect(selected(screen, `prep-preset-${preset}`)).toBe(false)
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 37, id: 1053 })
  })

  it('says the number while it is typed: the main button and the presets follow it before the field settles', async () => {
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '37')
    expect(screen.getByText('Accept · 37 min')).toBeTruthy()
    expect(selected(screen, 'prep-preset-20')).toBe(false)
    await type(screen, 'prep-minutes-input', '30')
    expect(screen.getByText('Accept · 30 min')).toBeTruthy()
    expect(selected(screen, 'prep-preset-30')).toBe(true)
    // Outside the rule or empty, the button keeps the last settled time: that is what a tap would not send as typed.
    await type(screen, 'prep-minutes-input', '500')
    expect(screen.getByText('Accept · 20 min')).toBeTruthy()
    await type(screen, 'prep-minutes-input', '')
    expect(screen.getByText('Accept · 20 min')).toBeTruthy()
    expect(selected(screen, 'prep-preset-20')).toBe(true)
  })

  it('selects the preset a typed number matches, and the stepper goes on from the typed number', async () => {
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '30')
    await submit(screen, 'prep-minutes-input')
    expect(selected(screen, 'prep-preset-30')).toBe(true)
    expect(selected(screen, 'prep-preset-20')).toBe(false)
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '37')
    // The stepper's tap ends the typing first: 37 + 5.
    await press(screen, 'prep-plus')
    expect(screen.getByText('Accept · 42 min')).toBeTruthy()
    expect(screen.queryByTestId('prep-minutes-input')).toBeNull()
  })

  it('lets a preset win over what is being typed, even the one already chosen', async () => {
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '37')
    await press(screen, 'prep-preset-20')
    expect(screen.queryByTestId('prep-minutes-input')).toBeNull()
    expect(screen.getByText('Accept · 20 min')).toBeTruthy()
  })

  it('restores the previous value when the field is left empty', async () => {
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '')
    await submit(screen, 'prep-minutes-input')
    expect(screen.getByTestId('prep-minutes').props.children).toBe('20 min')
    expect(screen.getByText('Accept · 20 min')).toBeTruthy()
  })

  it('says it while a number is outside 0 to 180 and brings it to the limit when done; a small number is taken as typed', async () => {
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '500')
    expect(screen.getByTestId('prep-minutes-error').props.children).toBe('Enter a time from 0 to 180 minutes')
    await submit(screen, 'prep-minutes-input')
    expect(screen.getByTestId('prep-minutes').props.children).toBe('180 min')
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '2')
    expect(screen.queryByTestId('prep-minutes-error')).toBeNull()
    await submit(screen, 'prep-minutes-input')
    expect(screen.getByTestId('prep-minutes').props.children).toBe('2 min')
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '0')
    expect(screen.queryByTestId('prep-minutes-error')).toBeNull()
    await submit(screen, 'prep-minutes-input')
    expect(screen.getByTestId('prep-minutes').props.children).toBe('0 min')
  })

  it('does not send a number it had to correct: the Accept tap shows the corrected time, the next one sends', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '999')
    await press(screen, 'order-action')
    expect(changeStatus).not.toHaveBeenCalled()
    expect(screen.getByText('Accept · 180 min')).toBeTruthy()
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 180, id: 1053 })
  })

  it('sends a valid number still being typed when Accept is tapped: one tap', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '25')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 25, id: 1053 })
    await waitFor(() => expect(getRequest()).toBeNull())
  })

  it('still accepts in one tap with the preselected time when nothing is typed', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 20, id: 1053 })
  })

  it('ends the typing when the keyboard is put away (Android back, the iPad key)', async () => {
    const handlers: Record<string, any> = {}
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, handler: any) => { handlers[name] = handler; return { remove: jest.fn() } }) as any)
    const screen = await open()
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '33')
    await act(async () => { handlers.keyboardDidHide?.({}) })
    spy.mockRestore()
    expect(screen.queryByTestId('prep-minutes-input')).toBeNull()
    expect(screen.getByText('Accept · 33 min')).toBeTruthy()
  })

  it('is the same on a tablet (the centred dialog)', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus }, 'tablet')
    await press(screen, 'prep-minutes-edit')
    await type(screen, 'prep-minutes-input', '45')
    await submit(screen, 'prep-minutes-input')
    expect(selected(screen, 'prep-preset-45')).toBe(true)
    expect(screen.getByTestId('order-action')).toBeTruthy()
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 45, id: 1053 })
  })
})

describe('the preparation time typed in the adjust-time sheet', () => {
  beforeEach(() => resetTestState())

  const accepted = (extra: any = {}) => order({ status: 7, prepared_in: 20, ...extra })
  const open = async (opts: any, target: any = accepted(), platform?: 'phone' | 'tablet') => {
    const { screen } = await renderHost(OrderActionsHost, { platform })
    await act(async () => { orderActions.openPrepTime(target, opts) })
    return screen
  }

  it('reads as editable, with its spoken label naming the new time', async () => {
    const screen = await open({ changeStatus: jest.fn() })
    const button = screen.getByTestId('prep-new-time-edit')
    expect(button.props.accessibilityRole).toBe('button')
    expect(button.props.accessibilityLabel).toBe('New preparation time, 25 minutes. Tap to type a value')
  })

  it('sends the typed number as the new total, and no adjustment is chosen', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'prep-new-time-edit')
    expect(screen.getByTestId('prep-new-time-input').props.keyboardType).toBe('number-pad')
    expect(screen.getByTestId('prep-new-time-input').props.value).toBe('25')
    await type(screen, 'prep-new-time-input', '37')
    await submit(screen, 'prep-new-time-input')
    expect(screen.getByTestId('prep-new-time').props.children).toBe('37 min')
    for (const value of [-5, 5, 10, 15]) expect(selected(screen, `prep-adjust-${value}`)).toBe(false)
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { prepared_in: 37, id: 1053 })
  })

  it('selects the adjustment a typed number matches, and an adjustment replaces a typed number', async () => {
    const screen = await open({ changeStatus: jest.fn() })
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '30')
    // Before the field settles the adjustments already follow the number: the one opened with is no longer marked.
    expect(selected(screen, 'prep-adjust-10')).toBe(true)
    expect(selected(screen, 'prep-adjust-5')).toBe(false)
    await submit(screen, 'prep-new-time-input')
    expect(selected(screen, 'prep-adjust-10')).toBe(true)
    expect(screen.getByTestId('prep-new-time').props.children).toBe('30 min')
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '41')
    await submit(screen, 'prep-new-time-input')
    expect(selected(screen, 'prep-adjust-10')).toBe(false)
    await press(screen, 'prep-adjust-15')
    expect(screen.getByTestId('prep-new-time').props.children).toBe('35 min')
    expect(selected(screen, 'prep-adjust-15')).toBe(true)
  })

  it('limits what can be typed to after the minutes already gone and to 180', async () => {
    const screen = await open({ changeStatus: jest.fn(), acceptedAt: dayjs().subtract(18, 'minute') })
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '10')
    expect(screen.getByTestId('prep-new-time-error').props.children).toBe('Enter a time from 19 to 180 minutes')
    await submit(screen, 'prep-new-time-input')
    expect(screen.getByTestId('prep-new-time-edit')).toBeTruthy()
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '999')
    await submit(screen, 'prep-new-time-input')
    await press(screen, 'prep-new-time-edit')
    expect(screen.getByTestId('prep-new-time-input').props.value).toBe('180')
  })

  it('does not send a corrected number at once, and restores the value of an empty field', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '700')
    await press(screen, 'order-action')
    expect(changeStatus).not.toHaveBeenCalled()
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '')
    await submit(screen, 'prep-new-time-input')
    expect(screen.getByTestId('prep-new-time').props.children).toBe('180 min')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { prepared_in: 180, id: 1053 })
  })

  it('sends a typed number as the update on a tablet too', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus }, accepted(), 'tablet')
    await press(screen, 'prep-new-time-edit')
    await type(screen, 'prep-new-time-input', '33')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { prepared_in: 33, id: 1053 })
  })
})
