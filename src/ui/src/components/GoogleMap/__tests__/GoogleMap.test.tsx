import React from 'react'
import { Linking, PanResponder, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => require('../../OrderActions/__tests__/mocks').componentsMock())
jest.mock('react-native-maps', () => require('../../OrderActions/__tests__/mocks').mapsMock())
jest.mock('react-native-map-link', () => ({ getApps: jest.fn() }))

import { getApps } from 'react-native-map-link'
import { GoogleMap } from '..'
import { toMapPoint, orderMapPoints } from '../mapPoints'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { testState, resetTestState } from '../../OrderActions/__tests__/setup'

const order = (extra: any = {}) => ({
  id: 1044,
  status: 9,
  delivery_type: 1,
  business: { name: 'Luna Pizza', location: { lat: 40.1, lng: -3.1 } },
  customer: { name: 'Nora', location: { lat: 40.2, lng: -3.2 } },
  driver: { id: 4, name: 'Omar', lastname: 'Haddad', cellphone: '4155550123', country_phone_code: '1', location: { lat: 40.15, lng: -3.15 } },
  driver_id: 4,
  ...extra
})

describe('the order map', () => {
  beforeEach(() => {
    resetTestState()
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any)
    ;(getApps as jest.Mock).mockReset()
  })

  it('draws the store, the customer and the driver as the app\'s markers', () => {
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />)
    expect(screen.getByTestId('map-view')).toBeTruthy()
    expect(screen.getAllByTestId('map-marker')).toHaveLength(3)
    for (const party of ['store', 'customer', 'driver']) expect(screen.getByTestId(`map-marker-${party}`)).toBeTruthy()
  })

  it('draws only what has a position', () => {
    const screen = renderWithProviders(<GoogleMap order={order({ driver: null, driver_id: null, customer: { name: 'N' } })} onClose={jest.fn()} />)
    expect(screen.getAllByTestId('map-marker')).toHaveLength(1)
    expect(screen.getByTestId('map-marker-store')).toBeTruthy()
  })

  it('does not break with no coordinates at all: it says so and still lets the user leave', () => {
    const onClose = jest.fn()
    const screen = renderWithProviders(<GoogleMap order={order({ business: {}, customer: {}, driver: null })} onClose={onClose} />)
    expect(screen.queryByTestId('map-view')).toBeNull()
    expect(screen.getByTestId('order-map-empty')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Go back'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has the order number, the driver and the status in the card, and no accept', () => {
    const screen = renderWithProviders(<GoogleMap order={order({ status: 0 })} onClose={jest.fn()} />)
    expect(screen.getByText('Order #1044')).toBeTruthy()
    expect(screen.getByTestId('order-map-line').props.children).toMatch(/^Omar H\. · /)
    expect(screen.queryByText('Accept')).toBeNull()
  })

  it('writes the external id when the project shows it', () => {
    testState.configs = { change_order_id: { value: '1' } }
    const screen = renderWithProviders(<GoogleMap order={order({ external_id: 'EXT-9' })} onClose={jest.fn()} />)
    expect(screen.getByText('Order #EXT-9')).toBeTruthy()
  })

  it('calls the driver, and has no call without a phone', () => {
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />)
    fireEvent.press(screen.getByTestId('order-map-call-driver'))
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+14155550123')
    const without = renderWithProviders(<GoogleMap order={order({ driver: { id: 4, name: 'Omar', location: { lat: 1, lng: 1 } } })} onClose={jest.fn()} />)
    expect(without.queryByTestId('order-map-call-driver')).toBeNull()
  })

  it('moves the driver\'s disc with the tracking events of that driver only', async () => {
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />)
    const before = screen.getAllByTestId('map-marker').map((node: any) => node.props.coordinate)
    await act(async () => { testState.socketHandlers.tracking_driver({ driver_id: 99, location: { lat: 1, lng: 1 } }) })
    expect(screen.getAllByTestId('map-marker').map((node: any) => node.props.coordinate)).toEqual(before)
    await act(async () => { testState.socketHandlers.tracking_driver({ driver_id: 4, location: { lat: 40.18, lng: -3.18 } }) })
    expect(screen.getAllByTestId('map-marker').map((node: any) => node.props.coordinate)).toContainEqual({ latitude: 40.18, longitude: -3.18 })
  })

  it('takes the position the caller already tracks', () => {
    const screen = renderWithProviders(<GoogleMap order={order()} driverLocation={{ lat: '40.3', lng: '-3.3' }} onClose={jest.fn()} />)
    expect(screen.getAllByTestId('map-marker').map((node: any) => node.props.coordinate)).toContainEqual({ latitude: 40.3, longitude: -3.3 })
  })

  describe('Open in Maps', () => {
    it('lists the maps apps of the device and opens the route in the chosen one', async () => {
      const open = jest.fn(async () => undefined)
      ;(getApps as jest.Mock).mockResolvedValue([{ id: 'google', name: 'Google Maps', icon: 1, open }])
      const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />)
      await act(async () => { fireEvent.press(screen.getByTestId('order-map-open-maps')) })
      expect(getApps).toHaveBeenCalledWith(expect.objectContaining({ latitude: 40.2, longitude: -3.2, alwaysIncludeGoogle: true }))
      await waitFor(() => expect(screen.getByText('Google Maps')).toBeTruthy())
      await act(async () => { fireEvent.press(screen.getByText('Google Maps')) })
      expect(open).toHaveBeenCalledTimes(1)
    })

    it('is hidden when the theme turns it off', () => {
      const themeOverrides = themeWithValues((values) => { values.visibility['map.other_maps'] = false })
      const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />, { themeOverrides })
      expect(screen.queryByTestId('order-map-open-maps')).toBeNull()
    })
  })

  it('is the same map on a tablet', () => {
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />, { platform: 'tablet' })
    expect(screen.getAllByTestId('map-marker')).toHaveLength(3)
  })
})

