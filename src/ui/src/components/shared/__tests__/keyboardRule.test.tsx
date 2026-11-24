import React from 'react'
import { Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { act, fireEvent, within } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const mockInsets = { top: 62, right: 0, bottom: 34, left: 0 }
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 402, height: 874 })
}))

import { defaultAppTheme } from '../../../../../theme/engine'
import { barBottomSpace } from '../../../../../theme/helpers'
import { revealOffset } from '../../../../../hooks/useRevealFocused'
import { KeyboardScrollView, OBottomBar, OBottomPopup, SheetFooter } from '../index'

/**
 * The app's one keyboard rule (docs/THEMING.md, "The keyboard"): a sheet never passes the top safe area (it scrolls
 * inside), a pinned bar sits its own padding over the keyboard (no system inset under it), and the focused field is
 * scrolled into view.
 */
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()
const { components, tokens } = theme.native
const air = tokens.space.md

// The keyboard as the system reports it: the hooks listen to these events.
const listeners: Record<string, Array<(event?: any) => void>> = {}
const emit = (event: string, height = 336) =>
  act(() => (listeners[event] ?? []).forEach((listener) => listener({ endCoordinates: { height, screenY: 874 - height } })))

beforeEach(() => {
  Object.keys(listeners).forEach((key) => delete listeners[key])
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: any) => {
    ;(listeners[event] = listeners[event] ?? []).push(listener)
    return { remove: jest.fn() }
  }) as any)
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false)
})
afterEach(() => jest.restoreAllMocks())

describe('a pinned bar and the keyboard (IOS-B2)', () => {
  const bar = () => renderWithProviders(<OBottomBar testID='bar' actions={[{ text: 'Save', testID: 'save' }]} />)

  it('keeps the system inset under it while the keyboard is down', () => {
    const view = bar()
    expect(flat(view.getByTestId('bar')).paddingBottom).toBe(components.bottom_bar.base.padding + barBottomSpace(theme, 34))
    expect(barBottomSpace(theme, 34)).toBeGreaterThan(0)
  })

  it('sits its own padding over the keyboard: the inset is the keyboard\'s to cover, not added twice', () => {
    const view = bar()
    emit('keyboardWillShow')
    expect(flat(view.getByTestId('bar')).paddingBottom).toBe(components.bottom_bar.base.padding)
    emit('keyboardWillHide')
    expect(flat(view.getByTestId('bar')).paddingBottom).toBe(components.bottom_bar.base.padding + barBottomSpace(theme, 34))
  })

  it('also when the screen gave its own space under the bar', () => {
    const view = renderWithProviders(<OBottomBar testID='bar' bottomSpace={34} actions={[{ text: 'Save' }]} />)
    emit('keyboardWillShow')
    expect(flat(view.getByTestId('bar')).paddingBottom).toBe(components.bottom_bar.base.padding)
  })
})

