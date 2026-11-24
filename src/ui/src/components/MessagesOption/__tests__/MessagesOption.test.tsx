import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { useNetInfo } from '@react-native-community/netinfo'

jest.mock('@ui', () => {
  const React = require('react')
  const { Text } = require('react-native')
  const shared = require('../../shared')
  const { PreviousMessages } = require('../../PreviousMessages')
  return {
    ...shared,
    PreviousMessages,
    // The empty state belongs to another area: its text is what is checked here.
    NotFoundSource: ({ content }: any) => React.createElement(Text, { testID: 'not-found' }, content)
  }
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { messagesOptionDefaults } = require('../../../../../../jest/helpers/b4MessagesDefaults')
  return {
    ...mockOrdering,
    // The list is asked for once there is a session: here there is one, and the API object already wears its token.
    useSession: jest.fn(() => [{ token: 'token', user: { id: 7, level: 2 } }]),
    useApi: jest.fn(() => [{ accessToken: 'token', setAccessToken: jest.fn() }]),
    useUtils: jest.fn(() => [{
      parseDate: (v: string, o?: any) => (o?.outputFormat === 'YYYY-MM-DD HH:mm:ss' ? v : `fmt ${String(v).slice(11, 16)}`),
      optimizeImage: (url: string) => url,
      dateFormat: 'MMM D',
      timeFormat: 'HH:mm'
    }]),
    Contacts: renderUiController(messagesOptionDefaults)
  }
})

import { MessagesOption } from '..'
import { useConfig } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { UnreadMessagesProvider, useUnreadMessages } from '../../../../../context/UnreadMessagesContext'
import { sampleOrder } from '../../../../../../jest/helpers/b4MessagesDefaults'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const hidden = (key: string) => ({ themeOverrides: themeWith({ visibility: { [key]: false } }) })

const order = (id: number, unread: number, name = `Customer${id}`, over: any = {}) => ({
  ...sampleOrder,
  id,
  unread_count: unread,
  unread_direct_count: unread,
  customer: { ...sampleOrder.customer, name, lastname: 'Test' },
  ...over
})
const list = (...data: any[]) => ({ orders: { loading: false, error: null, data }, pagination: { currentPage: 1, totalPages: 1 } })

const roomUnder = (bar: any) => {
  for (let up = bar.parent; up; up = up.parent) {
    const flat: any = up.props?.style ? StyleSheet.flatten(up.props.style) : null
    if (flat && flat.paddingBottom !== undefined) return flat.paddingBottom
  }
  return undefined
}

