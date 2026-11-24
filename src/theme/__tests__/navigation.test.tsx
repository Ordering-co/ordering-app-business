import React from 'react'
import { StatusBar } from 'react-native'
import { render } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'
import { navigationThemeOf, ThemedStatusBar } from '../navigation'
import { defaultAppTheme } from '../engine'
import { themeFontFamily } from '../helpers'
import { themeWithValues } from '../../../jest/helpers/themeWithValues'

const bar = (theme: any) => render(<ThemeProvider theme={theme}><ThemedStatusBar /></ThemeProvider>).UNSAFE_getByType(StatusBar).props

describe('the status bar', () => {
  it('is dark over a light background and light over a dark one', () => {
    expect(bar(defaultAppTheme()).barStyle).toBe('dark-content')
    expect(bar(themeWithValues((values) => { values.tokens.color.background = '#0B0B0F' })).barStyle).toBe('light-content')
  })
})

describe('the navigation theme', () => {
  const theme = defaultAppTheme()

  it('paints React Navigation in the theme\'s colors by role', () => {
    const navigation = navigationThemeOf(theme)
    expect(navigation.dark).toBe(false)
    expect(navigation.colors).toEqual({
      primary: theme.native.tokens.color.primary,
      background: theme.native.tokens.color.background,
      card: theme.native.tokens.color.surface,
      text: theme.native.tokens.color.text,
      border: theme.native.tokens.color.border,
      notification: theme.native.tokens.color.danger
    })
  })

  it('writes its texts with the body font files of the weights, never with a font weight', () => {
    const { fonts } = navigationThemeOf(theme)
    expect(fonts.regular).toEqual({ fontFamily: themeFontFamily(theme, 'body', 400) })
    expect(fonts.bold).toEqual({ fontFamily: themeFontFamily(theme, 'body', 600) })
    expect(fonts.heavy).toEqual({ fontFamily: themeFontFamily(theme, 'body', 700) })
    expect(fonts.regular).not.toHaveProperty('fontWeight')
  })

  it('is dark for a dark theme', () => {
    expect(navigationThemeOf(themeWithValues((values) => { values.tokens.color.background = '#0B0B0F' })).dark).toBe(true)
  })
})
