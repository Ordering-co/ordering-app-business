import { Platform, StyleSheet } from 'react-native'
import { defaultAppTheme } from '../../../../../theme/engine'
import { chatStyles } from '../styles'

describe('the composer\'s space under it (chatStyles)', () => {
  const theme: any = defaultAppTheme()
  const original = Platform.OS
  const on = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os })
  const under = (inset: number) => StyleSheet.flatten(chatStyles(theme, inset).toolbarInset).paddingBottom
  const gap = theme.native.components.bottom_bar.base.padding
  afterEach(() => on(original))

  it('on Android, where the activity pads the screens and the inset reads 0, is a bar\'s gap and not the theme\'s minimum on top', () => {
    on('android')
    expect(under(0)).toBe(gap)
    expect(under(24)).toBe(24)
  })

  it('on iOS clears the home indicator the provider gives, and keeps the minimum with none', () => {
    on('ios')
    expect(under(34)).toBe(34)
    expect(under(0)).toBe(theme.native.components.bottom_nav.base.min_bottom_space)
  })
})
