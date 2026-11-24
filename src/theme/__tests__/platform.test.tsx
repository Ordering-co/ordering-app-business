import React from 'react'
import { Text } from 'react-native'
import fs from 'fs'
import path from 'path'
import { render, renderHook } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'
import DeviceInfo from 'react-native-device-info'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../engine'
import { columnBleed, layoutOf, platformOf, resetDeviceIsTablet, TABLET_SHORTEST_SIDE, useLayout, usePlatform } from '../platform'
import { AppThemeProvider, useAppTheme } from '../AppThemeContext'
import { themePart, themeVisible } from '../helpers'
import { themeWithValues } from '../../../jest/helpers/themeWithValues'

jest.mock('@components', () => ({ useApi: () => [{}] }))

const window = jest.requireActual('react-native')
const mockWindow = { width: 390, height: 844 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ ...mockWindow, scale: 3, fontScale: 1 })
}))
const isTablet = DeviceInfo.isTablet as jest.Mock
const setWindow = (width: number, height: number) => { mockWindow.width = width; mockWindow.height = height }

const phone = defaultAppTheme({ platform: 'phone' })
const tablet = defaultAppTheme({ platform: 'tablet' })

beforeEach(() => {
  setWindow(390, 844)
  isTablet.mockReturnValue(false)
  resetDeviceIsTablet()
})

describe('which platform the app is on', () => {
  it('is a phone on a phone, in either orientation', () => {
    expect(platformOf({ isTablet: false, width: 390, height: 844 })).toBe('phone')
    expect(platformOf({ isTablet: false, width: 844, height: 390 })).toBe('phone')
    expect(platformOf({ isTablet: false, width: 430, height: 932 })).toBe('phone')
  })

  it('is a tablet when the device is one, whatever the window', () => {
    expect(platformOf({ isTablet: true, width: 834, height: 1194 })).toBe('tablet')
    expect(platformOf({ isTablet: true, width: 1194, height: 834 })).toBe('tablet')
    expect(platformOf({ isTablet: true, width: 320, height: 1000 })).toBe('tablet')
  })

  it('is a tablet when the window\'s shorter side reaches a tablet\'s (a foldable, an Android desktop window), and never changes on rotation', () => {
    expect(TABLET_SHORTEST_SIDE).toBe(600)
    expect(platformOf({ isTablet: false, width: 673, height: 841 })).toBe('tablet')
    expect(platformOf({ isTablet: false, width: 841, height: 673 })).toBe('tablet')
    expect(platformOf({ isTablet: false, width: 599, height: 1200 })).toBe('phone')
  })

  it('is read by the hook from the device and the window, and follows the window', () => {
    const { result, rerender } = renderHook(() => usePlatform())
    expect(result.current).toBe('phone')
    setWindow(700, 900)
    rerender({})
    expect(result.current).toBe('tablet')
    setWindow(390, 844)
    rerender({})
    expect(result.current).toBe('phone')
  })

  it('asks the device once, when first used, never at import (a device that is a tablet stays one)', () => {
    isTablet.mockReturnValue(true)
    resetDeviceIsTablet()
    const { result } = renderHook(() => usePlatform())
    expect(result.current).toBe('tablet')
    isTablet.mockReturnValue(false)
    const again = renderHook(() => usePlatform())
    expect(again.result.current).toBe('tablet')
    expect(isTablet).toHaveBeenCalledTimes(1)
  })
})