describe('a sheet never passes the top safe area (IOS-B1)', () => {
  const sheet = (props: any = {}) => renderWithProviders(
    <OBottomPopup open title='Reject order' closeIcon onClose={jest.fn()} testID='sheet' {...props}>
      <Text>body</Text>
    </OBottomPopup>
  )

  it('stops under the top inset and is no taller than the room it has left', () => {
    const view = sheet({ padded: true, keyboardAware: true })
    expect(flat(view.getByTestId('sheet')).paddingTop).toBe(62)
    let container: any = view.getByTestId('sheet-bottom-space').parent
    while (container && flat(container)?.maxHeight === undefined) container = container.parent
    expect(flat(container).maxHeight).toBe('100%')
  })

  it('a centred sheet (a tablet) keeps the same margin over and under it, clear of the larger inset, and is no taller than that room', () => {
    const view = renderWithProviders(
      <OBottomPopup open title='Options' closeIcon padded onClose={jest.fn()} testID='sheet'><Text>body</Text></OBottomPopup>,
      { platform: 'tablet' }
    )
    const frame = flat(view.getByTestId('sheet-frame'))
    const margin = Math.max(mockInsets.top, mockInsets.bottom) + tokens.space.xl
    // The container holds the top inset; the frame adds what is left of the margin over the sheet, and all of it under.
    expect(flat(view.getByTestId('sheet')).paddingTop + frame.marginTop).toBe(margin)
    expect(frame.marginBottom).toBe(margin)
    expect(frame.justifyContent).toBe('center')
    expect(frame.flex).toBe(1)
    // The dimmed page under the frame still takes the touch that closes the sheet.
    expect(view.getByTestId('sheet-frame').props.pointerEvents).toBe('box-none')
    let card: any = view.getByTestId('sheet-bottom-space').parent
    while (card && flat(card)?.maxHeight === undefined) card = card.parent
    expect(flat(card).maxHeight).toBe('100%')
  })

  it('a docked sheet (a phone) has no margin of its own: it ends at the bottom of its room', () => {
    const frame = flat(sheet({ padded: true }).getByTestId('sheet-frame'))
    expect(frame.justifyContent).toBe('flex-end')
    expect(frame.marginTop).toBeUndefined()
    expect(frame.marginBottom).toBeUndefined()
  })

  it('the room is the same with the keyboard up: the avoiding view takes the keyboard\'s height out of it', () => {
    const view = sheet({ padded: true, keyboardAware: true })
    emit('keyboardWillShow')
    expect(flat(view.getByTestId('sheet')).paddingTop).toBe(62)
    // The body ends where a pinned bar does, and the sheet keeps no system space under it.
    expect(flat(view.getByTestId('sheet-body')).paddingBottom).toBe(components.bottom_bar.base.padding)
    expect(flat(view.getByTestId('sheet-bottom-space')).paddingBottom).toBe(0)
  })

  it('scrolls its body inside, which shrinks to the room (a padded or keyboard-aware sheet)', () => {
    const view = sheet({ padded: true, keyboardAware: true })
    const scroll = view.getByTestId('sheet-scroll')
    expect(flat(scroll).flexShrink).toBe(1)
    expect(view.getByTestId('sheet-body')).toBeTruthy()
    expect(flat(view.getByTestId('sheet-bottom-space')).flexShrink).toBe(1)
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled')
  })

  it('leaves a body that is its own list alone (no scroll nested in a scroll)', () => {
    const view = sheet()
    expect(view.queryByTestId('sheet-scroll')).toBeNull()
    expect(view.getByText('body')).toBeTruthy()
    expect(flat(view.getByTestId('sheet')).paddingTop).toBe(62)
  })

  it('a caller can say whether the body scrolls', () => {
    expect(sheet({ padded: true, scroll: false }).queryByTestId('sheet-scroll')).toBeNull()
    expect(sheet({ scroll: true }).queryByTestId('sheet-scroll')).toBeTruthy()
  })
})

describe('SheetFooter: the action stays pinned under a sheet\'s scrolling body', () => {
  const sheet = (footer = true) => renderWithProviders(
    <OBottomPopup open title='Reject order' closeIcon padded keyboardAware onClose={jest.fn()} testID='sheet'>
      <Text>fields</Text>
      {footer && <SheetFooter><Text testID='action'>Reject</Text></SheetFooter>}
    </OBottomPopup>
  )

  it('is drawn under the scroll, not in it', () => {
    const view = sheet()
    const footer = view.getByTestId('sheet-footer')
    expect(within(footer).getByTestId('action')).toBeTruthy()
    expect(within(view.getByTestId('sheet-scroll')).queryByTestId('action')).toBeNull()
    expect(within(view.getByTestId('sheet-scroll')).getByText('fields')).toBeTruthy()
  })

  it('keeps the sheet\'s side padding and, while the keyboard is up, a pinned bar\'s padding over it', () => {
    const view = sheet()
    expect(flat(view.getByTestId('sheet-footer')).paddingHorizontal).toBe(components.sheet.base.padding)
    expect(flat(view.getByTestId('sheet-footer')).paddingBottom).toBe(components.sheet.base.padding)
    emit('keyboardWillShow')
    expect(flat(view.getByTestId('sheet-footer')).paddingBottom).toBe(components.bottom_bar.base.padding)
    expect(flat(view.getByTestId('sheet-bottom-space')).paddingBottom).toBe(0)
  })

  it('the body ends `md` above the footer; a sheet with none keeps the old end of body', () => {
    expect(flat(sheet().getByTestId('sheet-body')).paddingBottom).toBe(tokens.space.md)
    expect(flat(sheet(false).getByTestId('sheet-body')).paddingBottom).toBe(components.sheet.base.padding)
    expect(sheet(false).queryByTestId('sheet-footer')).toBeNull()
  })

  it('follows what the body renders (the action\'s state), and leaves with the body', () => {
    const Body = ({ label }: { label: string }) => <><Text>fields</Text><SheetFooter><Text testID='action'>{label}</Text></SheetFooter></>
    const view = renderWithProviders(<OBottomPopup open padded keyboardAware onClose={jest.fn()}><Body label='One' /></OBottomPopup>)
    expect(view.getByText('One')).toBeTruthy()
    view.rerender(<OBottomPopup open padded keyboardAware onClose={jest.fn()}><Body label='Two' /></OBottomPopup>)
    expect(view.getByText('Two')).toBeTruthy()
    expect(view.queryByText('One')).toBeNull()
    view.rerender(<OBottomPopup open padded keyboardAware onClose={jest.fn()}><Text>nothing</Text></OBottomPopup>)
    expect(view.queryByTestId('sheet-footer')).toBeNull()
  })

  it('draws where it stands outside a sheet', () => {
    const view = renderWithProviders(<View><SheetFooter><Text>loose</Text></SheetFooter></View>)
    expect(view.getByText('loose')).toBeTruthy()
  })
})

