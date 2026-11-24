import React from 'react'
import { AccessibilityInfo, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

// The real toast of the logic (its provider and hooks), so the notice is the one the owner sees.
jest.mock('@components', () => ({
  ...require('./mocks').componentsMock(),
  ...require('../../../../../@/components/src/contexts/ToastContext')
}))
jest.mock('@/printing/usePrinting', () => require('./mocks').printingMock())
jest.mock('react-native-maps', () => require('./mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))
jest.mock('react-native-map-link', () => ({ getApps: jest.fn(async () => []) }))

import { ToastProvider } from '@components'
import { OrderActionsHost } from '..'
import { OToast } from '../../shared'
import { orderActions } from '../useOrderActions'
import { ACCEPTED_NOTICE_MS } from '../constants'
import { offline, order, renderHost, resetTestState } from './setup'

const Host = () => (
  <ToastProvider>
    <OrderActionsHost />
    <OToast />
  </ToastProvider>
)

const press = async (screen: any, id: string) => {
  await act(async () => { fireEvent.press(screen.getByTestId(id)) })
}

const answer = (...ids: number[]) => jest.fn(async () => ids.map((id) => ({ id, result: { id }, error: false })))

describe('the notice after an accepted order', () => {
  beforeEach(() => {
    resetTestState()
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  const open = async (opts: any, offlineValue?: any, target = order()) => {
    const { screen } = await renderHost(Host, { offlineValue })
    await act(async () => { orderActions.openAccept(target, opts) })
    return screen
  }

  describe('from a list', () => {
    it('says "Order #1053 accepted" with "View order" once the change was sent', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder: jest.fn() })
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      await press(screen, 'order-action')
      expect(screen.getByText('Order #1053 accepted')).toBeTruthy()
      expect(screen.getByText('View order')).toBeTruthy()
    })

    it('shows at the top, under the header: never over the buttons of the next order of the list', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder: jest.fn() })
      await press(screen, 'order-action')
      let place: any
      for (let up: any = screen.getByText('Order #1053 accepted').parent; up && !place; up = up.parent) {
        const style = StyleSheet.flatten(up.props?.style)
        if (style?.top !== undefined || style?.bottom !== undefined) place = style
      }
      expect(place.top).toBeGreaterThan(0)
      expect(place.bottom).toBeUndefined()
    })

    it('shows the accepted order to "View order" (the same call a tap on its card makes) and hides the notice', async () => {
      const viewOrder = jest.fn()
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder })
      await press(screen, 'order-action')
      await press(screen, 'accepted-notice-view')
      expect(viewOrder).toHaveBeenCalledTimes(1)
      expect(viewOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 1053, status: 7, prepared_in: 20 }))
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      expect(screen.queryByText('View order')).toBeNull()
    })

    it('has the action as a button of 44 or more, and a screen reader is told of the notice and the action', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder: jest.fn() })
      await press(screen, 'order-action')
      const action = screen.getByTestId('accepted-notice-view')
      expect(action.props.accessibilityRole).toBe('button')
      expect(action.props.accessibilityLabel).toBe('View order')
      const style = StyleSheet.flatten(action.props.style)
      expect(style.minHeight).toBeGreaterThanOrEqual(44)
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Order #1053 accepted. View order')
    })

    it('lets every touch through but the action\'s', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder: jest.fn() })
      await press(screen, 'order-action')
      const holders: any[] = []
      for (let node = screen.getByText('Order #1053 accepted').parent; node; node = node.parent) holders.push(node)
      const withPointer = holders.filter((node) => node.props.pointerEvents !== undefined)
      expect(withPointer.length).toBeGreaterThan(0)
      // Nothing between the text and the root takes a touch: the box and its holders are `box-none`, the text's one `none`.
      expect(withPointer.every((node) => ['box-none', 'none'].includes(node.props.pointerEvents))).toBe(true)
      expect(withPointer.some((node) => node.props.pointerEvents === 'box-none')).toBe(true)
      expect(screen.getByTestId('accepted-notice-view').props.pointerEvents).toBeUndefined()
    })

    it('names the number of orders of a group and has no action', async () => {
      const orders = [order({ id: 11 }), order({ id: 12 }), order({ id: 13 })]
      const screen = await open({ orders, handleChangeOrderStatus: answer(11, 12, 13), from: 'list', viewOrder: jest.fn() }, undefined, orders[0])
      await press(screen, 'order-action')
      expect(screen.getByText('3 orders accepted')).toBeTruthy()
      expect(screen.queryByText('View order')).toBeNull()
      expect(screen.queryByTestId('accepted-notice-view')).toBeNull()
    })

    it('has no action when the caller gave none to go to the order', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list' })
      await press(screen, 'order-action')
      expect(screen.getByText('Order #1053 accepted')).toBeTruthy()
      expect(screen.queryByText('View order')).toBeNull()
    })

    it('goes after the time on screen, and the action goes with it', async () => {
      jest.useFakeTimers()
      const viewOrder = jest.fn()
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder })
      await press(screen, 'order-action')
      expect(screen.getByText('Order #1053 accepted')).toBeTruthy()
      act(() => { jest.advanceTimersByTime(ACCEPTED_NOTICE_MS - 500) })
      expect(screen.getByText('Order #1053 accepted')).toBeTruthy()
      act(() => { jest.advanceTimersByTime(2000) })
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      expect(screen.queryByTestId('accepted-notice-view')).toBeNull()
      expect(viewOrder).not.toHaveBeenCalled()
    })

    it('stays about five seconds', () => {
      expect(ACCEPTED_NOTICE_MS).toBe(5000)
    })

    it('goes when another notice replaces it, and the new one has no action', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053), from: 'list', viewOrder: jest.fn() })
      await press(screen, 'order-action')
      expect(screen.getByText('View order')).toBeTruthy()
      await act(async () => {
        orderActions.openAccept(order({ id: 7 }), { handleChangeOrderStatus: answer(7), from: 'list', viewOrder: undefined })
      })
      await press(screen, 'order-action')
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      expect(screen.getByText('Order #7 accepted')).toBeTruthy()
      expect(screen.queryByText('View order')).toBeNull()
    })
  })

  describe('and never', () => {
    it('from the order\'s own details (the screen or the board\'s panel)', async () => {
      const screen = await open({ changeStatus: jest.fn(async () => ({ id: 1053, status: 7 })), from: 'details', viewOrder: jest.fn() })
      await press(screen, 'order-action')
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      expect(screen.queryByText('View order')).toBeNull()
    })

    it('from a caller that did not say where it started', async () => {
      const screen = await open({ handleChangeOrderStatus: answer(1053) })
      await press(screen, 'order-action')
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
    })

    it('when the change failed: the sheet stays open with its message and no notice shows', async () => {
      const handleChangeOrderStatus = jest.fn(async () => [{ id: 1053, result: ['Order not available'], error: true }])
      const screen = await open({ handleChangeOrderStatus, from: 'list', viewOrder: jest.fn() })
      await press(screen, 'order-action')
      expect(screen.getByTestId('order-action-error')).toBeTruthy()
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      expect(screen.queryByText('View order')).toBeNull()
    })

    it('when the change was only queued offline (the card shows it pending, as before)', async () => {
      const queued = offline({ isNetConnected: false, canSaveChangesOffline: true })
      const handleChangeOrderStatus = jest.fn()
      const screen = await open({ handleChangeOrderStatus, from: 'list', viewOrder: jest.fn() }, queued.value)
      await press(screen, 'order-action')
      expect(queued.applyOffAction).toHaveBeenCalled()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(screen.queryByText('Order #1053 accepted')).toBeNull()
      expect(screen.queryByText('View order')).toBeNull()
    })
  })
})
