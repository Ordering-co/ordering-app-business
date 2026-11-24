import React from 'react'
import { Image, Platform, StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../theme/engine'

import Splash from '../Splash'

const renderLogo = (os: 'ios' | 'android') => {
  jest.replaceProperty(Platform, 'OS', os)
  const { UNSAFE_getByType } = renderWithProviders(<Splash />)
  const logo = UNSAFE_getByType(Image)
  return { style: StyleSheet.flatten(logo.props.style), resizeMode: logo.props.resizeMode }
}

describe('Splash', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders splash screen', () => {
    const { toJSON } = renderWithProviders(<Splash />)
    expect(toJSON()).toBeTruthy()
  })

  it('paints the theme\'s background behind the launch logo', () => {
    const theme: any = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { tokens: { color: { background: '#FAFBFC' } } }
    })
    const { getByTestId } = renderWithProviders(<Splash />, { themeOverrides: theme })
    expect(StyleSheet.flatten(getByTestId('splash-container').props.style).backgroundColor).toBe('#FAFBFC')
  })

  it('draws the square launch logo at the size of the native iOS splash (120 pt)', () => {
    const { style, resizeMode } = renderLogo('ios')

    expect(resizeMode).toBe('contain')
    expect(style.width).toBe(120)
    expect(style.height).toBe(120)
  })

  it('draws it at the same size on Android (120 dp inside the 288 dp box of the launch theme)', () => {
    const { style } = renderLogo('android')

    expect(style.width).toBe(120)
    expect(style.height).toBe(120)
  })

  it('the native splash images are that square logo: 120 pt on iOS, 120 of 288 dp on Android', () => {
    const fs = require('fs')
    const path = require('path')
    const root = path.resolve(__dirname, '../../..')
    // A PNG's width and height are the two big-endian integers after its signature and the IHDR tag.
    const size = (file: string) => {
      const data = fs.readFileSync(path.join(root, file))
      return [data.readUInt32BE(16), data.readUInt32BE(20)]
    }
    expect(size('assets/bootsplash/logo-source.png')).toEqual([1024, 1024])
    expect(size('ios/OBusiness/Images.xcassets/BootSplashLogo.imageset/logo.png')).toEqual([120, 120])
    expect(size('ios/OBusiness/Images.xcassets/BootSplashLogo.imageset/logo@2x.png')).toEqual([240, 240])
    expect(size('ios/OBusiness/Images.xcassets/BootSplashLogo.imageset/logo@3x.png')).toEqual([360, 360])
    expect(size('android/app/src/main/res/drawable-mdpi/bootsplash_logo.png')).toEqual([288, 288])
    expect(size('android/app/src/main/res/drawable-xxxhdpi/bootsplash_logo.png')).toEqual([1152, 1152])
    const storyboard = fs.readFileSync(path.join(root, 'ios/OBusiness/BootSplash.storyboard'), 'utf8')
    expect(storyboard).toContain('<image name="BootSplashLogo" width="120" height="120"/>')
  })

  it('does not call the native splash itself: BusinessApp hides it once, after the cached theme', () => {
    const BootSplash = require('react-native-bootsplash').default
    BootSplash.hide.mockClear()
    renderWithProviders(<Splash />)
    expect(BootSplash.hide).not.toHaveBeenCalled()
  })
})
