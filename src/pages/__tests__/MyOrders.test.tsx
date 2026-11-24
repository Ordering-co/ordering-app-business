import React from 'react'
import { Text } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import DeviceInfo from 'react-native-device-info'

// `@ui` as the page uses it: the list, the layout wrappers and, once area `ordersLive` exports it, the board.
jest.mock('@ui', () => ({
  __esModule: true,
  OrdersOption: (props: any) => { const { Text: T } = require('react-native'); return <T testID='orders-option' onPress={() => props.onNavigationRedirect('OrderDetails', { orderId: 5 })}>{String(props.isNetConnected)}</T> },
  SafeAreaContainerLayout: ({ children }: any) => children,
  ScreenContainer: ({ children }: any) => children
}))
// The same object the page reads, so a test can add the board to it.
const mockUi: Record<string, any> = require('@ui')
const listOfTheMock = mockUi.OrdersOption

const mockWindow = { width: 390, height: 844 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ ...mockWindow, scale: 3, fontScale: 1 })
}))

import { renderPage } from '../../../jest/helpers/renderPage'
import { themeWithValues } from '../../../jest/helpers/themeWithValues'
import { resetDeviceIsTablet } from '../../theme/platform'
import MyOrders from '../MyOrders'

const tablet = (width: number, height: number) => {
  mockWindow.width = width
  mockWindow.height = height
  ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(true)
  resetDeviceIsTablet()
}

describe('MyOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWindow.width = 390
    mockWindow.height = 844
    ;(DeviceInfo.isTablet as jest.Mock).mockReturnValue(false)
    resetDeviceIsTablet()
    delete mockUi.OrdersBoard
    mockUi.OrdersOption = listOfTheMock
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
  })

  it('renders the list on a phone, with the real connectivity', () => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-option')).toHaveTextContent('false')
  })

  it('navigates on redirect and skips an empty page', () => {
    const { getByTestId, navigation } = renderPage(MyOrders)
    getByTestId('orders-option').props.onPress()
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 5 })
  })

  it('gives the list the settings of the business app', () => {
    let received: any
    mockUi.OrdersOption = (props: any) => { received = props; return null }
    renderPage(MyOrders)
    expect(received).toMatchObject({
      isBusinessApp: true,
      useDefualtSessionManager: true,
      checkNotification: true,
      paginationSettings: { initialPage: 1, pageSize: 50, controlType: 'infinity' }
    })
    expect(received.onNavigationRedirect(undefined)).toBeUndefined()
  })

  it('hands the list the tab the shell asked for with its chip, only while the ask has an `at`', () => {
    let received: any
    mockUi.OrdersOption = (props: any) => { received = props; return null }
    renderPage(MyOrders, { route: { params: { tab: 'new', stage: 'preorder', at: 5 } } })
    expect(received.tabRequest).toEqual({ tab: 'new', stage: 'preorder', at: 5 })
    renderPage(MyOrders, { route: { params: { tab: undefined, stage: undefined, at: undefined } } })
    expect(received.tabRequest).toBeUndefined()
  })

  it('renders the board on a tablet turned sideways, when the area that owns it exports it', () => {
    mockUi.OrdersBoard = (props: any) => <Text testID='orders-board'>{String(props.isBusinessApp)}</Text>
    tablet(1194, 834)
    const { getByTestId, queryByTestId } = renderPage(MyOrders, { platform: 'tablet' })
    expect(getByTestId('orders-board')).toHaveTextContent('true')
    expect(queryByTestId('orders-option')).toBeNull()
  })

  it('keeps the list on a tablet in portrait, and when the theme turns the board off', () => {
    mockUi.OrdersBoard = () => <Text testID='orders-board' />
    tablet(834, 1194)
    expect(renderPage(MyOrders, { platform: 'tablet' }).queryByTestId('orders-board')).toBeNull()
    tablet(1194, 834)
    const theme = themeWithValues((values) => { values.platforms.tablet.visibility['orders.board'] = false }, { platform: 'tablet' })
    expect(renderPage(MyOrders, { themeOverrides: theme as any, platform: 'tablet' }).queryByTestId('orders-board')).toBeNull()
  })

  it('draws the list on a tablet turned sideways until the board exists', () => {
    tablet(1194, 834)
    expect(renderPage(MyOrders, { platform: 'tablet' }).getByTestId('orders-option')).toBeTruthy()
  })
})
