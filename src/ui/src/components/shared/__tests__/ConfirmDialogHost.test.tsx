import React from 'react'
import { Alert, Modal, Platform, StyleSheet, View } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderHook } from '@testing-library/react-native'

const { captureDialogs } = require('../../../../../../jest/helpers/confirmDialogs')
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import { defaultAppTheme } from '../../../../../theme/engine'
import { ConfirmDialogHost } from '../ConfirmDialogHost'
import { presentConfirm, useConfirm, useNotice } from '../confirmAction'

setupSharedComponentHooks()

const ask = (options: any = {}) => act(() => {
  presentConfirm({ title: 'Ordering', message: 'Sure?', acceptText: 'Delete', cancelText: 'Cancel', onAccept: jest.fn(), ...options })
})
const background = (node: any) => StyleSheet.flatten(node.findByType(View).props.style)?.backgroundColor

describe('the app\'s themed confirmation dialog', () => {
  afterEach(() => jest.restoreAllMocks())

  it('draws nothing until something is asked, and never the system alert once it is mounted', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { toJSON, getByText } = renderWithProviders(<ConfirmDialogHost />)
    expect(toJSON()).toBeNull()
    ask()
    expect(getByText('Ordering')).toBeTruthy()
    expect(getByText('Sure?')).toBeTruthy()
    expect(alert).not.toHaveBeenCalled()
  })

  it('has Cancel on the left and the accept button on the right, and fires nothing until a button is pressed', () => {
    const onAccept = jest.fn()
    const onCancel = jest.fn()
    const { getByTestId, getByText, queryByTestId, toJSON } = renderWithProviders(<ConfirmDialogHost />)
    ask({ onAccept, onCancel })
    const text = JSON.stringify(toJSON())
    expect(text.indexOf('Cancel')).toBeLessThan(text.indexOf('Delete'))
    expect(onAccept).not.toHaveBeenCalled()
    fireEvent.press(getByText('Delete'))
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(queryByTestId('confirm-dialog')).toBeNull()
    ask({ onAccept, onCancel })
    fireEvent.press(getByTestId('confirm-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('paints a destructive accept in the danger look and any other in the primary one', () => {
    const { getByTestId } = renderWithProviders(<ConfirmDialogHost />)
    ask({ destructive: true })
    const danger = background(getByTestId('confirm-accept'))
    fireEvent.press(getByTestId('confirm-cancel'))
    ask()
    const primary = background(getByTestId('confirm-accept'))
    const buttons = (defaultAppTheme() as any).native.components.button.variants
    expect(danger).toBe(buttons.danger.solid.background)
    expect(primary).toBe(buttons.primary.solid.background)
  })

  it('is a notice with one button when it only tells something', () => {
    const onAccept = jest.fn()
    const { getByTestId, queryByTestId, queryByText } = renderWithProviders(<ConfirmDialogHost />)
    ask({ notice: true, acceptText: 'Ok', onAccept })
    expect(queryByTestId('confirm-cancel')).toBeNull()
    expect(queryByText('Cancel')).toBeNull()
    fireEvent.press(getByTestId('confirm-accept'))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('takes one dialog at a time: the next waits for the first to be answered', () => {
    const { getByText, queryByText } = renderWithProviders(<ConfirmDialogHost />)
    ask({ title: 'First', message: 'one', acceptText: 'Yes one' })
    ask({ title: 'Second', message: 'two', acceptText: 'Yes two' })
    expect(queryByText('Second')).toBeNull()
    fireEvent.press(getByText('Yes one'))
    expect(getByText('Second')).toBeTruthy()
    expect(queryByText('First')).toBeNull()
  })

  describe('the way out', () => {
    afterEach(() => { jest.replaceProperty(Platform, 'OS', 'ios') })

    it('is the hardware back key on Android: it cancels a question and closes a notice (a Modal, which stacks over a sheet)', () => {
      jest.replaceProperty(Platform, 'OS', 'android')
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ onAccept, onCancel })
      act(() => view.UNSAFE_getByType(Modal).props.onRequestClose())
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onAccept).not.toHaveBeenCalled()
      expect(view.queryByTestId('confirm-dialog')).toBeNull()
      ask({ notice: true, acceptText: 'Ok', onAccept, onCancel })
      act(() => view.UNSAFE_getByType(Modal).props.onRequestClose())
      expect(onAccept).toHaveBeenCalledTimes(1)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('has no Modal on iOS: it is a window of its own over the app, so it shows over a sheet too', () => {
      jest.replaceProperty(Platform, 'OS', 'ios')
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask()
      expect(view.UNSAFE_queryAllByType(Modal)).toHaveLength(0)
      expect(view.getByTestId('confirm-dialog')).toBeTruthy()
    })
  })

  describe('what asks goes through it', () => {
    it('useConfirm and useNotice ask the host, with the app\'s name and the usual words', () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      const dialogs = captureDialogs()
      const { result } = renderHook(() => ({ confirm: useConfirm(), notify: useNotice() }))
      result.current.confirm({ message: 'Log out?', acceptText: 'Logout', destructive: true, onAccept: jest.fn() })
      expect(dialogs.last()).toEqual(expect.objectContaining({ title: 'Logout?', message: 'Log out?', acceptText: 'Logout', cancelText: 'Cancel', destructive: true }))
      result.current.notify({ message: 'Link failed' })
      expect(dialogs.last()).toEqual(expect.objectContaining({ title: '', message: 'Link failed', acceptText: 'Ok', notice: true }))
      expect(alert).not.toHaveBeenCalled()
      dialogs.off()
    })

    it('falls back to the system alert only while no host is mounted, and again once it is gone', () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      ask({ title: 'Early' })
      expect(alert).toHaveBeenCalledTimes(1)
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'Hosted' })
      expect(alert).toHaveBeenCalledTimes(1)
      view.unmount()
      ask({ title: 'After' })
      expect(alert).toHaveBeenCalledTimes(2)
    })
  })
})