describe('revealOffset: where the scroll goes to show a field', () => {
  const room = 300
  it('stays when the field is in sight', () => {
    expect(revealOffset({ top: 100, bottom: 160, offset: 0, room })).toBeNull()
  })
  it('goes down to the field\'s end when the keyboard hides it', () => {
    expect(revealOffset({ top: 380, bottom: 450, offset: 0, room })).toBe(150)
  })
  it('goes up when the field is above what shows', () => {
    expect(revealOffset({ top: 40, bottom: 100, offset: 200, room })).toBe(40)
  })
  it('never goes above the content', () => {
    expect(revealOffset({ top: -10, bottom: 50, offset: 20, room })).toBe(0)
  })
  it('shows the end of a field taller than the room, where the typing is', () => {
    expect(revealOffset({ top: 50, bottom: 450, offset: 0, room })).toBe(150)
  })
})

describe('revealOffset with the content\'s end: the page\'s main action over the keyboard with the field (IPAD2-B1)', () => {
  const room = 300
  it('goes on to the end of the content when the field stays in sight there', () => {
    // The field is brought to 101 alone; the button under it ends the content at 480: the end is 180, the field (top 315) shows there too.
    expect(revealOffset({ top: 315, bottom: 401, offset: 0, room })).toBe(101)
    expect(revealOffset({ top: 315, bottom: 401, offset: 0, room, end: 480 })).toBe(180)
  })
  it('goes on toward the end as far as the field\'s top stays in sight when the end is further than the strip holds with the field', () => {
    // The Android tablet's login (measured): the strip is 298, the content 585 (the divider, the second button and the
    // version line come after "Log in"), the password's top is 240 with its air: the end (287) would hide the field.
    expect(revealOffset({ top: 240, bottom: 318, offset: 0, room: 298, end: 585 })).toBe(240)
    // A field far above the end: the field first, then as much of what follows as the strip holds.
    expect(revealOffset({ top: 100, bottom: 160, offset: 0, room, end: 800 })).toBe(100)
    expect(revealOffset({ top: 380, bottom: 450, offset: 0, room, end: 800 })).toBe(380)
  })
  it('does not pull back a scroll that is already further (the user\'s own, or the end reached)', () => {
    expect(revealOffset({ top: 240, bottom: 318, offset: 240, room: 298, end: 585 })).toBeNull()
    expect(revealOffset({ top: 315, bottom: 401, offset: 180, room, end: 480 })).toBeNull()
  })
  it('does nothing for a content that fits', () => {
    expect(revealOffset({ top: 100, bottom: 160, offset: 0, room, end: 280 })).toBeNull()
  })
})

