import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

export const _setStoreData = jest.fn()
export const _removeStoreData = jest.fn()
export const _retrieveStoreData = jest.fn()

export const Container = ({ children, style, noPadding }: any) => (
  <View testID="container" style={style}>
    {noPadding ? <Text testID="container-no-padding">no-padding</Text> : null}
    {children}
  </View>
)

export const SafeAreaContainer = ({ children, style }: any) => (
  <View testID="safe-area-container" style={style}>{children}</View>
)

export const SafeAreaContainerLayout = ({ children }: any) => (
  <View testID="safe-area-layout">{children}</View>
)

export const LoginForm = (props: any) => (
  <View testID="login-form">
    <TouchableOpacity
      testID="login-success"
      onPress={() =>
        props.handleSuccessLogin?.({
          id: 1,
          session: { access_token: 'token' }
        })
      }
    />
    <TouchableOpacity
      testID="login-redirect"
      onPress={() => props.onNavigationRedirect?.('Signup')}
    />
  </View>
)

export const SignupForm = (props: any) => (
  <View testID="signup-form">
    <TouchableOpacity
      testID="signup-success-business"
      onPress={() =>
        props.handleSuccessSignup?.({
          id: 1,
          level: 2,
          session: { access_token: 'token' }
        })
      }
    />
    <TouchableOpacity
      testID="signup-success-other"
      onPress={() => props.handleSuccessSignup?.({ id: 2, level: 3 })}
    />
    <TouchableOpacity
      testID="signup-redirect"
      onPress={() => props.onNavigationRedirect?.('Login')}
    />
  </View>
)

export const ForgotPasswordForm = (props: any) => (
  <View testID="forgot-password-form">
    <TouchableOpacity testID="forgot-back" onPress={() => props.navigation?.goBack?.()} />
  </View>
)

export const Sessions = (props: any) => (
  <View testID="sessions-controller" {...props} />
)

export const Home = (props: any) => (
  <View testID="home-page">
    <TouchableOpacity
      testID="home-nav"
      onPress={() => props.onNavigationRedirect?.('Login')}
    />
    <TouchableOpacity
      testID="home-nav-empty"
      onPress={() => props.onNavigationRedirect?.('')}
    />
  </View>
)

export const StoresList = (props: any) => (
  <View testID="stores-list">
    <Text testID="stores-list-dashboard">
      {props.asDashboard ? 'dashboard' : 'other'}
    </Text>
    <Text testID="stores-list-force-search">{String(props.isForceSearch)}</Text>
    <TouchableOpacity
      testID="stores-select"
      onPress={() => props.onSelectStore?.({ id: 1, name: 'Store A', slug: 'store-a' })}
    />
  </View>
)

export const MessagesOption = (props: any) => (
  <View testID="messages-option">
    <TouchableOpacity
      testID="messages-option-nav"
      onPress={() => props.onNavigationRedirect?.('OrderMessage', { orderId: 1 })}
    />
    <TouchableOpacity
      testID="messages-option-nav-empty"
      onPress={() => props.onNavigationRedirect?.('')}
    />
  </View>
)

export const OrdersListManager = (props: any) => (
  <View testID="orders-list-manager">
    <Text testID="orders-list-manager-business">
      {props.isBusinessApp ? 'business' : 'other'}
    </Text>
    <TouchableOpacity
      testID="orders-list-manager-nav"
      onPress={() => props.onNavigationRedirect?.('OrderDetails', { orderId: 9 })}
    />
  </View>
)

export const OrdersOption = (props: any) => (
  <View testID="orders-option">
    <Text testID="orders-option-business">
      {props.isBusinessApp ? 'business' : 'other'}
    </Text>
    <TouchableOpacity
      testID="orders-option-nav"
      onPress={() => props.onNavigationRedirect?.('OrderDetails', { orderId: 5 })}
    />
    <TouchableOpacity
      testID="orders-option-nav-empty"
      onPress={() => props.onNavigationRedirect?.('')}
    />
  </View>
)

