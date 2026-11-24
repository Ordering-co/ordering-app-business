import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  const base = require('../../../jest/helpers/mockUi')
  return {
    ...base,
    // The keyboard-avoiding screen is the real one (the page's structure is what this test reads).
    KeyboardScreen: (props: any) => {
      const { KeyboardScreen: Real } = require('../../ui/src/components/shared/KeyboardScreen')
      return React.createElement(Real, props)
    },
    ScreenContainer: ({ children }: any) => React.createElement(View, { testID: 'screen-container' }, children),
    OrderMessage: (props: any) => React.createElement(View, { testID: 'order-message' },
      React.createElement(Text, { testID: 'order-message-id' }, String(props.orderId)),
      React.createElement(Text, { testID: 'order-message-room' }, String(props.isDisabledOrdersRoom)))
  }
})

import OrderMessage from '../OrderMessage'

describe('OrderMessage', () => {
  describe('the keyboard and the chat\'s composer', () => {
    const onPlatform = async (platform: string, windowTop: number) => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => platform })
      // The view the screen measures answers where it sits in the window (the renderer has no native view).
      const measureInWindow = jest.fn((callback: any) => callback(0, windowTop, 390, 800))
      ;(View as any).prototype.measureInWindow = measureInWindow
      const page = renderPage(OrderMessage, { route: { params: { orderId: 15 } } })
      // Both platforms measure the avoiding view's parent: the keyboard is in the window's coordinates, the avoiding view's
      // frame in its parent's (iOS: the status bar and the island above the screen, IOS-B2).
      const window: any = page.getByTestId('chat-window')
      await act(async () => {
        fireEvent(window, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } })
      })
      return { page, window, measureInWindow }
    }
    const originalOS = Platform.OS
    afterEach(() => {
      delete (View as any).prototype.measureInWindow
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS })
    })

    it('on Android gives the avoiding view the distance the activity\'s padding puts above it (the keyboard is measured from the window\'s top)', async () => {
      // The chat has no bar under its composer to take the shortfall, as the forms\' pinned bar does.
      const { page } = await onPlatform('android', 24)
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      expect(avoiding.props.keyboardVerticalOffset).toBe(24)
      expect(avoiding.props.behavior).toBe('padding')
      page.unmount()
    })

    it('on iOS gives it the distance of the screen from the window\'s top too (the island and the status bar), the behavior the same', async () => {
      const { page, measureInWindow } = await onPlatform('ios', 62)
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      expect(avoiding.props.keyboardVerticalOffset).toBe(62)
      expect(avoiding.props.behavior).toBe('padding')
      expect(measureInWindow).toHaveBeenCalled()
      page.unmount()
    })

    it('has one avoiding view only (the screen\'s): the chat inside does not add a second', async () => {
      const { page } = await onPlatform('android', 24)
      expect(page.UNSAFE_getAllByType(KeyboardAvoidingView)).toHaveLength(1)
      // The window\'s measured view is the avoiding view\'s parent, so its own `frame.y` is 0.
      const avoiding = page.getByTestId('chat-keyboard-screen')
      expect(StyleSheet.flatten(avoiding.props.style).flex).toBe(1)
      page.unmount()
    })
  })

  it('opens the chat of the order the route names, in the phone\'s column inside the safe area', () => {
    const { getByTestId } = renderPage(OrderMessage, { route: { params: { orderId: 15 } } })
    expect(getByTestId('order-message-id')).toHaveTextContent('15')
    expect(getByTestId('order-message-room')).toHaveTextContent('true')
    expect(getByTestId('safe-area-container')).toBeTruthy()
    expect(getByTestId('screen-container')).toBeTruthy()
  })

  it('takes the order from a loaded one when the route brings no number', () => {
    const { getByTestId } = renderPage(OrderMessage, { route: { params: { order: { id: 44 } } } })
    expect(getByTestId('order-message-id')).toHaveTextContent('44')
  })
})
