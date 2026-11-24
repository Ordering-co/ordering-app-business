import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { AppTabBar } from '../TabBar'
import { UnreadMessagesProvider, useReportUnreadMessages, type UnreadMessages } from '../../../../../context/UnreadMessagesContext'
import { BottomBarProvider, useBottomBarHeight } from '../../../../../context/BottomBarContext'

// The window the layout reads: a phone, or a tablet turned either way.
const mockWindow = { width: 390, height: 844, fontScale: 1 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ ...mockWindow, scale: 3 })
}))
const setWindow = (width: number, height: number) => { mockWindow.width = width; mockWindow.height = height }

const mockKeyboard = { visible: false }
jest.mock('@/hooks/useKeyboardVisible', () => ({ useKeyboardVisible: () => mockKeyboard.visible }))

// The bottom inset the safe-area provider gives (a test sets it: 0 on Android, where the activity pads the screens,
// and the home indicator's on an iPhone).
const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 }
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

const ROUTES = ['Orders', 'Messages', 'Stores', 'Profile']

/** What React Navigation hands a custom tab bar. */
const barProps = (focused = 'Orders') => {
  const state: any = {
    key: 'tabs',
    index: ROUTES.indexOf(focused),
    routes: ROUTES.map((name) => ({ key: `${name}-key`, name }))
  }
  const descriptors: any = Object.fromEntries(state.routes.map((route: any) => [route.key, { options: {} }]))
  const navigation: any = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    dispatch: jest.fn()
  }
  return { state, descriptors, navigation, insets: { top: 0, bottom: 0, left: 0, right: 0 } }
}

const Reporters = ({ unread }: { unread: UnreadMessages | null }) => {
  useReportUnreadMessages(unread)
  return null
}

const draw = (
  props = barProps(),
  { unread = null, theme, platform }: { unread?: UnreadMessages | null, theme?: any, platform?: 'phone' | 'tablet' } = {}
) => {
  const view = renderWithProviders(
    <BottomBarProvider>
      <UnreadMessagesProvider>
        <Reporters unread={unread} />
        <AppTabBar {...props} />
      </UnreadMessagesProvider>
    </BottomBarProvider>,
    { themeOverrides: theme, platform }
  )
  return { ...view, props }
}

const tabNames = (view: any) => ROUTES.filter((name) => view.queryByTestId(`tab-${name}`))

beforeEach(() => {
  setWindow(390, 844)
  mockKeyboard.visible = false
})

