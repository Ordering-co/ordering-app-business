import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { Platform } from 'react-native'
import DeviceInfo from 'react-native-device-info'

import { DeviceOrientationMethods } from '@ui'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import MyOrders from '../MyOrders'

describe('MyOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(DeviceOrientationMethods.useDeviceOrientation as jest.Mock).mockReturnValue([{
      orientation: 'portrait',
      dimensions: { width: 390, height: 844 }
    }])
    ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(false)
    Platform.OS = 'ios'
    ;(Platform as any).isPad = false
  })

  it('renders orders option on phone portrait', () => {
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-option')).toBeTruthy()
    expect(getByTestId('orders-option-business').props.children).toBe('business')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('renders orders list manager on tablet landscape', () => {
    ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(true)
    ;(DeviceOrientationMethods.useDeviceOrientation as jest.Mock).mockReturnValue([{
      orientation: 'landscape',
      dimensions: { width: 1200, height: 800 }
    }])
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-list-manager')).toBeTruthy()
    expect(getByTestId('orders-list-manager-business').props.children).toBe('business')
  })

  it('renders orders list manager on wide tablet portrait', () => {
    ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(true)
    ;(DeviceOrientationMethods.useDeviceOrientation as jest.Mock).mockReturnValue([{
      orientation: 'portrait',
      dimensions: { width: 1024, height: 1366 }
    }])
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-list-manager')).toBeTruthy()
  })

  it('keeps orders option on phone landscape', () => {
    ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(false)
    ;(DeviceOrientationMethods.useDeviceOrientation as jest.Mock).mockReturnValue([{
      orientation: 'landscape',
      dimensions: { width: 873, height: 392 }
    }])
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-option')).toBeTruthy()
  })

  it('keeps orders option on narrow tablet portrait', () => {
    ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(true)
    ;(DeviceOrientationMethods.useDeviceOrientation as jest.Mock).mockReturnValue([{
      orientation: 'portrait',
      dimensions: { width: 800, height: 1280 }
    }])
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-option')).toBeTruthy()
  })

  it('navigates on redirect and skips empty page', () => {
    const { getByTestId, navigation } = renderPage(MyOrders)
    fireEvent.press(getByTestId('orders-option-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 5 })
    fireEvent.press(getByTestId('orders-option-nav-empty'))
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })
})