describe('the theme resolved for a platform', () => {
  it('says which platform it is for', () => {
    expect(phone.meta.platform).toBe('phone')
    expect(tablet.meta.platform).toBe('tablet')
    expect(defaultAppTheme().meta.platform).toBe('phone')
  })

  it('lays the tablet\'s own component values over the base ones, and only there', () => {
    expect(themePart(phone, 'screen', 'base.max_width')).toBe(0)
    expect(themePart(tablet, 'screen', 'base.max_width')).toBe(600)
    expect(themePart(phone, 'sheet', 'base.presentation')).toBe('bottom')
    expect(themePart(tablet, 'sheet', 'base.presentation')).toBe('centered')
    expect(themePart(phone, 'sheet', 'base.max_width')).toBe(0)
    expect(themePart(tablet, 'sheet', 'base.max_width')).toBe(480)
    expect(themePart(phone, 'bottom_nav', 'base.placement')).toBe('bottom')
    expect(themePart(tablet, 'bottom_nav', 'base.placement')).toBe('rail')
    // What the platform does not override is the base's, in the same object.
    expect(themePart(tablet, 'sheet', 'base.radius')).toBe(themePart(phone, 'sheet', 'base.radius'))
    expect(tablet.native.components.button).toBe(phone.native.components.button)
  })

  it('lays its visibility over the base: the kitchen board is a tablet\'s', () => {
    expect(themeVisible(phone, 'orders.board')).toBe(false)
    expect(themeVisible(tablet, 'orders.board')).toBe(true)
    expect(themeVisible(tablet, 'orders.search')).toBe(themeVisible(phone, 'orders.search'))
  })

  it('never reaches the tokens', () => {
    expect(tablet.native.tokens).toBe(phone.native.tokens)
    expect(tablet.values.tokens).toBe(phone.values.tokens)
  })

  it('keeps the same object for the same envelope and platform, and builds the engine\'s view once', () => {
    const served = { version: 2 as const, product_type: THEME_PRODUCT_TYPE, values: {} }
    expect(buildAppTheme(served, { platform: 'tablet' })).toBe(buildAppTheme(served, { platform: 'tablet' }))
    expect(buildAppTheme(served, { platform: 'tablet' })).not.toBe(buildAppTheme(served, { platform: 'phone' }))
    expect(buildAppTheme(served, { platform: 'tablet' }).native.tokens).toBe(buildAppTheme(served, { platform: 'phone' }).native.tokens)
    expect(defaultAppTheme({ platform: 'tablet' })).toBe(tablet)
    expect(buildAppTheme(served, { platform: 'tablet', reduceMotion: true }).meta.reduceMotion).toBe(true)
  })

  it('takes a served tablet override, and a phone does not see it', () => {
    const values = { platforms: { tablet: { components: { screen: { base: { max_width: 700 } } }, visibility: { 'orders.search': false } } } }
    const served = { version: 2 as const, product_type: THEME_PRODUCT_TYPE, values }
    expect(themePart(buildAppTheme(served, { platform: 'tablet' }), 'screen', 'base.max_width')).toBe(700)
    expect(themePart(buildAppTheme(served, { platform: 'phone' }), 'screen', 'base.max_width')).toBe(0)
    expect(themeVisible(buildAppTheme(served, { platform: 'tablet' }), 'orders.search')).toBe(false)
    expect(themeVisible(buildAppTheme(served, { platform: 'phone' }), 'orders.search')).toBe(true)
  })

  it('takes an override on a platform the schema does not declare as nothing', () => {
    const served = { version: 2 as const, product_type: THEME_PRODUCT_TYPE, values: { platforms: { kiosk: { components: { screen: { base: { max_width: 1 } } } } } } }
    expect(themePart(buildAppTheme(served, { platform: 'tablet' }), 'screen', 'base.max_width')).toBe(600)
  })

  it('is what a test builds with themeWithValues', () => {
    const wide = themeWithValues((values) => { values.platforms.tablet.components.screen.base.max_width = 640 }, { platform: 'tablet' })
    expect(themePart(wide, 'screen', 'base.max_width')).toBe(640)
  })
})