describe('MessagesOption', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('draws the title and the search button on the bar, and the All / Unread chips under it', () => {
    const { getByText, getByLabelText, getByTestId } = renderWithProviders(<MessagesOption />)
    expect(getByText('Messages')).toBeTruthy()
    expect(getByLabelText('Search messages')).toBeTruthy()
    expect(getByTestId('messages-filter-all').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('messages-filter-unread').props.accessibilityState.selected).toBe(false)
  })

  it('opens with a strip under its bar: the bar leaves 5 (tight), and the screen adds no gap of its own', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(roomUnder(getByText('Messages'))).toBe(5)
  })

  it('says it is offline with the same notice as the Stores, and nothing when it is online', () => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    const offline = renderWithProviders(<MessagesOption />)
    expect(offline.getByTestId('messages-offline')).toHaveTextContent(/You are offline/)
    // The cached conversations stay.
    expect(offline.getByText(/· Jane Doe$/)).toBeTruthy()
    offline.unmount()
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
    expect(renderWithProviders(<MessagesOption />).queryByTestId('messages-offline')).toBeNull()
  })

  it('keeps the Unread count inside the chip, centred in it (not on its corner), with no extra space over the chips', () => {
    const { getByTestId } = renderWithProviders(<MessagesOption {...list(order(1, 3))} />)
    expect(StyleSheet.flatten(getByTestId('messages-unread-badge').props.style)).toEqual(expect.objectContaining({ alignSelf: 'center' }))
    expect(StyleSheet.flatten(getByTestId('messages-filter').props.contentContainerStyle).paddingTop).toBeUndefined()
  })

  it('has no sort chips any more: Newest and Order number are gone', () => {
    const { queryByText } = renderWithProviders(<MessagesOption />)
    expect(queryByText('Newest')).toBeNull()
    expect(queryByText('Order number')).toBeNull()
  })

  it('lays the chips out to the screen\'s edges, the gutter on their content', () => {
    const { getByTestId } = renderWithProviders(<MessagesOption />)
    const chips = getByTestId('messages-filter')
    expect(StyleSheet.flatten(chips.props.style).paddingHorizontal).toBeUndefined()
    expect(StyleSheet.flatten(chips.props.contentContainerStyle).paddingHorizontal).toBe(20)
  })

  it('lists the conversations by the customer, and opens the chat of the pressed one', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(<MessagesOption onNavigationRedirect={onNavigationRedirect} />)
    fireEvent.press(getByText(/· Jane Doe$/))
    expect(onNavigationRedirect).toHaveBeenCalledWith('OrderMessage', { orderId: 101 })
  })

  it('shows the empty state when there are no orders', () => {
    const { getByTestId } = renderWithProviders(<MessagesOption {...list()} />)
    expect(getByTestId('not-found')).toHaveTextContent('Sorry, no results found')
  })

  it('shows the API\'s error in place of the rows', () => {
    const { getByTestId, queryByText } = renderWithProviders(
      <MessagesOption orders={{ loading: false, error: ['Network Error'], data: [order(1, 1)] }} />
    )
    expect(getByTestId('not-found')).toHaveTextContent('Network Error')
    expect(queryByText('Customer1 Test')).toBeNull()
  })

  describe('the Unread chip', () => {
    it('counts the conversations with unread messages and shows only them when it is chosen', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(
        <MessagesOption {...list(order(1, 3, 'Ann'), order(2, 0, 'Bob'), order(3, 1, 'Cy'))} />
      )
      expect(getByTestId('messages-filter-unread').props.accessibilityLabel).toBe('Unread 2')
      fireEvent.press(getByTestId('messages-filter-unread'))
      expect(getByText(/· Ann Test$/)).toBeTruthy()
      expect(getByText(/· Cy Test$/)).toBeTruthy()
      expect(queryByText(/· Bob Test$/)).toBeNull()
      fireEvent.press(getByTestId('messages-filter-all'))
      expect(getByText(/· Bob Test$/)).toBeTruthy()
    })

    it('writes a "+" after the count while the list has pages it has not loaded', () => {
      const { getByTestId } = renderWithProviders(
        <MessagesOption orders={{ loading: false, error: null, data: [order(1, 3)] }} pagination={{ currentPage: 1, totalPages: 3 }} />
      )
      expect(getByTestId('messages-filter-unread').props.accessibilityLabel).toBe('Unread 1+')
    })

    it('says so when nothing is unread', () => {
      const { getByTestId } = renderWithProviders(<MessagesOption {...list(order(1, 0), order(2, 0))} />)
      expect(getByTestId('messages-filter-unread').props.accessibilityLabel).toBe('Unread')
      fireEvent.press(getByTestId('messages-filter-unread'))
      expect(getByTestId('not-found')).toHaveTextContent('No unread messages')
    })

    it('counts a read conversation as read: the direct count, not the order\'s system rows', () => {
      const { getByTestId } = renderWithProviders(
        <MessagesOption {...list(order(1, 0, 'Ann', { unread_count: 9 }))} />
      )
      expect(getByTestId('messages-filter-unread').props.accessibilityLabel).toBe('Unread')
    })
  })

  describe('the search', () => {
    const rows = list(order(1053, 0, 'James'), order(1044, 0, 'Omar'), order(1049, 0, 'Priya'))

    it('opens a field from the button and looks through the loaded rows by the customer\'s name', () => {
      const { getByLabelText, getByTestId, getByText, queryByText, queryByTestId } = renderWithProviders(<MessagesOption {...rows} />)
      expect(queryByTestId('messages-search')).toBeNull()
      fireEvent.press(getByLabelText('Search messages'))
      fireEvent.changeText(getByTestId('messages-search'), 'omar')
      expect(getByText(/· Omar Test$/)).toBeTruthy()
      expect(queryByText(/· James Test$/)).toBeNull()
      expect(queryByText(/· Priya Test$/)).toBeNull()
    })

    it('finds an order by its number, with or without the #', () => {
      const { getByLabelText, getByTestId, getByText, queryByText } = renderWithProviders(<MessagesOption {...rows} />)
      fireEvent.press(getByLabelText('Search messages'))
      fireEvent.changeText(getByTestId('messages-search'), '#1049')
      expect(getByText(/· Priya Test$/)).toBeTruthy()
      expect(queryByText(/· James Test$/)).toBeNull()
      fireEvent.changeText(getByTestId('messages-search'), '1053')
      expect(getByText(/· James Test$/)).toBeTruthy()
      expect(queryByText(/· Priya Test$/)).toBeNull()
    })

    it('says so when nothing matches, and closing the search brings every row back', () => {
      const { getByLabelText, getByTestId, getByText, queryByTestId } = renderWithProviders(<MessagesOption {...rows} />)
      fireEvent.press(getByLabelText('Search messages'))
      fireEvent.changeText(getByTestId('messages-search'), 'zzz')
      expect(getByTestId('not-found')).toHaveTextContent('Sorry, no results found')
      fireEvent.press(getByTestId('messages-search-button'))
      expect(queryByTestId('messages-search')).toBeNull()
      expect(getByText(/· James Test$/)).toBeTruthy()
    })

    it('does not look names up when the project hides the customer\'s contact', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { hide_customer_contact_business_app: { value: '1' } } }])
      const { getByLabelText, getByTestId, queryByText, getAllByText } = renderWithProviders(<MessagesOption {...rows} />)
      expect(queryByText(/· James Test$/)).toBeNull()
      expect(getAllByText(/· Customer$/)).toHaveLength(3)
      fireEvent.press(getByLabelText('Search messages'))
      fireEvent.changeText(getByTestId('messages-search'), 'james')
      expect(getByTestId('not-found')).toBeTruthy()
    })
  })

  describe('visibility', () => {
    it('hides the title with messages.title, and nothing else', () => {
      const { queryByText, getByLabelText, getByTestId } = renderWithProviders(<MessagesOption />, hidden('messages.title'))
      expect(queryByText('Messages')).toBeNull()
      expect(getByLabelText('Search messages')).toBeTruthy()
      expect(getByTestId('messages-filter')).toBeTruthy()
    })

    it('hides the search with messages.search, and nothing else', () => {
      const { queryByLabelText, getByText, getByTestId } = renderWithProviders(<MessagesOption />, hidden('messages.search'))
      expect(queryByLabelText('Search messages')).toBeNull()
      expect(getByText('Messages')).toBeTruthy()
      expect(getByTestId('messages-filter')).toBeTruthy()
    })

    it('draws no bar at all when neither its title nor its search is shown', () => {
      const off = themeWith({ visibility: { 'messages.title': false, 'messages.search': false } })
      const { queryByText, queryByLabelText } = renderWithProviders(<MessagesOption />, { themeOverrides: off })
      expect(queryByText('Messages')).toBeNull()
      expect(queryByLabelText('Search messages')).toBeNull()
    })

    it('hides the chips with messages.filter, leaving no empty row, and nothing else', () => {
      const { queryByTestId, getByText } = renderWithProviders(<MessagesOption />, hidden('messages.filter'))
      expect(queryByTestId('messages-filter')).toBeNull()
      expect(getByText('Messages')).toBeTruthy()
      expect(getByText(/· Jane Doe$/)).toBeTruthy()
    })

    it('hides the unread counters of the rows with messages.unread_badge, and nothing else', () => {
      const shown = renderWithProviders(<MessagesOption />)
      expect(shown.getByTestId('message-unread')).toBeTruthy()
      const off = renderWithProviders(<MessagesOption />, hidden('messages.unread_badge'))
      expect(off.queryByTestId('message-unread')).toBeNull()
      expect(off.getByText(/· Jane Doe$/)).toBeTruthy()
    })
  })

  describe('the unread messages it tells the tab bar of', () => {
    const Probe = () => <Text testID='unread'>{JSON.stringify(useUnreadMessages())}</Text>
    const render = (props: any = {}) => renderWithProviders(
      <UnreadMessagesProvider>
        <Probe />
        <MessagesOption {...props} />
      </UnreadMessagesProvider>
    )
    const known = (view: any) => JSON.parse(view.getByTestId('unread').props.children)

    it('is the sum of the direct unread messages of the orders it has loaded, and says there are more pages', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2), order(2, 0), order(3, 5)] },
        pagination: { currentPage: 1, totalPages: 3 }
      })
      expect(known(view)).toEqual({ total: 7, more: true })
    })

    it('is exact when every page is loaded', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2), order(2, 1)] },
        pagination: { currentPage: 2, totalPages: 2 }
      })
      expect(known(view)).toEqual({ total: 3, more: false })
    })

    it('does not count the order\'s system rows: the direct count wins over the full one', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 1, 'A', { unread_count: 12 })] },
        pagination: { currentPage: 1, totalPages: 1 }
      })
      expect(known(view)).toEqual({ total: 1, more: false })
    })

    it('counts nothing for an order that says nothing of its unread messages', () => {
      const view = render({
        orders: {
          loading: false,
          error: null,
          data: [order(1, 2), order(2, 0, 'B', { unread_count: undefined, unread_direct_count: undefined }), order(3, 0, 'C', { unread_count: null, unread_direct_count: null })]
        },
        pagination: { currentPage: 1, totalPages: 1 }
      })
      expect(known(view)).toEqual({ total: 2, more: false })
    })

    it('says nothing while the list loads for the first time, or when it failed: it knows nothing', () => {
      expect(known(render({ orders: { loading: true, error: null, data: [] } }))).toBeNull()
      expect(known(render({ orders: { loading: false, error: ['Network Error'], data: [] } }))).toBeNull()
    })

    it('follows the list as its orders change (a new message, a chat that was read)', () => {
      const view = render({ ...list(order(1, 2)) })
      expect(known(view).total).toBe(2)
      view.rerender(
        <UnreadMessagesProvider>
          <Probe />
          <MessagesOption {...list(order(1, 0))} />
        </UnreadMessagesProvider>
      )
      expect(known(view)).toEqual({ total: 0, more: false })
    })

    it('keeps what it last knew while it loads another page, and takes it back when the list leaves', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2)] },
        pagination: { currentPage: 1, totalPages: 2 }
      })
      view.rerender(
        <UnreadMessagesProvider>
          <Probe />
          <MessagesOption orders={{ loading: true, error: null, data: [order(1, 2)] }} pagination={{ currentPage: 1, totalPages: 2 }} />
        </UnreadMessagesProvider>
      )
      expect(known(view)).toEqual({ total: 2, more: true })
      view.rerender(<UnreadMessagesProvider><Probe /></UnreadMessagesProvider>)
      expect(known(view)).toBeNull()
    })
  })
})
