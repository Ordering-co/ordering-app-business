import React from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  LanguageSelector: ({ UIComponent }: any) => <UIComponent languagesState={{ loading: false, languages: [] }} />
}))

import { AuthScreen, formatCountdown } from '../AuthPieces'

describe('AuthScreen', () => {
  it('lifts the screen with a keyboard-avoiding view', () => {
    const { UNSAFE_getByType } = renderWithProviders(<AuthScreen title='Forgot'><Text>field</Text></AuthScreen>)
    const avoiding = UNSAFE_getByType(KeyboardAvoidingView)
    expect(avoiding.props.enabled).toBe(true)
  })

  // IPAD2-B1: the login's button is the end of its form; with a pinned footer the footer is the action and the form needs nothing.
  it('brings the end of the form (its own button) over the keyboard with the field, on a tablet too, unless the action is pinned', () => {
    const open = (ui: React.ReactElement, platform: 'phone' | 'tablet') => renderWithProviders(ui, { platform }).UNSAFE_getByType(ScrollView)
    const inline = <AuthScreen title='Login'><Text>fields and button</Text></AuthScreen>
    expect(open(inline, 'tablet').props.keyboardShouldPersistTaps).toBe('handled')
    // The scroll's reveal rule reads its own flag: seen through the page's end being measured (the content's size).
    const pinned = <AuthScreen title='Forgot' footer={<Text>bar</Text>}><Text>field</Text></AuthScreen>
    const { UNSAFE_getAllByType } = renderWithProviders(inline, { platform: 'tablet' })
    expect(UNSAFE_getAllByType(require('../../shared/KeyboardScrollView').default)[0].props.keepEndInSight).toBe(true)
    const withFooter = renderWithProviders(pinned, { platform: 'tablet' })
    expect(withFooter.UNSAFE_getAllByType(require('../../shared/KeyboardScrollView').default)[0].props.keepEndInSight).toBe(false)
  })

  it('on Android gives the avoiding view the distance of the screen from the window\'s top', async () => {
    const android = onAndroid(63)
    const { UNSAFE_getByType } = renderWithProviders(<AuthScreen title='Forgot'><Text>field</Text></AuthScreen>)
    await layoutWindowOf(UNSAFE_getByType(KeyboardAvoidingView))
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(63)
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('height')
    android.restore()
  })

  it('puts the bar, the scroll and the pinned footer in one column that is the whole width on a phone', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <AuthScreen title='Forgot' footer={<Text>bar</Text>}><Text>field</Text></AuthScreen>
    )
    const column = getByTestId('auth-column').children[0] as any
    expect(StyleSheet.flatten(column.props.style).maxWidth).toBeUndefined()
    expect(getByText('Forgot')).toBeTruthy()
    expect(getByText('bar')).toBeTruthy()
  })

  it('centers a column of the screen\'s maximum width on a tablet', () => {
    const { getByTestId } = renderWithProviders(<AuthScreen title='Forgot'><Text>field</Text></AuthScreen>, { platform: 'tablet' })
    const column = getByTestId('auth-column').children[0] as any
    expect(StyleSheet.flatten(column.props.style).maxWidth).toBeGreaterThan(0)
    expect(StyleSheet.flatten(getByTestId('auth-column').props.style).alignItems).toBe('center')
  })
})

describe('formatCountdown', () => {
  it('writes minutes and seconds, the minutes padded by default', () => {
    expect(formatCountdown(582)).toBe('09:42')
    expect(formatCountdown(600)).toBe('10:00')
    expect(formatCountdown(0)).toBe('00:00')
  })

  it('writes the wait to resend with no padding on the minutes', () => {
    expect(formatCountdown(38, { padMinutes: false })).toBe('0:38')
    expect(formatCountdown(80, { padMinutes: false })).toBe('1:20')
  })

  it('never goes below zero and takes what is not a number for zero', () => {
    expect(formatCountdown(-5)).toBe('00:00')
    expect(formatCountdown(NaN)).toBe('00:00')
    expect(formatCountdown(59.9)).toBe('00:59')
  })
})
