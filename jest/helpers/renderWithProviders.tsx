import React from 'react'
import { render, RenderOptions } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from 'styled-components/native'
import { defaultAppTheme, type PlatformName } from '../../src/theme/engine'

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  themeOverrides?: Record<string, unknown>
  /** The schema platform the theme is resolved for (phone by default). */
  platform?: PlatformName
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { themeOverrides, platform, ...options }: RenderWithProvidersOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaProvider>
      <ThemeProvider theme={{ ...defaultAppTheme({ platform }), ...themeOverrides }}>
        {children}
      </ThemeProvider>
    </SafeAreaProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}
