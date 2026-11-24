/**
 * A partial `@ui` for the page tests that mount a page without its screen: the pieces those pages import.
 */
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

export const SafeAreaContainer = ({ children, style }: any) => (
  <View testID="safe-area-container" style={style}>{children}</View>
)

export const SafeAreaContainerLayout = ({ children }: any) => (
  <View testID="safe-area-layout">{children}</View>
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

const mockUi = {
  SafeAreaContainer,
  SafeAreaContainerLayout,
  Home,
  StoresList,
  MessagesOption,
  OrderMessage,
  BusinessProductList
}

module.exports = mockUi