describe('KeyboardScrollView brings the focused field into view (IOS-B2, Review)', () => {
  const original = Platform.OS
  afterEach(() => { Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original }) })

  /** A focused field at `y` in the scroll's content, `height` tall; the scroll shows `room`. */
  const setup = (y: number, height: number, room = 300) => {
    const scrollTo = jest.fn()
    const measureLayout = jest.fn((_node: any, success: any) => success(0, y, 300, height))
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({ measureLayout } as any)
    const ref = React.createRef<any>()
    const view = renderWithProviders(
      <KeyboardScrollView ref={ref} testID='scroll'><View /></KeyboardScrollView>
    )
    const scroll: any = view.getByTestId('scroll')
    // The scroll's own methods are native ones: the renderer has none.
    const instance = ref.current
    instance.scrollTo = scrollTo
    instance.getInnerViewRef = () => ({})
    fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: room } } })
    scrollTo.mockClear()
    return { view, scroll, scrollTo, measureLayout }
  }

  it('scrolls to a field the keyboard covers, once the keyboard has shown', () => {
    const { scrollTo } = setup(400, 80)
    emit('keyboardDidShow')
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 400 + 80 + air - 300, animated: true })
  })

  it('does nothing for a field in sight', () => {
    const { scrollTo } = setup(40, 80)
    emit('keyboardDidShow')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('follows the keyboard changing its height, and the room changing under it', () => {
    const { scrollTo, scroll } = setup(400, 80)
    emit('keyboardDidChangeFrame')
    expect(scrollTo).toHaveBeenCalledTimes(1)
    scrollTo.mockClear()
    fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 250 } } })
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 400 + 80 + air - 250, animated: true })
  })

  it('follows what it measures from the scroll\'s own position', () => {
    const { scrollTo, scroll } = setup(400, 80)
    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: 400 + 80 + air - 300 } } })
    emit('keyboardDidShow')
    // The field's end, with its air, is the last thing in sight from that offset: nothing to do.
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('reveals a field tapped while the keyboard is already up (the focus comes after the touch)', () => {
    jest.useFakeTimers()
    const { scrollTo, scroll } = setup(400, 80)
    fireEvent(scroll, 'touchEnd')
    expect(scrollTo).not.toHaveBeenCalled()
    act(() => { jest.runAllTimers() })
    expect(scrollTo).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('with keepEndInSight the page\'s end (its main button) comes over the keyboard with the field', () => {
    const scrollTo = jest.fn()
    // The password at 330 (56 tall), the button under it: the content is 480 tall, the scroll shows what the keyboard leaves: 300.
    const measureLayout = jest.fn((_node: any, success: any) => success(0, 330, 300, 56))
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({ measureLayout } as any)
    const ref = React.createRef<any>()
    const view = renderWithProviders(<KeyboardScrollView ref={ref} testID='scroll' keepEndInSight><View /></KeyboardScrollView>)
    const scroll: any = view.getByTestId('scroll')
    ref.current.scrollTo = scrollTo
    ref.current.getInnerViewRef = () => ({})
    fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 1180, height: 300 } } })
    fireEvent(scroll, 'contentSizeChange', 1180, 480)
    scrollTo.mockClear()
    emit('keyboardDidShow')
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 180, animated: true })
  })

  it('keeps the caller\'s own handlers and props', () => {
    const onLayout = jest.fn()
    const onScroll = jest.fn()
    const view = renderWithProviders(<KeyboardScrollView testID='scroll' onLayout={onLayout} onScroll={onScroll} bounces={false}><View /></KeyboardScrollView>)
    const scroll: any = view.getByTestId('scroll')
    fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 1, height: 2 } } })
    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: 5 } } })
    expect(onLayout).toHaveBeenCalled()
    expect(onScroll).toHaveBeenCalled()
    expect(scroll.props.bounces).toBe(false)
  })

  it('does not move for a keyboard that takes no room (Android\'s floating Gboard)', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    const { scrollTo } = setup(400, 80)
    act(() => (listeners.keyboardDidShow ?? []).forEach((listener) => listener({ endCoordinates: { height: 0, screenY: 874 } })))
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('leaves a field outside the scroll alone (a composer pinned under it)', () => {
    const scrollTo = jest.fn()
    const measureLayout = jest.fn((_node: any, _success: any, failure: any) => failure())
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({ measureLayout } as any)
    const ref = React.createRef<any>()
    const view = renderWithProviders(<KeyboardScrollView ref={ref} testID='scroll'><View /></KeyboardScrollView>)
    ref.current.scrollTo = scrollTo
    ref.current.getInnerViewRef = () => ({})
    fireEvent(view.getByTestId('scroll'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 1, height: 300 } } })
    emit('keyboardDidShow')
    expect(measureLayout).toHaveBeenCalled()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