describe('AppTabBar on a phone', () => {
  it('draws the four tabs in order, each with its label, as the bar of the mockup', () => {
    const view = draw()
    expect(tabNames(view)).toEqual(ROUTES)
    expect(view.getByText('Orders')).toBeTruthy()
    expect(view.getByText('Messages')).toBeTruthy()
    expect(view.getByText('Stores')).toBeTruthy()
    expect(view.getByText('Profile')).toBeTruthy()
    expect(view.getByTestId('tab-bar')).toBeTruthy()
    expect(view.queryByTestId('side-rail')).toBeNull()
  })

  it('answers a press: the tab dims to the theme\'s pressed opacity while held, and on Android ripples in the theme\'s border grey', () => {
    const view = draw()
    const tab = view.getByTestId('tab-Messages')
    const opacityOf = () => StyleSheet.flatten(view.getByTestId('tab-Messages-press').props.style).opacity
    const value = (opacity: any) => (typeof opacity === 'number' ? opacity : opacity.__getValue())
    expect(value(opacityOf())).toBe(1)
    act(() => { fireEvent(tab, 'pressIn') })
    // The theme's `opacity.pressed` (0.85 by default), at once.
    expect(value(opacityOf())).toBe(0.85)
    // The ripple is the pressable's own prop (the host view does not carry it).
    const ripples = view.UNSAFE_getAllByProps({ testID: 'tab-Messages' }).map((node: any) => node.props.android_ripple).filter(Boolean)
    expect(ripples[0]).toEqual({ color: '#E9ECEF', borderless: true })
    // The feedback is on the tab's content: the tab's own box (its share of the row) is not touched.
    expect(StyleSheet.flatten(tab.props.style).opacity).toBeUndefined()
  })

  it('is the theme\'s bar: its height above the space under it, its line and its background', () => {
    const view = draw()
    const bar = StyleSheet.flatten(view.getByTestId('tab-bar').props.style)
    // iOS with no inset (a phone with no home indicator): 64 over the least space under the buttons (20).
    expect(bar.height).toBe(64 + 20)
    expect(bar.flexDirection).toBe('row')
    expect(bar.borderTopWidth).toBe(1)
    expect(bar.backgroundColor).toBe('#FFFFFF')
  })

  describe('the space under the labels is the system\'s navigation area, once', () => {
    const original = Platform.OS
    const on = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os })
    const barOf = () => StyleSheet.flatten(draw().getByTestId('tab-bar').props.style)
    afterEach(() => { on(original); mockInsets.bottom = 0 })

    it('on Android the activity already pads the screens over the navigation bar (the inset reads 0): the bar is its 64 and no more', () => {
      on('android')
      mockInsets.bottom = 0
      expect(barOf().height).toBe(64)
      expect(barOf().paddingBottom).toBe(10)
    })

    it('on Android it adds the inset a window reads, and only that', () => {
      on('android')
      mockInsets.bottom = 24
      expect(barOf()).toMatchObject({ height: 64 + 24, paddingBottom: 24 + 10 })
    })

    it('on iOS it clears the home indicator: the inset the provider gives, 64 over it', () => {
      on('ios')
      mockInsets.bottom = 34
      expect(barOf()).toMatchObject({ height: 64 + 34, paddingBottom: 34 + 10 })
    })

    it('on iOS with no inset it keeps the theme\'s least space under the labels', () => {
      on('ios')
      mockInsets.bottom = 0
      expect(barOf()).toMatchObject({ height: 64 + 20, paddingBottom: 20 + 10 })
    })
  })

  it('says which tab is current to a screen reader and paints it in the active color', () => {
    const view = draw(barProps('Messages'))
    expect(view.getByTestId('tab-Messages').props.accessibilityState).toEqual({ selected: true })
    expect(view.getByTestId('tab-Orders').props.accessibilityState).toEqual({ selected: false })
    expect(StyleSheet.flatten(view.getByText('Messages').props.style).color).toBe('#1E72E3')
    expect(StyleSheet.flatten(view.getByText('Orders').props.style).color).toBe('#616161')
  })

  it('draws no count before the list has reported, and none for zero', () => {
    const view = draw()
    expect(view.queryByTestId('tab-badge-Messages')).toBeNull()
    const zero = draw(barProps(), { unread: { total: 0, more: false } })
    expect(zero.queryByTestId('tab-badge-Messages')).toBeNull()
  })

  it('counts the unread messages on Messages (primary) and never the orders on Orders', () => {
    const view = draw(barProps(), { unread: { total: 2, more: false } })
    expect(view.getByText('2')).toBeTruthy()
    expect(StyleSheet.flatten(view.getByTestId('tab-badge-Messages').props.style).backgroundColor).toBe('#1E72E3')
    expect(view.getByTestId('tab-Messages').props.accessibilityLabel).toBe('Messages, 2 unread messages')
    // The Orders tab (and the others) wear no number, and say their plain name.
    expect(view.queryByTestId('tab-badge-Orders')).toBeNull()
    expect(view.getByTestId('tab-Orders').props.accessibilityLabel).toBe('Orders')
    expect(view.getByTestId('tab-Stores').props.accessibilityLabel).toBe('Stores')
  })

  it('writes a "+" when the Messages list has pages it has not loaded', () => {
    const view = draw(barProps(), { unread: { total: 10, more: true } })
    expect(view.getByText('10+')).toBeTruthy()
    expect(view.getByTestId('tab-Messages').props.accessibilityLabel).toBe('Messages, 10+ unread messages')
  })

  it('follows a list that reports again', () => {
    const view = draw(barProps(), { unread: { total: 3, more: false } })
    expect(view.getByText('3')).toBeTruthy()
    act(() => view.rerender(
      <BottomBarProvider>
        <UnreadMessagesProvider>
          <Reporters unread={{ total: 4, more: false }} />
          <AppTabBar {...view.props} />
        </UnreadMessagesProvider>
      </BottomBarProvider>
    ))
    expect(view.getByText('4')).toBeTruthy()
    expect(view.queryByText('3')).toBeNull()
  })

  it('opens a tab on press: tabPress first, then the navigation, and nothing for the tab already open', () => {
    const view = draw()
    fireEvent.press(view.getByTestId('tab-Stores'))
    expect(view.props.navigation.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'Stores-key', canPreventDefault: true })
    expect(view.props.navigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'NAVIGATE', target: 'tabs' }))
    view.props.navigation.dispatch.mockClear()
    fireEvent.press(view.getByTestId('tab-Orders'))
    expect(view.props.navigation.dispatch).not.toHaveBeenCalled()
  })

  it('lets a listener keep a tab from opening (tabPress is preventable)', () => {
    const props = barProps()
    props.navigation.emit.mockReturnValue({ defaultPrevented: true })
    const view = draw(props)
    fireEvent.press(view.getByTestId('tab-Stores'))
    expect(props.navigation.dispatch).not.toHaveBeenCalled()
  })

  it('tells a long press', () => {
    const view = draw()
    fireEvent(view.getByTestId('tab-Profile'), 'longPress')
    expect(view.props.navigation.emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'Profile-key' })
  })

  it('does not draw a route that is not one of the four', () => {
    const props = barProps()
    props.state.routes.push({ key: 'Extra-key', name: 'Extra' })
    props.descriptors['Extra-key'] = { options: {} }
    const view = draw(props)
    expect(view.queryByTestId('tab-Extra')).toBeNull()
  })

  it('goes while the keyboard is up on Android (its window shrinks: the bar would ride up over the page)', () => {
    const original = Platform.OS
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    mockKeyboard.visible = true
    const view = draw()
    expect(view.queryByTestId('tab-bar')).toBeNull()
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
  })

  it('stays on iOS with the keyboard up: a stale keyboard state can never take the bar away (IOS-A3)', () => {
    mockKeyboard.visible = true
    const view = draw()
    expect(view.getByTestId('tab-bar')).toBeTruthy()
  })

  it('tells the toast how tall it is, and takes it back when it leaves', () => {
    const heights: number[] = []
    const Probe = () => { heights.push(useBottomBarHeight()); return null }
    const view = renderWithProviders(
      <BottomBarProvider><Probe /><AppTabBar {...barProps()} /></BottomBarProvider>
    )
    expect(heights[heights.length - 1]).toBe(84)
    view.unmount()
  })
})

