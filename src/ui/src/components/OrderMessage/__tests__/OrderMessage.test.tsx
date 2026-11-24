import React from 'react'
import { Linking } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useConfig, useSession } from '@components'

jest.mock('../../Chat', () => {
  const React = require('react')
  const { View, Pressable } = require('react-native')
  return {
    // The chat's own suite covers what it draws; here the screen's wiring: what it is given.
    Chat: (props: any) => React.createElement(View, { testID: 'chat-stub' },
      React.createElement(Pressable, { testID: 'chat-stub-view-order', onPress: props.onViewOrder }))
  }
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { orderDetailsDefaults } = require('../../../../../../jest/helpers/b4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url,
      parseDate: (v: string) => v || '2026-01-01'
    }]),
    OrderDetails: renderUiController(orderDetailsDefaults)
  }
})

// What the chat does when the app has to catch up (the provider's own suite covers when it is told).
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

import { OrderMessage } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/b4MessagesDefaults'

const loaded = (over: any = {}) => ({ order: { ...sampleOrder, ...over }, loading: false, error: null })

describe('OrderMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 1, level: 2 } }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  describe('the top bar', () => {
    it('names the screen after the customer, the order\'s number and type under it', () => {
      const { getByText } = renderWithProviders(<OrderMessage />)
      expect(getByText('Jane Doe')).toBeTruthy()
      expect(getByText('Order #101 · Delivery')).toBeTruthy()
    })

    // H5: the number the cards show (the external id when the project asks for it), in the app's one phrase.
    it('writes the number the project shows: the external id with change_order_id on', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
      const { getByText } = renderWithProviders(<OrderMessage order={loaded({ external_id: 'EXT-9' })} />)
      expect(getByText('Order #EXT-9 · Delivery')).toBeTruthy()
    })

    it.each([[2, 'Pickup'], [3, 'Eat in'], [1, 'Delivery']])('writes the order\'s type %s as %s', (type, label) => {
      const { getByText } = renderWithProviders(<OrderMessage order={loaded({ delivery_type: type })} />)
      expect(getByText(`Order #101 · ${label}`)).toBeTruthy()
    })

    it('has no store logo and no avatars of the business, the customer or the driver', () => {
      const { UNSAFE_queryAllByType } = renderWithProviders(<OrderMessage order={loaded({ driver: { id: 3, name: 'D', photo: null } })} />)
      const { Image } = require('react-native')
      expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
    })

    it('writes the word "Customer" in place of the name when the project hides the contact', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { hide_customer_contact_business_app: { value: '1' } } }])
      const { getByText, queryByText, queryByTestId } = renderWithProviders(<OrderMessage />)
      expect(getByText('Customer')).toBeTruthy()
      expect(queryByText('Jane Doe')).toBeNull()
      expect(queryByTestId('chat-call')).toBeNull()
    })

    it('navigates back when the arrow is pressed', () => {
      const goBack = jest.fn()
      const { getAllByRole } = renderWithProviders(
        <OrderMessage navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }} />
      )
      // The header's back arrow is the first button of the screen.
      fireEvent.press(getAllByRole('button')[0])
      expect(goBack).toHaveBeenCalled()
    })

    it('leaves through the page\'s own way back when it has one', () => {
      const goToBack = jest.fn()
      const { getAllByRole } = renderWithProviders(<OrderMessage goToBack={goToBack} navigation={{ goBack: jest.fn(), canGoBack: () => true }} />)
      fireEvent.press(getAllByRole('button')[0])
      expect(goToBack).toHaveBeenCalledTimes(1)
    })

    it('has no way back in the second pane of a tablet', () => {
      const { getAllByRole, getByText } = renderWithProviders(<OrderMessage isPane navigation={{ goBack: jest.fn(), canGoBack: () => true }} />)
      // The bar's first button is the call button, not an arrow.
      expect(getAllByRole('button')[0].props.accessibilityLabel).toBe('Call customer')
      expect(getByText('Jane Doe')).toBeTruthy()
    })
  })

  describe('call and view order', () => {
    it('calls the customer\'s cellphone', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
      const { getByLabelText } = renderWithProviders(<OrderMessage />)
      fireEvent.press(getByLabelText('Call customer'))
      expect(openURL).toHaveBeenCalledWith('tel:5551234')
      openURL.mockRestore()
    })

    it('falls back to the customer\'s phone when there is no cellphone', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
      const { getByLabelText } = renderWithProviders(
        <OrderMessage order={loaded({ customer: { ...sampleOrder.customer, cellphone: null, phone: '777' } })} />
      )
      fireEvent.press(getByLabelText('Call customer'))
      expect(openURL).toHaveBeenCalledWith('tel:777')
      openURL.mockRestore()
    })

    it('draws no call button for a customer with no number', () => {
      const { queryByLabelText, getByLabelText } = renderWithProviders(
        <OrderMessage order={loaded({ customer: { ...sampleOrder.customer, cellphone: null, phone: null } })} />
      )
      expect(queryByLabelText('Call customer')).toBeNull()
      expect(getByLabelText('View order')).toBeTruthy()
    })

    it('opens the order from the bag button and from the ended chat\'s button', () => {
      const navigate = jest.fn()
      const { getByLabelText, getByTestId } = renderWithProviders(
        <OrderMessage navigation={{ navigate, goBack: jest.fn(), canGoBack: () => true }} />
      )
      fireEvent.press(getByLabelText('View order'))
      expect(navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 101 })
      fireEvent.press(getByTestId('chat-stub-view-order'))
      expect(navigate).toHaveBeenCalledTimes(2)
    })

    it('has no buttons in the bar once the order has ended: the chat holds "View order"', () => {
      const { queryByLabelText, getByText } = renderWithProviders(<OrderMessage order={loaded({ status: 1 })} />)
      expect(queryByLabelText('Call customer')).toBeNull()
      expect(queryByLabelText('View order')).toBeNull()
      expect(getByText('Jane Doe')).toBeTruthy()
    })
  })

  // The chat marks itself read on opening (not on leaving), so the order controller can announce it on the event
  // bus and the Messages list's count (and the tab's counter) drops for every route.
  it.each([
    ['the order\'s details', {}],
    ['the Messages list', {}],
    ['a push', {}]
  ])('reads the chat as soon as it is open, opened from %s', (_entry, params) => {
    const readMessages = jest.fn()
    renderWithProviders(<OrderMessage {...params} readMessages={readMessages} messages={{ loading: false, messages: [{ id: 1 }] }} />)
    expect(readMessages).toHaveBeenCalledTimes(1)
  })

  // A message of someone else that arrives while the chat is on screen is read as it arrives, so the order's count never
  // keeps a message the business is looking at.
  describe('a message that arrives while the chat is open', () => {
    const readMessages = jest.fn()
    const chat = (messages: any[]) => <OrderMessage readMessages={readMessages} messages={{ loading: false, messages }} />
    beforeEach(() => readMessages.mockClear())

    it('is read as it arrives', () => {
      const view = renderWithProviders(chat([{ id: 1, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(1)
      view.rerender(chat([{ id: 1, author_id: 99 }, { id: 2, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(2)
    })

    it('is not read again for the user\'s own message, which is read by definition', () => {
      const view = renderWithProviders(chat([{ id: 1, author_id: 99 }]))
      view.rerender(chat([{ id: 1, author_id: 99 }, { id: 2, author_id: 1 }]))
      expect(readMessages).toHaveBeenCalledTimes(1)
    })

    it('is not read again by a render that brought no new message', () => {
      const view = renderWithProviders(chat([{ id: 1, author_id: 99 }]))
      view.rerender(chat([{ id: 1, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(1)
    })
  })

  it('does not read the chat while its messages load', () => {
    const readMessages = jest.fn()
    renderWithProviders(<OrderMessage readMessages={readMessages} messages={{ loading: true, messages: [] }} />)
    expect(readMessages).not.toHaveBeenCalled()
  })

  it('loads the messages again when the socket comes back', () => {
    const loadMessages = jest.fn()
    renderWithProviders(<OrderMessage loadMessages={loadMessages} messages={{ loading: false, messages: [] }} />)
    mockReconnect!()
    expect(loadMessages).toHaveBeenCalledTimes(1)
  })

  describe('while the order loads', () => {
    it('is the chat\'s skeleton, with its back arrow', () => {
      const goBack = jest.fn()
      const { getByTestId, getAllByRole, queryByTestId } = renderWithProviders(
        <OrderMessage order={{ order: null, loading: true, error: null }} navigation={{ goBack, canGoBack: () => true }} />
      )
      expect(getByTestId('chat-message-skeleton')).toBeTruthy()
      expect(getByTestId('chat-message-skeleton-composer')).toBeTruthy()
      expect(queryByTestId('chat-stub')).toBeNull()
      fireEvent.press(getAllByRole('button')[0])
      expect(goBack).toHaveBeenCalled()
    })

    it('is drawn with the chat\'s own styles: the recipients\' row and the composer\'s buttons', () => {
      const { getByTestId } = renderWithProviders(<OrderMessage order={{ order: null, loading: true, error: null }} />)
      expect(getByTestId('chat-message-skeleton-composer')).toBeTruthy()
    })
  })
})
