import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return ({ data, defaultButtonText, onSelect, buttonTextAfterSelection }: any) => (
    <View testID="select-dropdown">
      <Text>{defaultButtonText}</Text>
      {data?.map((item: any, index: number) => (
        <TouchableOpacity key={index} testID={`select-option-${index}`} onPress={() => onSelect?.(item, index)}>
          <Text>{buttonTextAfterSelection?.(item) ?? item?.name ?? item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
})

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `feather-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('react-native-vector-icons/Fontisto', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `fontisto-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('@ui', () => {
  const { buildB3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/b3OrdersUiMock')
  return buildB3OrdersIntegrationUiMock()
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/b3OrdersComponentsMock')
  return getMock()
})

import { OrdersListManager } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersListManager', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders orders header and pending tab', () => {
    const { getByText, getAllByText } = renderWithProviders(<OrdersListManager isBusinessApp />)
    expect(getByText('My orders')).toBeTruthy()
    expect(getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('renders previous orders when orders exist', () => {
    const { getByText } = renderWithProviders(<OrdersListManager isBusinessApp />)
    expect(getByText('Store A')).toBeTruthy()
  })

  it('reloads orders when refresh icon is pressed', () => {
    const loadOrders = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrdersListManager isBusinessApp loadOrders={loadOrders} />
    )
    fireEvent.press(getByTestId('feather-refresh-cw'))
    expect(loadOrders).toHaveBeenCalledWith({ newFetch: true })
  })

  it('switches to in progress tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersListManager isBusinessApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('In Progress'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('inProgress')
  })

  it('opens search modal from search icon', () => {
    const { getByTestId, getByPlaceholderText } = renderWithProviders(
      <OrdersListManager isBusinessApp />
    )
    fireEvent.press(getByTestId('fontisto-search'))
    expect(getByPlaceholderText('Order number')).toBeTruthy()
  })

  it('shows SLA settings when enterprise plan is enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(<OrdersListManager isBusinessApp />)
    expect(getByText(/SLA.s Settings/)).toBeTruthy()
  })

  it('opens SLA settings modal when enterprise button is pressed', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getAllByText } = renderWithProviders(<OrdersListManager isBusinessApp />)
    fireEvent.press(getAllByText(/SLA.s Settings/)[0])
    expect(getAllByText(/SLA.s Settings/).length).toBeGreaterThan(1)
  })
})