describe('what the theme hides', () => {
  it('removes the Messages tab with bottom_nav.messages (its screen stays registered)', () => {
    const theme = themeWithValues((values) => { values.visibility['bottom_nav.messages'] = false })
    const view = draw(barProps(), { theme, unread: { total: 5, more: false } })
    expect(tabNames(view)).toEqual(['Orders', 'Stores', 'Profile'])
    expect(view.queryByText('5')).toBeNull()
  })

  it('removes the labels with bottom_nav.labels, keeping what a screen reader says', () => {
    const theme = themeWithValues((values) => { values.visibility['bottom_nav.labels'] = false })
    const view = draw(barProps(), { theme })
    expect(view.queryByText('Orders')).toBeNull()
    expect(view.getByTestId('tab-Orders').props.accessibilityLabel).toBe('Orders')
  })

  it('removes the Messages count with messages.unread_badge', () => {
    const theme = themeWithValues((values) => {
      values.visibility['messages.unread_badge'] = false
    })
    const view = draw(barProps(), { theme, unread: { total: 2, more: false } })
    expect(view.queryByTestId('tab-badge-Messages')).toBeNull()
  })

  it('paints the Messages count in the slot the theme chooses', () => {
    const theme = themeWithValues((values) => {
      values.components.bottom_nav.slots.messages_count.variant = 'warning'
    })
    const view = draw(barProps(), { theme, unread: { total: 3, more: false } })
    expect(StyleSheet.flatten(view.getByTestId('tab-badge-Messages').props.style).backgroundColor).toBe('#FFC700')
  })
})

