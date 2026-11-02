import React from 'react'
import { Dimensions, Image, Platform, StatusBar, StyleSheet, View } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import SplashScreen from 'react-native-splash-screen'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'

import Splash from '../Splash'

const renderSplashImage = (os: 'ios' | 'android') => {
  jest.replaceProperty(Platform, 'OS', os)
  const { UNSAFE_getByType } = renderWithProviders(<Splash />)
  const image = UNSAFE_getByType(Image)
  return { style: StyleSheet.flatten(image.props.style), resizeMode: image.props.resizeMode, fadeDuration: image.props.fadeDuration }
}

describe('Splash', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
    jest.mocked(SplashScreen.hide).mockClear()
  })

  it('renders splash screen', () => {
    const { toJSON } = renderWithProviders(<Splash />)
    expect(toJSON()).toBeTruthy()
  })

  it('draws the image in the same frame as the iOS launch screen', () => {
    const { style, resizeMode } = renderSplashImage('ios')

    expect(resizeMode).toBe('contain')
    expect(style.position).toBe('absolute')
    expect(style.left).toBeCloseTo(750 * 76 / 393)
    expect(style.top).toBeCloseTo(1334 * 362 / 852)
    expect(style.width).toBeCloseTo(750 * 250 / 393)
    expect(style.height).toBeCloseTo(1334 * 80 / 852)
  })

  it('covers the whole screen like the Android launch screen', () => {
    const screen = Dimensions.get('screen')
    const { style, resizeMode, fadeDuration } = renderSplashImage('android')

    expect(resizeMode).toBe('cover')
    expect(fadeDuration).toBe(0)
    expect(style).toMatchObject({ position: 'absolute', left: 0, bottom: 0, width: screen.width, height: screen.height })
  })

  it('anchors the image to the bottom of the screen so it stays put when the status bar changes', () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    jest.replaceProperty(StatusBar, 'currentHeight', 24)
    const screen = Dimensions.get('screen')
    const measureInWindow = jest.spyOn(View.prototype as any, 'measureInWindow')
    const { UNSAFE_getByType, getByTestId } = renderWithProviders(<Splash />)
    const imageBottom = () => StyleSheet.flatten(UNSAFE_getByType(Image).props.style).bottom
    const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 900 } } }

    measureInWindow.mockImplementation((callback: any) => callback(0, 0, 400, screen.height - 24 - 30))
    fireEvent(getByTestId('splash-container'), 'layout', layout)
    expect(imageBottom()).toBe(-30)

    measureInWindow.mockImplementation((callback: any) => callback(0, -24, 400, screen.height - 30))
    fireEvent(getByTestId('splash-container'), 'layout', layout)
    expect(imageBottom()).toBe(-30)
  })

  it('hides the native splash once the image is drawn', () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    const { UNSAFE_getByType } = renderWithProviders(<Splash />)

    expect(SplashScreen.hide).not.toHaveBeenCalled()
    fireEvent(UNSAFE_getByType(Image), 'load')
    expect(SplashScreen.hide).toHaveBeenCalled()
  })

  it('hides the native splash if the image fails to load', () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    const { UNSAFE_getByType } = renderWithProviders(<Splash />)

    fireEvent(UNSAFE_getByType(Image), 'error')
    expect(SplashScreen.hide).toHaveBeenCalled()
  })

  it('hides the native splash after 5 seconds if the image never reports back', () => {
    jest.useFakeTimers()
    jest.replaceProperty(Platform, 'OS', 'android')
    renderWithProviders(<Splash />)

    act(() => { jest.advanceTimersByTime(4999) })
    expect(SplashScreen.hide).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(1) })
    expect(SplashScreen.hide).toHaveBeenCalled()
  })
})
