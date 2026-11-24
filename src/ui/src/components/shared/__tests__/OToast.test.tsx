import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { ToastType, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import { Toast } from '../OToast'
import { showActionToast } from '../toastAction'
import { BottomBarProvider, useReportBottomBar } from '../../../../../context/BottomBarContext'
import { defaultAppTheme } from '../../../../../theme/engine'
import { Keyboard, Platform, StyleSheet } from 'react-native'

setupSharedComponentHooks()

describe('OToast', () => {
  it('renders success toast and hides after duration', () => {
    jest.useFakeTimers()
    const hideToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([
      { type: ToastType.Success, message: 'Saved', duration: 300 },
      { hideToast }
    ])

    const { getByText } = renderWithProviders(<Toast />)
    expect(getByText('Saved')).toBeTruthy()

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(hideToast).toHaveBeenCalled()
  })

  it('returns null without toast config', () => {
    ;(useToast as jest.Mock).mockReturnValue([null, { hideToast: jest.fn() }])
    const { toJSON } = renderWithProviders(<Toast />)
    expect(toJSON()).toBeNull()
  })

  describe('a toast never shows without a message', () => {
    const show = (type: string, message: any) => {
      ;(useToast as jest.Mock).mockReturnValue([{ type, message, duration: 3000 }, { hideToast: jest.fn() }])
      return renderWithProviders(<Toast />)
    }

    it('words an error the API sent as a list, as { message } or as a code (an assign request that fails)', () => {
      expect(show(ToastType.Error, ['Order not available']).getByText('Order not available')).toBeTruthy()
      expect(show(ToastType.Error, [{ message: 'Too late' }]).getByText('Too late')).toBeTruthy()
      expect(show(ToastType.Error, 'ERROR_INVALID_COUPON').getByText("The coupon doesn't exist")).toBeTruthy()
    })

    it('says the generic failure when an error has no message, never an empty box, "undefined" or a raw array', () => {
      for (const message of [undefined, null, '', [], [''], {}, 'undefined', ['null'], false]) {
        const screen = show(ToastType.Error, message)
        expect(screen.getByText('Network Error')).toBeTruthy()
        expect(screen.queryByText('undefined')).toBeNull()
      }
    })

    it('draws nothing for an info or success toast with no message', () => {
      for (const type of [ToastType.Info, ToastType.Success]) {
        for (const message of [undefined, null, '', [], {}]) {
          expect(show(type, message).toJSON()).toBeNull()
        }
      }
    })

    it('decodes the HTML entities of an API message', () => {
      expect(show(ToastType.Error, ['Correo o contrase&ntilde;a incorrectos.']).getByText('Correo o contraseña incorrectos.')).toBeTruthy()
    })
  })

  describe('a notice with one action', () => {
    const shown = (action: any, type: any = ToastType.Success) => {
      // `showToast` of the logic keeps the config; the toast draws what it holds.
      let config: any
      showActionToast((kind: any, message: any, duration?: number) => { config = { type: kind, message, duration } }, type, 'Order #4190 accepted', action, 5000)
      const hideToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([config, { hideToast }])
      return { ...renderWithProviders(<Toast />), hideToast, config }
    }

    it('draws the text and the action as a button; pressing it runs it and hides the notice', () => {
      const onPress = jest.fn()
      const { getByText, getByTestId, hideToast } = shown({ text: 'View order', onPress, testID: 'go' })
      expect(getByText('Order #4190 accepted')).toBeTruthy()
      const button = getByTestId('go')
      expect(button.props.accessibilityRole).toBe('button')
      expect(button.props.accessibilityLabel).toBe('View order')
      fireEvent.press(button)
      expect(onPress).toHaveBeenCalledTimes(1)
      expect(hideToast).toHaveBeenCalled()
    })

    it('takes the touches of its action only: the rest of it is box-none, a plain toast takes none', () => {
      const { getByText } = shown({ text: 'View order', onPress: jest.fn() })
      const text = getByText('Order #4190 accepted')
      const modes: any[] = []
      for (let up = text.parent; up; up = up.parent) if (up.props?.pointerEvents) modes.push(up.props.pointerEvents)
      expect(modes).toContain('box-none')
      expect(modes).not.toContain('auto')
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Saved', duration: 3000 }, { hideToast: jest.fn() }])
      const plain = renderWithProviders(<Toast />)
      const plainModes: any[] = []
      for (let up = plain.getByText('Saved').parent; up; up = up.parent) if (up.props?.pointerEvents) plainModes.push(up.props.pointerEvents)
      expect(plainModes).toContain('none')
      expect(plainModes).not.toContain('box-none')
    })

    it('has the action in the notice\'s own ink, underlined, in a target of 44 (the control height)', () => {
      const theme: any = defaultAppTheme()
      const { getByText, getByTestId } = shown({ text: 'View order', onPress: jest.fn(), testID: 'go' })
      const ink = theme.native.components.toast.variants.success.color
      const style = StyleSheet.flatten(getByText('View order').props.style)
      expect(style.color).toBe(ink)
      expect(style.textDecorationLine).toBe('underline')
      expect(StyleSheet.flatten(getByTestId('go').props.style).minHeight).toBeGreaterThanOrEqual(44)
    })

    it('loses its action when another notice replaces it', () => {
      shown({ text: 'View order', onPress: jest.fn(), testID: 'go' })
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Copied', duration: 3000 }, { hideToast: jest.fn() }])
      const next = renderWithProviders(<Toast />)
      expect(next.getByText('Copied')).toBeTruthy()
      expect(next.queryByTestId('go')).toBeNull()
      // And a notice shown with no action after one that had it has none.
      const second = shown(undefined)
      expect(second.queryByTestId('go')).toBeNull()
    })
  })

  describe('its place over the bars of the bottom (decision H8)', () => {
    const theme: any = defaultAppTheme()
    const offset = theme.native.components.toast.base.offset
    const Bar = ({ height }: { height: number }) => {
      useReportBottomBar('bar', height)
      return null
    }
    /** The toast's own `bottom`: the first ancestor of its text that places it. */
    const bottomOf = (screen: any) => {
      for (let up = screen.getByText('Saved').parent; up; up = up.parent) {
        const bottom = StyleSheet.flatten(up.props?.style)?.bottom
        if (bottom !== undefined) return bottom
      }
      return undefined
    }
    beforeEach(() => {
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Saved', duration: 3000 }, { hideToast: jest.fn() }])
    })

    it('keeps its place over the bottom inset when no bar is on screen', () => {
      // The tests' safe area has no inset: the toast is its offset from the bottom.
      const screen = renderWithProviders(<Toast />)
      expect(bottomOf(screen)).toBe(offset)
    })

    it('is drawn above the bar on screen, the bar\'s own inset included (the tab bar, a bottom action bar)', () => {
      const screen = renderWithProviders(<BottomBarProvider><Bar height={94} /><Toast /></BottomBarProvider>)
      expect(bottomOf(screen)).toBe(94 + offset)
    })

    it('comes back down when the bar leaves', () => {
      const screen = renderWithProviders(<BottomBarProvider><Bar height={94} /><Toast /></BottomBarProvider>)
      screen.rerender(<BottomBarProvider><Toast /></BottomBarProvider>)
      expect(bottomOf(screen)).toBe(offset)
    })
  })
  describe('a notice shown for the top', () => {
    const theme: any = defaultAppTheme()
    const { toast, header } = theme.native.components
    const placed = (action: any, placement?: any) => {
      let config: any
      showActionToast((kind: any, message: any, duration?: number) => { config = { type: kind, message, duration } }, ToastType.Success, 'Order #4190 accepted', action, 5000, placement)
      ;(useToast as jest.Mock).mockReturnValue([config, { hideToast: jest.fn() }])
      const screen = renderWithProviders(<Toast />)
      for (let up: any = screen.getByText('Order #4190 accepted').parent; up; up = up.parent) {
        const style = StyleSheet.flatten(up.props?.style)
        if (style?.top !== undefined || style?.bottom !== undefined) return { top: style.top, bottom: style.bottom, screen }
      }
      return { top: undefined, bottom: undefined, screen }
    }

    it('stands under the screen\'s header (its height under the safe area, and the toast\'s offset), with or without an action', () => {
      // The tests' safe area has no inset.
      for (const action of [{ text: 'View order', onPress: jest.fn(), testID: 'go' }, undefined]) {
        const { top, bottom, screen } = placed(action, 'top')
        expect(top).toBe(header.base.height + toast.base.offset)
        expect(bottom).toBeUndefined()
        expect(screen.getByText('Order #4190 accepted')).toBeTruthy()
      }
    })

    it('keeps its action at the top', () => {
      const { screen } = placed({ text: 'View order', onPress: jest.fn(), testID: 'go' }, 'top')
      expect(screen.getByTestId('go')).toBeTruthy()
    })

    it('every other notice stays at the bottom', () => {
      for (const placement of [undefined, 'bottom']) {
        const { top, bottom } = placed({ text: 'View order', onPress: jest.fn() }, placement)
        expect(top).toBeUndefined()
        expect(bottom).toBe(toast.base.offset)
      }
    })
  })

  describe('its place between the gutters and over the keyboard', () => {
    const theme: any = defaultAppTheme()
    const toast = theme.native.components.toast.base
    const gutter = theme.native.tokens.layout.page_gutter
    let replaced: { restore: () => void } | undefined
    let listeners: Record<string, (event?: any) => void>
    const Bar = ({ height }: { height: number }) => {
      useReportBottomBar('bar', height)
      return null
    }
    /** The first ancestor of the toast's text that carries the style prop `key`. */
    const nodeWith = (screen: any, key: string) => {
      for (let up = screen.getByText('Saved').parent; up; up = up.parent) {
        if (StyleSheet.flatten(up.props?.style)?.[key] !== undefined) return up
      }
      return undefined
    }
    const bottomOf = (screen: any) => StyleSheet.flatten(nodeWith(screen, 'bottom').props.style).bottom
    const keyboard = (event: string, height?: number) => act(() => {
      listeners[event]({ endCoordinates: { height } })
    })

    beforeEach(() => {
      listeners = {}
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: any) => {
        listeners[event] = listener
        return { remove: jest.fn() }
      }) as any)
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Saved', duration: 3000 }, { hideToast: jest.fn() }])
    })

    afterEach(() => {
      replaced?.restore()
      replaced = undefined
    })

    it('sits between the page gutters, takes no touch, and its box keeps the theme\'s max width', () => {
      const screen = renderWithProviders(<Toast />)
      const container = nodeWith(screen, 'left')
      const style = StyleSheet.flatten(container.props.style)
      expect(style.left).toBe(gutter)
      expect(style.right).toBe(gutter)
      expect(style.position).toBe('absolute')
      expect(container.props.pointerEvents).toBe('none')
      expect(StyleSheet.flatten(nodeWith(screen, 'maxWidth').props.style).maxWidth).toBe(toast.max_width)
    })

    describe('on iOS', () => {
      beforeEach(() => {
        replaced = jest.replaceProperty(Platform, 'OS', 'ios')
      })

      it('rides above the keyboard when it is taller than the bottom inset, and comes back when it hides', () => {
        const screen = renderWithProviders(<Toast />)
        expect(bottomOf(screen)).toBe(toast.offset)
        keyboard('keyboardWillShow', 300)
        expect(bottomOf(screen)).toBe(300 + toast.offset)
        keyboard('keyboardWillHide')
        expect(bottomOf(screen)).toBe(toast.offset)
      })

      it('stays over the bar when the keyboard is not taller than it', () => {
        const screen = renderWithProviders(<BottomBarProvider><Bar height={94} /><Toast /></BottomBarProvider>)
        keyboard('keyboardWillShow', 50)
        expect(bottomOf(screen)).toBe(94 + toast.offset)
        keyboard('keyboardWillShow', 300)
        expect(bottomOf(screen)).toBe(300 + toast.offset)
      })
    })

    it('does not follow the keyboard on Android', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'android')
      const screen = renderWithProviders(<Toast />)
      expect(listeners.keyboardWillShow).toBeUndefined()
      expect(listeners.keyboardWillHide).toBeUndefined()
      expect(bottomOf(screen)).toBe(toast.offset)
    })
  })
})