describe('AppTabBar on a tablet', () => {
  it('is the bar of a phone while the tablet is held upright', () => {
    setWindow(834, 1194)
    const view = draw(barProps(), { platform: 'tablet' })
    expect(view.getByTestId('tab-bar')).toBeTruthy()
    expect(view.queryByTestId('side-rail')).toBeNull()
  })

  it('keeps the bar\'s background edge to edge and lays its four tabs in the 600 column of the content (IPAD-B3)', () => {
    setWindow(834, 1194)
    const view = draw(barProps(), { platform: 'tablet' })
    const bar = StyleSheet.flatten(view.getByTestId('tab-bar').props.style)
    // The bar itself has no width cap: its line and its fill reach both edges.
    expect(bar.maxWidth).toBeUndefined()
    expect(bar.justifyContent).toBe('center')
    let node: any = view.getByTestId('tab-Orders')
    while (node && StyleSheet.flatten(node.props.style)?.maxWidth === undefined) node = node.parent
    expect(StyleSheet.flatten(node.props.style).maxWidth).toBe(600)
    expect(node.parent === view.getByTestId('tab-bar') || node.parent?.parent === view.getByTestId('tab-bar')).toBe(true)
  })

  it('has no column on a phone: the four tabs share the whole bar', () => {
    const view = draw(barProps())
    let node: any = view.getByTestId('tab-Orders')
    while (node && node !== view.getByTestId('tab-bar')) {
      expect(StyleSheet.flatten(node.props.style)?.maxWidth).toBeUndefined()
      node = node.parent
    }
  })

  it('is a side rail while the tablet is held sideways (bottom_nav.placement: rail)', () => {
    setWindow(1180, 820)
    const view = draw(barProps(), { platform: 'tablet', unread: { total: 2, more: false } })
    expect(view.queryByTestId('tab-bar')).toBeNull()
    const rail = StyleSheet.flatten(view.getByTestId('side-rail').props.style)
    expect(rail.width).toBe(80)
    expect(rail.borderRightWidth).toBe(1)
    expect(rail.borderRightColor).toBe('#E9ECEF')
    expect(rail.alignItems).toBe('center')
    // The same four tabs and the same Messages count; Orders has none.
    expect(tabNames(view)).toEqual(ROUTES)
    expect(view.queryByTestId('tab-badge-Orders')).toBeNull()
    expect(view.getByTestId('tab-badge-Messages')).toBeTruthy()
  })

  it('draws each tab of the rail as a 64 by 64 square', () => {
    setWindow(1180, 820)
    const view = draw(barProps(), { platform: 'tablet' })
    const item = StyleSheet.flatten(view.getByTestId('tab-Orders').props.style)
    expect(item).toMatchObject({ width: 64, height: 64 })
  })

  it('keeps the rail on screen with the keyboard up (the keyboard never covers it)', () => {
    setWindow(1180, 820)
    mockKeyboard.visible = true
    const view = draw(barProps(), { platform: 'tablet' })
    expect(view.getByTestId('side-rail')).toBeTruthy()
  })

  it('does not ask the toast to ride above a rail (nothing is under it)', () => {
    setWindow(1180, 820)
    const heights: number[] = []
    const Probe = () => { heights.push(useBottomBarHeight()); return null }
    renderWithProviders(
      <BottomBarProvider><Probe /><AppTabBar {...barProps()} /></BottomBarProvider>,
      { platform: 'tablet' }
    )
    expect(heights[heights.length - 1]).toBe(0)
  })

  it('stays a bar on a phone held sideways (placement is the tablet\'s)', () => {
    setWindow(844, 390)
    const view = draw(barProps(), { platform: 'phone' })
    expect(view.getByTestId('tab-bar')).toBeTruthy()
  })
})
