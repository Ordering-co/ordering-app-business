import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import OrderMessage from '../OrderMessage'

describe('OrderMessage', () => {
  it.each(['ios', 'android'])(
    'keeps the whole chat above the keyboard on %s without double resizing',
    async (platform) => {
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', { configurable: true, value: platform })
      const listeners: Record<string, Function> = {}
      const remove = jest.fn()
      const addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation(
        (event, listener) => {
          listeners[event] = listener
          return { remove } as any
        },
      )
      let unmount: (() => void) | undefined
      try {
        const page = renderPage(OrderMessage, {
          route: { params: { orderId: 15 } },
        })
        const { getByTestId, UNSAFE_getByType } = page
        unmount = page.unmount
        const layout = async (height: number) => {
          await act(async () => {
            fireEvent(getByTestId('chat-keyboard-screen'), 'layout', {
              persist: jest.fn(),
              nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
            })
          })
        }
        const padding = () =>
          StyleSheet.flatten(getByTestId('chat-keyboard-screen').props.style)
            .paddingBottom

        expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe(
          'padding',
        )
        await layout(800)
        await act(async () => {
          listeners[platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow']({
            duration: 0,
            endCoordinates: { screenX: 0, screenY: 500, width: 390, height: 300 },
          })
        })
        expect(padding()).toBe(300)
        await layout(500)
        expect(padding()).toBe(0)
        await act(async () => {
          listeners[platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide']({
            duration: 0,
            endCoordinates: { screenX: 0, screenY: 800, width: 390, height: 0 },
          })
        })
        await layout(800)
        expect(padding()).toBe(0)
        unmount()
        unmount = undefined
        expect(remove).toHaveBeenCalledTimes(2)
      } finally {
        unmount?.()
        addListener.mockRestore()
        Object.defineProperty(Platform, 'OS', {
          configurable: true,
          value: originalOS,
        })
      }
    },
  )

  it('renders order message controller with route params', () => {
    const setOrders = jest.fn()
    const { getByTestId } = renderPage(OrderMessage, {
      route: {
        params: {
          orderId: 15,
          isFromCheckout: false,
          setOrders
        }
      }
    })
    expect(getByTestId('order-message')).toBeTruthy()
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })
})
