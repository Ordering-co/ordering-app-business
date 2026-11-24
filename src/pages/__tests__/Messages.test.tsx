import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

// The window decides the layout (`useLayout`): a landscape tablet has two panes.
let mockLandscapeTablet = false
jest.mock('@/theme/platform', () => ({
  ...jest.requireActual('@/theme/platform'),
  useLayout: () => ({ landscapeTablet: mockLandscapeTablet })
}))

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  const base = require('../../../jest/helpers/mockUi')
  return {
    ...base,
    ScreenContainer: ({ children }: any) => React.createElement(View, { testID: 'screen-container' }, children),
    PaneLayout: ({ list, detail, testID }: any) => React.createElement(View, { testID },
      React.createElement(View, { testID: 'pane-list' }, list),
      React.createElement(View, { testID: 'pane-detail' }, detail)),
    KeyboardScreen: ({ children }: any) => React.createElement(View, { testID: 'chat-keyboard-screen' }, children),
    SelectConversation: () => React.createElement(Text, { testID: 'select-conversation' }, 'Select a conversation'),
    MessagesOption: (props: any) => React.createElement(View, { testID: 'messages-option' },
      React.createElement(Text, { testID: 'messages-option-selected' }, String(props.selectedOrderId)),
      React.createElement(require('react-native').TouchableOpacity, {
        testID: 'messages-option-nav',
        onPress: () => props.onNavigationRedirect?.('OrderMessage', { orderId: 1 })
      }),
      React.createElement(require('react-native').TouchableOpacity, {
        testID: 'messages-option-nav-empty',
        onPress: () => props.onNavigationRedirect?.('')
      })),
    OrderMessage: (props: any) => React.createElement(View, { testID: 'order-message' },
      React.createElement(Text, { testID: 'order-message-id' }, String(props.orderId)),
      React.createElement(Text, { testID: 'order-message-pane' }, String(!!props.isPane)))
  }
})

import Messages from '../Messages'

describe('Messages', () => {
  beforeEach(() => { mockLandscapeTablet = false })

  it('is the conversations list in the phone\'s column', () => {
    const { getByTestId, queryByTestId } = renderPage(Messages)
    expect(getByTestId('messages-option')).toBeTruthy()
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('screen-container')).toBeTruthy()
    expect(queryByTestId('messages-panes')).toBeNull()
  })

  it('asks the list the way the tab always did: orders, the last message first, 45 a page', () => {
    const { UNSAFE_getByProps } = renderPage(Messages)
    const props = UNSAFE_getByProps({ firstFetch: 'orders' }).props
    expect(props.sortParams).toEqual({ param: 'last_direct_message_at', direction: 'asc' })
    expect(props.paginationSettings).toEqual({ page: 1, pageSize: 45, controlType: 'infinity' })
  })

  it('opens a conversation as a screen and skips an empty page', () => {
    const { getByTestId, navigation } = renderPage(Messages)
    fireEvent.press(getByTestId('messages-option-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderMessage', { orderId: 1 })
    fireEvent.press(getByTestId('messages-option-nav-empty'))
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })
})

describe('Messages on a landscape tablet', () => {
  beforeEach(() => { mockLandscapeTablet = true })

  it('shows the list and the chat side by side, and a note until one is chosen', () => {
    const { getByTestId, queryByTestId } = renderPage(Messages)
    expect(getByTestId('messages-panes')).toBeTruthy()
    expect(getByTestId('select-conversation')).toBeTruthy()
    expect(queryByTestId('order-message')).toBeNull()
    expect(queryByTestId('screen-container')).toBeNull()
  })

  it('opens the chosen conversation in the second pane, without leaving the screen', () => {
    const { getByTestId, queryByTestId, navigation } = renderPage(Messages)
    fireEvent.press(getByTestId('messages-option-nav'))
    expect(navigation.navigate).not.toHaveBeenCalled()
    expect(getByTestId('order-message-id')).toHaveTextContent('1')
    expect(getByTestId('order-message-pane')).toHaveTextContent('true')
    expect(queryByTestId('select-conversation')).toBeNull()
    expect(getByTestId('messages-option-selected')).toHaveTextContent('1')
  })

  it('goes to another screen for anything that is not a chat', () => {
    const { getByTestId, navigation } = renderPage(Messages)
    fireEvent.press(getByTestId('messages-option-nav-empty'))
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})
