import React, { useEffect } from 'react'
import { NativeModules, Platform, StatusBar, processColor } from 'react-native'
import { DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native'
import { useTheme } from 'styled-components/native'
import { isLight } from '@orderingco/ordering-theme-engine/colors'
import { themeColor, themeFontFace } from './helpers'

/**
 * The app's one status bar, mounted once inside the theme provider (`BusinessApp`): its content is dark over a
 * light `background` and light over a dark one (`isLight` of the engine's colors, never stored). React Native 0.87
 * removed the `backgroundColor` prop (Android 15+ draws the bar edge to edge): the color behind the bar is the
 * screen's own. It does not tell the connection (the connection pill does).
 *
 * On Android the activity pads its content by the system bars, so what shows behind them is the window's
 * background: the native `WindowBackground` module, when the build has it, paints it in the theme's `background`,
 * and again whenever the theme changes.
 */
export const ThemedStatusBar = () => {
  const theme = useTheme()
  const background = themeColor(theme, 'background')
  useEffect(() => {
    if (Platform.OS !== 'android') return
    NativeModules.WindowBackground?.setColor(processColor(background))
  }, [background])
  return (
    <StatusBar
      animated
      barStyle={isLight(background) === false ? 'light-content' : 'dark-content'}
    />
  )
}

/**
 * The fonts React Navigation 7 asks its theme for (`regular`, `medium`, `bold`, `heavy`): the theme's body font file
 * at the weight of each, never the library's system font and never a `fontWeight` (the file carries the weight).
 */
const navigationFontsOf = (theme: any) => Object.fromEntries(
  Object.entries(DefaultTheme.fonts).map(([name, { fontWeight }]) => [
    name,
    themeFontFace(theme, 'body', Number(fontWeight) || fontWeight)
  ])
) as unknown as NavigationTheme['fonts']

/**
 * What React Navigation paints by itself (the card under a screen during a transition, the frame of the tab bar)
 * in the theme's colors by role, in place of the library's own light grey, and its text in the theme's font:
 * `<NavigationContainer theme={navigationThemeOf(theme)}>`.
 */
export const navigationThemeOf = (theme: any): NavigationTheme => ({
  dark: isLight(themeColor(theme, 'background')) === false,
  colors: {
    primary: themeColor(theme, 'primary'),
    background: themeColor(theme, 'background'),
    card: themeColor(theme, 'surface'),
    text: themeColor(theme, 'text'),
    border: themeColor(theme, 'border'),
    notification: themeColor(theme, 'danger')
  },
  fonts: navigationFontsOf(theme)
})