describe('the map points', () => {
  it('reads numbers and numeric strings, and refuses what is not a position', () => {
    expect(toMapPoint({ lat: '1.5', lng: 2 })).toEqual({ latitude: 1.5, longitude: 2 })
    // (0, 0) is a place never located, not a position; one axis at 0 is.
    expect(toMapPoint({ lat: 0, lng: 0 })).toBeNull()
    expect(toMapPoint({ lat: 0, lng: 12 })).toEqual({ latitude: 0, longitude: 12 })
    expect(toMapPoint({ lat: '', lng: 1 })).toBeNull()
    expect(toMapPoint({ lat: 'x', lng: 1 })).toBeNull()
    expect(toMapPoint(null)).toBeNull()
  })

  it('takes the given driver position over the order\'s', () => {
    const points = orderMapPoints(order(), { lat: 1, lng: 2 })
    expect(points.driver).toEqual({ latitude: 1, longitude: 2 })
    expect(orderMapPoints(order()).driver).toEqual({ latitude: 40.15, longitude: -3.15 })
  })

  it('has a back button that is not the small black square, and leaves with it', () => {
    const onClose = jest.fn()
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={onClose} />)
    const back = screen.getByTestId('order-map-back')
    const look = StyleSheet.flatten(back.children[0].props.style)
    expect(look.width).toBeGreaterThanOrEqual(44)
    expect(look.height).toBeGreaterThanOrEqual(44)
    expect(look.borderRadius).toBeGreaterThanOrEqual(look.width / 2)
    expect(look.backgroundColor).not.toBe('#000000')
    fireEvent.press(back)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves on a swipe to the right from the left edge, and not on a short or a vertical one', () => {
    const create = jest.spyOn(PanResponder, 'create')
    const onClose = jest.fn()
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={onClose} />)
    expect(screen.getByTestId('order-map-swipe-edge')).toBeTruthy()
    const config: any = create.mock.calls[create.mock.calls.length - 1][0]
    expect(config.onStartShouldSetPanResponder()).toBe(true)
    config.onPanResponderRelease({}, { dx: 20, dy: 0 })
    config.onPanResponderRelease({}, { dx: 120, dy: 200 })
    expect(onClose).not.toHaveBeenCalled()
    config.onPanResponderRelease({}, { dx: 120, dy: 10 })
    expect(onClose).toHaveBeenCalledTimes(1)
    create.mockRestore()
  })

  it('frames the markers below the system top, never under the status bar or the island', () => {
    const insets = require('react-native-safe-area-context')
    const spy = jest.spyOn(insets, 'useSafeAreaInsets').mockReturnValue({ top: 62, bottom: 34, left: 0, right: 0 })
    renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />)
    const options = testState.mapFit.mock.calls[testState.mapFit.mock.calls.length - 1][1]
    expect(options.edgePadding.top).toBeGreaterThan(62)
    expect(options.edgePadding.top).toBeGreaterThan(options.edgePadding.bottom)
    spy.mockRestore()
  })

  it('frames the markers again when the map\'s size changes (a rotation), and not for the same size twice (T3-C3)', () => {
    const screen = renderWithProviders(<GoogleMap order={order()} onClose={jest.fn()} />)
    const root = screen.getByTestId('order-map')
    const layout = (width: number, height: number) => act(() => { fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } }) })
    layout(834, 1210)
    const before = testState.mapFit.mock.calls.length
    expect(before).toBeGreaterThan(0)
    layout(834, 1210)
    expect(testState.mapFit.mock.calls.length).toBe(before)
    layout(1210, 834)
    expect(testState.mapFit.mock.calls.length).toBe(before + 1)
    expect(testState.mapFit.mock.calls[before][0]).toHaveLength(3)
  })

  it('names status 4 as every other screen does: "Ready for pickup"', () => {
    const screen = renderWithProviders(<GoogleMap order={order({ status: 4, driver: null, driver_id: null })} onClose={jest.fn()} />)
    expect(screen.getByTestId('order-map-line').props.children).toBe('Ready for pickup')
  })
})

describe('the room the order map keeps around its markers', () => {
  const { fitRoom } = require('..')

  it('is a disc and a half on a phone, so no marker sits against an edge', () => {
    expect(fitRoom(44, 411)).toBe(66)
  })

  it('grows with the map on a tablet (a share of the side it is measured on)', () => {
    expect(fitRoom(44, 1280)).toBe(179)
    expect(fitRoom(44, 1280)).toBeGreaterThan(fitRoom(44, 411))
  })

  it('is never under the disc and a half, whatever the map measured (nothing yet, or a card taller than it)', () => {
    expect(fitRoom(44, 0)).toBe(66)
    expect(fitRoom(44, -120)).toBe(66)
  })
})
