import React from 'react'
import { Modal, Platform, Text } from 'react-native'
import { act } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import OModal from '../OModal'
import OBottomPopup from '../OBottomPopup'
import LoadingOverlay from '../LoadingOverlay'
import { ConfirmDialogHost } from '../ConfirmDialogHost'
import { presentConfirm } from '../confirmAction'

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

setupSharedComponentHooks()

/**
 * Android's navigation bar (a phone's gesture pill, a tablet's taskbar) is not part of a modal's window
 * unless the modal asks for it: a centred dialog's scrim then stops above it and the strip under stays
 * undimmed (TAB-B3). Every modal of the app covers the whole display and pads by the insets its own
 * `SafeAreaProvider` measures.
 */
describe('the modals cover the whole window', () => {
  const props = (ui: React.ReactElement) => renderWithProviders(ui).UNSAFE_getByType(Modal).props

  it('a dialog', () => {
    const p = props(<OModal open box title='Dialog' onClose={jest.fn()}><Text>Body</Text></OModal>)
    expect(p.statusBarTranslucent).toBe(true)
    expect(p.navigationBarTranslucent).toBe(true)
  })

  it('a full-screen page', () => {
    const p = props(<OModal open entireModal hideIcons title='Page' onClose={jest.fn()}><Text>Body</Text></OModal>)
    expect(p.statusBarTranslucent).toBe(true)
    expect(p.navigationBarTranslucent).toBe(true)
  })

  it('a sheet', () => {
    const p = props(<OBottomPopup open title='Sheet' onClose={jest.fn()}><Text>Body</Text></OBottomPopup>)
    expect(p.statusBarTranslucent).toBe(true)
    expect(p.navigationBarTranslucent).toBe(true)
  })

  it('the loading overlay', () => {
    const p = props(<LoadingOverlay visible />)
    expect(p.statusBarTranslucent).toBe(true)
    expect(p.navigationBarTranslucent).toBe(true)
  })
})

/**
 * iOS shows a Modal in portrait unless it is told otherwise, whatever the screen under it does: an iPad turned upside down
 * drew the review page upside down (IPAD2-B3). A modal allows what the screen under it allows: every orientation on a tablet
 * (it rotates freely), portrait on a phone (it is locked to it).
 */
describe('the modals turn with the screen under them', () => {
  const TABLET = ['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']
  const orientationsOf = (ui: React.ReactElement, platform: 'phone' | 'tablet') => renderWithProviders(ui, { platform }).UNSAFE_getByType(Modal).props.supportedOrientations
  const page = <OModal open entireModal hideIcons title='Page' onClose={jest.fn()}><Text>Body</Text></OModal>
  const dialog = <OModal open box title='Dialog' onClose={jest.fn()}><Text>Body</Text></OModal>
  const sheet = <OBottomPopup open title='Sheet' onClose={jest.fn()}><Text>Body</Text></OBottomPopup>

  it.each([['a page', page], ['a dialog', dialog], ['a sheet', sheet], ['the loading overlay', <LoadingOverlay visible />]])('%s: all four on a tablet, portrait on a phone', (_name, ui) => {
    expect(orientationsOf(ui as React.ReactElement, 'tablet')).toEqual(TABLET)
    expect(orientationsOf(ui as React.ReactElement, 'phone')).toEqual(['portrait'])
  })

  it('the confirmation dialog (the Modal it is on Android)', () => {
    const original = Platform.OS
    Platform.OS = 'android'
    try {
      for (const [platform, expected] of [['tablet', TABLET], ['phone', ['portrait']]] as const) {
        const view = renderWithProviders(<ConfirmDialogHost />, { platform })
        act(() => { presentConfirm({ title: 'Log out?', acceptText: 'Log out', cancelText: 'Cancel' }) })
        expect(view.UNSAFE_getByType(Modal).props.supportedOrientations).toEqual(expected)
        view.unmount()
      }
    } finally {
      Platform.OS = original
    }
  })
})
