import React from 'react'
import { Text } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => require('./mocks').componentsMock())
jest.mock('@/printing/usePrinting', () => require('./mocks').printingMock())
jest.mock('react-native-maps', () => require('./mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))
jest.mock('react-native-map-link', () => ({ getApps: jest.fn(async () => []) }))

import { OrderActionsHost, orderActions, useOrderActions } from '..'
import { getRequest } from '../store'
import { order, renderHost, resetTestState, testState } from './setup'

describe('the action host', () => {
  beforeEach(() => resetTestState())

  it('is the same object for every screen and render', () => {
    expect(useOrderActions()).toBe(orderActions)
    expect(useOrderActions()).toBe(useOrderActions())
    for (const name of ['openAccept', 'openReject', 'openPrepTime', 'openAssignDriver', 'openMore', 'openForceStatus', 'openMap', 'openReview', 'close']) {
      expect(typeof (orderActions as any)[name]).toBe('function')
    }
  })

  it('draws nothing until a sheet is asked for', async () => {
    const { screen } = await renderHost(OrderActionsHost)
    expect(screen.queryByTestId('order-sheet')).toBeNull()
    expect(screen.queryByTestId('order-map')).toBeNull()
  })

  it('renders the printing banner and canvas of the printing facade', async () => {
    testState.printing = { host: <Text testID='printing-host'>printing</Text>, autoTargets: [], printOrder: jest.fn() }
    const { screen } = await renderHost(OrderActionsHost)
    expect(screen.getByTestId('printing-host')).toBeTruthy()
  })

  it('opens another sheet over the first with a clean state, and the first one\'s screen is not told it was done', async () => {
    const { screen } = await renderHost(OrderActionsHost)
    const onClosed = jest.fn()
    await act(async () => { orderActions.openAccept(order(), { changeStatus: jest.fn(), defaultMinutes: 45, onClosed }) })
    expect(screen.getByText('Accept · 45 min')).toBeTruthy()
    await act(async () => { orderActions.openAccept(order({ id: 7 }), { changeStatus: jest.fn() }) })
    expect(screen.getByText('Accept order #7')).toBeTruthy()
    expect(screen.getByText('Accept · 20 min')).toBeTruthy()
  })

  it('closes with close() and tells the screen once', async () => {
    const { screen } = await renderHost(OrderActionsHost)
    const onClosed = jest.fn()
    await act(async () => { orderActions.openReject(order(), { changeStatus: jest.fn(), onClosed }) })
    await act(async () => { orderActions.close(); orderActions.close() })
    expect(getRequest()).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(screen).toBeTruthy()
  })

  describe('the map', () => {
    it('opens full-screen from anywhere and closes with its back button', async () => {
      const { screen } = await renderHost(OrderActionsHost)
      const onClosed = jest.fn()
      await act(async () => { orderActions.openMap(order({ status: 9 }), { onClosed }) })
      expect(screen.getByTestId('order-map')).toBeTruthy()
      expect(screen.queryByTestId('order-sheet')).toBeNull()
      await act(async () => { fireEvent.press(screen.getByLabelText('Go back')) })
      expect(getRequest()).toBeNull()
      expect(onClosed).toHaveBeenCalled()
    })
  })

  describe('the review', () => {
    it('opens full-screen with the level chosen and sends through the controller', async () => {
      const { screen } = await renderHost(OrderActionsHost)
      await act(async () => { orderActions.openReview(order({ status: 1 }), { qualification: 4 }) })
      expect(screen.getByTestId('rating-scale')).toBeTruthy()
      expect(screen.getByTestId('rating-level-4').props.accessibilityState.selected).toBe(true)
      await act(async () => { fireEvent.press(screen.getByTestId('review-send')) })
      expect(testState.reviewSent).toHaveBeenCalledWith(expect.objectContaining({ qualification: 4 }))
    })

    it('closes after a group\'s custom review was sent', async () => {
      const { screen } = await renderHost(OrderActionsHost)
      const handleCustomCustomerReview = jest.fn(async () => undefined)
      await act(async () => { orderActions.openReview(order({ status: 1 }), { handleCustomCustomerReview }) })
      await act(async () => { fireEvent.press(screen.getByTestId('rating-level-5')) })
      await act(async () => { fireEvent.press(screen.getByTestId('review-send')) })
      expect(handleCustomCustomerReview).toHaveBeenCalledWith({ qualification: 5, comment: '' })
      await waitFor(() => expect(getRequest()).toBeNull())
    })
  })

  describe('on a tablet', () => {
    it('draws every sheet as the same content in a centered card (no handle)', async () => {
      const { screen } = await renderHost(OrderActionsHost, { platform: 'tablet' })
      await act(async () => { orderActions.openReject(order(), { changeStatus: jest.fn() }) })
      expect(screen.getByTestId('order-sheet-reject')).toBeTruthy()
      expect(screen.queryByTestId('sheet-handle', { includeHiddenElements: true })).toBeNull()
      await act(async () => { orderActions.openMore(order({ status: 7 }), {}) })
      expect(screen.getByTestId('order-sheet-more')).toBeTruthy()
    })

    it('has the sheet over a phone with its handle', async () => {
      const { screen } = await renderHost(OrderActionsHost)
      await act(async () => { orderActions.openReject(order(), { changeStatus: jest.fn() }) })
      expect(screen.getByTestId('sheet-handle', { includeHiddenElements: true })).toBeTruthy()
    })
  })
})
