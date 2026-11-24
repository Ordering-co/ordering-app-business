import React from 'react'
import { Dimensions, Keyboard, ScrollView, TextInput } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { useApi, useConfig } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('react-native-recaptcha-that-works', () => {
  const React = require('react')
  return React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }))
    return null
  })
})

jest.mock('react-native-webview', () => {
  const { View } = require('react-native')
  return { WebView: (props: any) => <View testID='webview' {...props} /> }
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { loginFormDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    LanguageSelector: renderUiController(languageSelectorDefaults),
    LoginForm: renderUiController(loginFormDefaults)
  }
})

import { LoginForm } from '..'
import { useLayout } from '../../../../../theme/platform'

/**
 * IPAD2-B1 / TAB-B1 / T3-B1: the login on a tablet held sideways. The window is short (an iPad Pro 11" is 1194 x 834, a
 * 10" Android tablet 1280 x 800) and the keyboard takes half of it, so what is left over the keys is a strip. The
 * keyboard rule of the app (docs/THEMING.md, "The keyboard"): the focused field and the screen's main button can be
 * brought over the keyboard. The login's "Log in" is inside its scrolling form (not pinned).
 *
 * The numbers are the Android tablet's, measured on the device (docs/theme/verification/fix-round4.md): the strip
 * over the keyboard is 298 dp, the password field is at 255 (48 tall) in the content, "Log in" ends at 409, and the
 * content is 585 tall because the divider, "Email me a login code" and the version line come after the button. The
 * earlier test put the end of the content at the button's end, so the field always stayed in sight at the end of the
 * page; on the device the end of the page (585) is further than the strip can show together with the field, and the
 * scroll stopped at the field.
 */
const WINDOW = { width: 1194, height: 834 }
const KEYBOARD = 420
const ROOM = 298
const FIELD = { y: 255, height: 48 }
const BUTTON_END = 409
const CONTENT = 585

describe('the login in landscape on a tablet: the field and the main button over the keyboard', () => {
  const listeners: Record<string, Array<(event?: any) => void>> = {}

  beforeEach(() => {
    Object.keys(listeners).forEach((key) => delete listeners[key])
    jest.spyOn(Dimensions, 'get').mockImplementation(() => ({ ...WINDOW, scale: 2, fontScale: 1 }))
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: any) => {
      ;(listeners[event] = listeners[event] ?? []).push(listener)
      return { remove: jest.fn() }
    }) as any)
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false)
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }, { setOrdering: jest.fn() }])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })
  afterEach(() => jest.restoreAllMocks())

  it('is a landscape tablet whose login has no pinned button', () => {
    let layout: any
    const Probe = () => { layout = useLayout(); return null }
    const screen = renderWithProviders(<><Probe /><LoginForm /></>, { platform: 'tablet' })
    expect(layout.landscapeTablet).toBe(true)
    // The "Log in" button is inside the scrolling form, so nothing but the scroll can bring it over the keys.
    let inside = false
    for (let up = screen.getByRole('button', { name: 'Log in' }).parent; up; up = up.parent) if (up.type === ScrollView) inside = true
    expect(inside).toBe(true)
  })

  const open = (fieldY: number, content: number) => {
    const screen = renderWithProviders(<LoginForm />, { platform: 'tablet' })
    const scroll = screen.UNSAFE_getByType(ScrollView)
    const host: any = screen.UNSAFE_getByType(ScrollView).instance
    const scrollTo = jest.fn()
    host.scrollTo = scrollTo
    host.getInnerViewRef = () => ({})
    const measureLayout = jest.fn((_node: any, success: any) => success(0, fieldY, 360, FIELD.height))
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({ measureLayout } as any)
    fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: WINDOW.width, height: ROOM } } })
    fireEvent(scroll, 'contentSizeChange', WINDOW.width, content)
    scrollTo.mockClear()
    act(() => (listeners.keyboardDidShow ?? []).forEach((listener) => listener({ endCoordinates: { height: KEYBOARD, screenY: WINDOW.height - KEYBOARD } })))
    return { scroll, scrollTo }
  }

  it('brings the focused password and "Log in" both over the keyboard, with the end of the page further than the strip', () => {
    const { scrollTo } = open(FIELD.y, CONTENT)
    expect(scrollTo).toHaveBeenCalled()
    const { y } = scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0]
    // What the strip shows is [y, y + ROOM]: the field and the end of the button are inside it.
    expect(y).toBeLessThanOrEqual(FIELD.y)
    expect(y + ROOM).toBeGreaterThanOrEqual(FIELD.y + FIELD.height)
    expect(y + ROOM).toBeGreaterThanOrEqual(BUTTON_END)
  })

  it('does not close the keyboard on a drag and keeps a drag of the user (to the button) where the user left it', () => {
    jest.useFakeTimers()
    const { scroll, scrollTo } = open(FIELD.y, CONTENT)
    expect(scroll.props.keyboardDismissMode).toBe('none')
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled')
    // A drag back to the top and the lift of the finger: the field is out of sight now, and that is the user's choice.
    scrollTo.mockClear()
    fireEvent(scroll, 'scrollBeginDrag')
    fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: 0 } } })
    fireEvent(scroll, 'touchEnd')
    act(() => { jest.runAllTimers() })
    expect(scrollTo).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('with the end of the page far out of reach the focused field wins: it stays in sight, the scroll goes no further', () => {
    const { scrollTo } = open(700, 1400)
    const { y } = scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0]
    expect(y).toBeLessThanOrEqual(700)
    expect(y + ROOM).toBeGreaterThanOrEqual(700 + FIELD.height)
  })
})