describe('the layout', () => {
  it('a phone has no cap, no rail and no panes, in either orientation', () => {
    for (const [width, height] of [[390, 844], [844, 390]]) {
      const layout = layoutOf(phone, { width, height })
      expect(layout).toMatchObject({ platform: 'phone', tablet: false, landscapeTablet: false, rail: false, railWidth: 0, maxContentWidth: 0, contentWidth: width, sheetMaxWidth: 0, sheetCentered: false })
    }
    expect(layoutOf(phone, { width: 844, height: 390 }).landscape).toBe(true)
  })

  it('a portrait tablet is the phone layout in a centered column of the theme\'s width, its sheets centered cards', () => {
    const layout = layoutOf(tablet, { width: 834, height: 1194 })
    expect(layout).toMatchObject({ tablet: true, landscape: false, landscapeTablet: false, rail: false, railWidth: 0, maxContentWidth: 600, contentWidth: 600, sheetMaxWidth: 480, sheetCentered: true })
  })

  it('a scroller may run past its column to the window\'s edge on a portrait tablet only (IPAD-C2)', () => {
    expect(columnBleed(layoutOf(tablet, { width: 834, height: 1194 }))).toBe(117)
    expect(columnBleed(layoutOf(phone, { width: 390, height: 844 }))).toBe(0)
    expect(columnBleed(layoutOf(tablet, { width: 1194, height: 834 }))).toBe(0)
  })

  it('a landscape tablet has the rail (its width from the theme) and the column between it and the edge', () => {
    const layout = layoutOf(tablet, { width: 1194, height: 834 })
    expect(layout).toMatchObject({ landscapeTablet: true, rail: true, railWidth: themePart(tablet, 'bottom_nav', 'base.rail_width') })
    expect(layout.railWidth).toBe(80)
    expect(layout.contentWidth).toBe(600)
    // A window narrower than the column gives the column what is left of it.
    expect(layoutOf(tablet, { width: 640, height: 500 }).contentWidth).toBe(640 - 80)
  })

  it('has no rail when the theme asks for a bar at the bottom, even on a landscape tablet', () => {
    const bar = themeWithValues((values) => { values.platforms.tablet.components.bottom_nav.base.placement = 'bottom' }, { platform: 'tablet' })
    expect(layoutOf(bar, { width: 1194, height: 834 })).toMatchObject({ landscapeTablet: true, rail: false, railWidth: 0 })
  })

  it('gives the panes\' widths the theme has (the schema\'s 380 and 440)', () => {
    expect(layoutOf(tablet, { width: 1194, height: 834 }).panes).toEqual({ list: 380, detail: 440 })
    const withPanes: any = { ...tablet, native: { ...tablet.native, components: { ...tablet.native.components, screen: { base: { max_width: 600, list_pane_width: 380, detail_pane_width: 440 } } } } }
    expect(layoutOf(withPanes, { width: 1194, height: 834 }).panes).toEqual({ list: 380, detail: 440 })
  })

  it('is read by the hook with the window: it follows a rotation', () => {
    isTablet.mockReturnValue(true)
    resetDeviceIsTablet()
    const wrapper = ({ children }: any) => <AppThemeProvider>{children}</AppThemeProvider>
    setWindow(834, 1194)
    const { result, rerender } = renderHook(() => useLayout(), { wrapper })
    expect(result.current).toMatchObject({ platform: 'tablet', landscapeTablet: false, contentWidth: 600 })
    setWindow(1194, 834)
    rerender({})
    expect(result.current).toMatchObject({ platform: 'tablet', landscapeTablet: true, rail: true })
    const again = result.current
    rerender({})
    expect(result.current).toBe(again)
  })
})

describe('the provider resolves the theme for the device', () => {
  const Probe = () => {
    const theme = useAppTheme()
    return <Text testID='probe'>{`${theme.meta.platform}:${themePart(theme, 'screen', 'base.max_width')}`}</Text>
  }

  it('paints a phone\'s theme on a phone and a tablet\'s on a tablet', () => {
    const onPhone = render(<AppThemeProvider><Probe /></AppThemeProvider>)
    expect(onPhone.getByTestId('probe').props.children).toBe('phone:0')
    onPhone.unmount()
    isTablet.mockReturnValue(true)
    resetDeviceIsTablet()
    const onTablet = render(<AppThemeProvider><Probe /></AppThemeProvider>)
    expect(onTablet.getByTestId('probe').props.children).toBe('tablet:600')
  })

  it('follows the window when a foldable opens', () => {
    const view = render(<AppThemeProvider><Probe /></AppThemeProvider>)
    expect(view.getByTestId('probe').props.children).toBe('phone:0')
    setWindow(700, 900)
    view.rerender(<AppThemeProvider><Probe /></AppThemeProvider>)
    expect(view.getByTestId('probe').props.children).toBe('tablet:600')
  })

  it('takes a platform from the caller (a test)', () => {
    isTablet.mockReturnValue(true)
    resetDeviceIsTablet()
    const view = render(<AppThemeProvider platform='phone'><Probe /></AppThemeProvider>)
    expect(view.getByTestId('probe').props.children).toBe('phone:0')
  })

  it('is what a styled component sees', () => {
    const Styled = () => {
      const theme: any = require('styled-components/native').useTheme()
      return <Text testID='styled'>{theme.meta.platform}</Text>
    }
    const view = render(<ThemeProvider theme={tablet}><Styled /></ThemeProvider>)
    expect(view.getByTestId('styled').props.children).toBe('tablet')
  })
})