export const AcceptOrRejectOrder = (props: any) => (
  <View testID="accept-or-reject-order">
    <TouchableOpacity
      testID="accept-reject-update"
      onPress={() => props.handleUpdateOrder?.('accept', { time: 15 })}
    />
    <TouchableOpacity
      testID="accept-reject-close"
      onPress={() => props.closeModal?.()}
    />
  </View>
)

export const OrderDetailsBusiness = (props: any) => (
  <View testID="order-details-business" {...props} />
)

export const OrderSummary = (props: any) => (
  <View testID="order-summary" {...props} />
)

export const OrderMessage = (props: any) => (
  <View testID="order-message" {...props} />
)

export const BusinessProductList = (props: any) => (
  <View testID="business-product-list">
    <Text testID="business-product-slug">{props.slug}</Text>
    <Text testID="business-product-ordering">
      {props.ordering ? 'has-ordering' : 'no-ordering'}
    </Text>
  </View>
)

export const NotFoundSource = ({ btnTitle, content, onClickButton }: any) => (
  <View testID="not-found-source">
    <Text testID="not-found-content">{content}</Text>
    <Text testID="not-found-btn-title">{btnTitle}</Text>
    <TouchableOpacity testID="not-found-button" onPress={onClickButton} />
  </View>
)

export const NetworkError = () => (
  <View testID="network-error-screen" />
)

export const PrinterSettings = (props: any) => (
  <View testID="printer-settings" {...props} />
)

export const PrinterEdition = (props: any) => (
  <View testID="printer-edition">
    <Text testID="printer-edition-model">{props.printer?.model || 'add'}</Text>
  </View>
)

export const TicketPreview = (props: any) => (
  <View testID="ticket-preview">
    <Text testID="ticket-order-id">{props.order?.id}</Text>
    <Text testID="ticket-order-status">{props.order?.orderStatus?.slug}</Text>
    <Text testID="ticket-printer-settings">
      {props.printerSettings ? 'configured' : 'none'}
    </Text>
    <Text testID="ticket-should-print-on-mount">
      {props.shouldPrintOnMount ? 'auto' : 'preview'}
    </Text>
  </View>
)

export const UserProfileForm = (props: any) => (
  <View testID="user-profile-form">
    <Text testID="user-profile-business">
      {props.isBusinessApp ? 'business' : 'other'}
    </Text>
    <TouchableOpacity testID="user-profile-go-back" onPress={() => props.goToBack?.()} />
    <TouchableOpacity
      testID="user-profile-nav"
      onPress={() => props.onNavigationRedirect?.('Sessions', {})}
    />
  </View>
)

export const OText = ({ children }: any) => <Text testID="o-text">{children}</Text>
export const OIconButton = ({ title, onClick }: any) => (
  <TouchableOpacity testID="o-icon-button" onPress={onClick}>
    <Text>{title}</Text>
  </TouchableOpacity>
)

export const DeviceOrientationMethods = {
  useDeviceOrientation: jest.fn(() => [{
    orientation: 'portrait',
    dimensions: { width: 390, height: 844 }
  }]),
  useIsLargeScreen: jest.fn(() => false)
}

export const StoreMethods = {
  _setStoreData,
  _removeStoreData,
  _retrieveStoreData
}

export const isManualDriverAssignmentEnabled = jest.fn(() => true)

const mockUi = {
  Container,
  SafeAreaContainer,
  SafeAreaContainerLayout,
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
  Sessions,
  Home,
  StoresList,
  MessagesOption,
  OrdersListManager,
  OrdersOption,
  AcceptOrRejectOrder,
  OrderDetailsBusiness,
  OrderSummary,
  OrderMessage,
  BusinessProductList,
  NotFoundSource,
  NetworkError,
  PrinterSettings,
  PrinterEdition,
  TicketPreview,
  UserProfileForm,
  OText,
  OIconButton,
  DeviceOrientationMethods,
  StoreMethods,
  isManualDriverAssignmentEnabled,
  _setStoreData,
  _removeStoreData,
  _retrieveStoreData
}

module.exports = mockUi