/**
 * The orientation rule of the app: the phone never rotates (its layout is the portrait one; the native projects lock
 * it), the tablet does, both ways, and is the same platform in either.
 */
describe('a tablet turned either way, a phone never', () => {
  const wrapper = ({ children }: any) => <AppThemeProvider>{children}</AppThemeProvider>
  const read = (width: number, height: number, tabletDevice = true) => {
    isTablet.mockReturnValue(tabletDevice)
    resetDeviceIsTablet()
    setWindow(width, height)
    return renderHook(() => ({ platform: usePlatform(), layout: useLayout() }), { wrapper }).result.current
  }

  it('a 1180 x 820 window is a landscape tablet: the side rail, the board and the panes', () => {
    const { platform, layout } = read(1180, 820)
    expect(platform).toBe('tablet')
    expect(layout).toMatchObject({ platform: 'tablet', landscape: true, landscapeTablet: true, rail: true, railWidth: 80, contentWidth: 600 })
    expect(layout.panes).toEqual({ list: 380, detail: 440 })
  })

  it('an 820 x 1180 window is the same tablet upright: the phone layout in the centered column, no rail', () => {
    const { platform, layout } = read(820, 1180)
    expect(platform).toBe('tablet')
    expect(layout).toMatchObject({ platform: 'tablet', landscape: false, landscapeTablet: false, rail: false, railWidth: 0, maxContentWidth: 600, contentWidth: 600, sheetCentered: true })
  })

  it('a window that big is a tablet even where the device does not say so (an Android desktop window, a foldable), in either shape', () => {
    expect(read(1180, 820, false).platform).toBe('tablet')
    expect(read(820, 1180, false).platform).toBe('tablet')
  })

  it('turning a tablet changes the layout and never the platform', () => {
    const landscape = read(1180, 820)
    const portrait = read(820, 1180)
    expect(landscape.platform).toBe(portrait.platform)
    expect(landscape.layout.landscapeTablet).not.toBe(portrait.layout.landscapeTablet)
  })

  it('a phone is a phone in the window it has, and never gets the tablet\'s landscape layouts (even a phone turned by accident)', () => {
    for (const [width, height] of [[402, 874], [874, 402], [390, 844], [844, 390]]) {
      const { platform, layout } = read(width, height, false)
      expect(platform).toBe('phone')
      expect(layout).toMatchObject({ tablet: false, landscapeTablet: false, rail: false, railWidth: 0, maxContentWidth: 0, sheetCentered: false })
    }
  })

  describe('the native projects keep the same rule', () => {
    const root = path.join(__dirname, '../../..')
    const plist = fs.readFileSync(path.join(root, 'ios/OBusiness/Info.plist'), 'utf8')
    const orientationsOf = (key: string) => {
      const match = plist.match(new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`))
      return (match?.[1].match(/UIInterfaceOrientation\w+/g) ?? []).sort()
    }

    it('iOS: an iPhone is portrait only, an iPad turns all four ways', () => {
      expect(orientationsOf('UISupportedInterfaceOrientations')).toEqual(['UIInterfaceOrientationPortrait'])
      expect(orientationsOf('UISupportedInterfaceOrientations~ipad')).toEqual([
        'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight', 'UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown'
      ])
    })

    it('Android: portrait is locked below the tablet breakpoint (sw600dp, the same 600 as usePlatform) and free from it', () => {
      const bool = (dir: string) => fs.readFileSync(path.join(root, `android/app/src/main/res/${dir}/bools.xml`), 'utf8').match(/name="lock_portrait">(\w+)</)?.[1]
      expect(bool('values')).toBe('true')
      expect(bool('values-sw600dp')).toBe('false')
      expect(TABLET_SHORTEST_SIDE).toBe(600)
    })
  })
})
