import React from 'react'
import { Keyboard, Linking, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { launchImageLibrary } from 'react-native-image-picker'
import Clipboard from '@react-native-clipboard/clipboard'

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn((_opts, cb) =>
    cb?.({
      assets: [{ uri: 'file://photo.jpg', type: 'image/jpeg', base64: 'abc123' }]
    })
  )
}))

const mockClearSignature = jest.fn()
jest.mock('react-native-signature-canvas', () => {
  const React = require('react')
  const { View } = require('react-native')
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ clearSignature: mockClearSignature, readSignature: jest.fn() }))
    return React.createElement(View, { testID: 'signature-pad', ...props })
  })
})

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn()
}))

// The API's own text comes back as the device's clock would read it, here the same digits (the app writes the day and the time itself, through `useFormats`).
const mockParseDate = jest.fn((value: any, _options?: any) => value ? String(value).replace('T', ' ').replace('Z', '') : '2026-01-01')

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { chatDefaults } = require('../../../../../../jest/helpers/b4MessagesDefaults')
  const sessionState = [{
    user: { id: 1, name: 'Store Owner', level: 2, photo: null }
  }, {}]
  const utilsState = [{
    parseDate: (value: any, options?: any) => mockParseDate(value, options),
    optimizeImage: (url: string) => url,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A'
  }]
  const configState = [{ configs: {} }]
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useUtils: jest.fn(() => utilsState),
    useSession: jest.fn(() => sessionState),
    useConfig: jest.fn(() => configState),
    Messages: renderUiController(chatDefaults)
  }
})

import { Chat } from '..'
import { quickMessagesOf } from '../quickMessages'
import { useSession } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/b4MessagesDefaults'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const hidden = (key: string) => ({ themeOverrides: themeWith({ visibility: { [key]: false } }) })
const shown = (key: string) => ({ themeOverrides: themeWith({ visibility: { [key]: true } }) })
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const asLevel = (level: number, id = 1) =>
  (useSession as jest.Mock).mockReturnValue([{ user: { id, name: 'Me', level, photo: null } }, {}])

/** A person's message of the order, as the server sends it. */
const said = (over: any = {}) => ({
  id: 10,
  type: 2,
  author: { id: 2, name: 'Jane', level: 3 },
  comment: 'Call me at 555-123-4567',
  created_at: '2026-01-01 12:05:00',
  can_see: '2,3,4',
  order_id: 101,
  ...over
})

/** The order's own messages: it was placed, its status changed. */
const placed = { id: 20, type: 0, created_at: '2026-01-01 12:00:00', order_id: 101 }
const changed = {
  id: 21,
  type: 1,
  author: { id: 99, name: 'System', level: 0 },
  change: { attribute: 'status', old: 0, new: 7 },
  created_at: '2026-01-01 12:06:00',
  can_see: '2,3,4',
  order_id: 101
}
const thread = (...list: any[]) => ({ loading: false, messages: list })
const withoutDriver = (() => { const { driver, ...rest } = sampleOrder as any; return rest })()
const marked = (chip: any) => chip.props.accessibilityState.selected

describe('Chat', () => {
  const theme: any = defaultAppTheme()

  beforeEach(() => {
    jest.clearAllMocks()
    asLevel(2)
  })

  describe('thread', () => {
    it('shows a message of the order in the app\'s own thread', () => {
      const { getByText, getByTestId } = renderWithProviders(<Chat />)
      expect(getByTestId('chat-list')).toBeTruthy()
      expect(getByText('Hello there')).toBeTruthy()
    })

    it('writes who sent another person\'s message, with the role, never over mine', () => {
      const { getByText, queryByText } = renderWithProviders(
        <Chat messages={thread(said(), said({ id: 11, author: { id: 1, name: 'Store Owner', level: 2 }, comment: 'On it' }))} />
      )
      expect(getByText('Jane (Customer)')).toBeTruthy()
      expect(queryByText('Store Owner (Business owner)')).toBeNull()
    })

    it('writes the day, and the time inside the bubble, at its end, with the project\'s formats', () => {
      const { getByText, getByTestId } = renderWithProviders(<Chat messages={thread(said())} />)
      expect(getByText('01/01/2026')).toBeTruthy()
      expect(getByTestId('chat-time')).toHaveTextContent('12:05 PM')
      expect(getByTestId('chat-bubble').findAll((node: any) => node === getByTestId('chat-time'))).toHaveLength(1)
    })

    it('hides the time with visibility messages.time, and nothing else', () => {
      const { queryByTestId, getByText } = renderWithProviders(<Chat messages={thread(said())} />, hidden('messages.time'))
      expect(queryByTestId('chat-time')).toBeNull()
      expect(getByText('01/01/2026')).toBeTruthy()
      expect(getByText('Jane (Customer)')).toBeTruthy()
    })

    it('writes, under my bubble only, who it was sent to; the time stays in each bubble', () => {
      const mine = said({ id: 11, author: { id: 1, name: 'Store Owner', level: 2 }, comment: 'On it', can_see: '0,2,3' })
      const { getAllByTestId } = renderWithProviders(<Chat messages={thread(said(), mine)} />)
      // Newest first (the list is inverted): mine, then the customer's, which has no line under it.
      expect(getAllByTestId('chat-sent-to').map((node) => node.props.children)).toEqual(['Sent to: Customer'])
      expect(getAllByTestId('chat-time').map((node) => node.props.children)).toEqual(['12:05 PM', '12:05 PM'])
    })

    it('writes the store among the readers to an administrator, never the store to the store', () => {
      const mine = said({ author: { id: 1, name: 'Me', level: 0 }, can_see: '0,2,3,4' })
      asLevel(0)
      const admin = renderWithProviders(<Chat messages={thread(mine)} />)
      expect(admin.getByTestId('chat-sent-to')).toHaveTextContent(/^Sent to: Business, Customer, Driver$/)
      asLevel(2)
      const owner = renderWithProviders(<Chat messages={thread(said({ author: { id: 1, name: 'Me', level: 2 }, can_see: '0,2,3,4' }))} />)
      expect(owner.getByTestId('chat-sent-to')).toHaveTextContent(/^Sent to: Customer, Driver$/)
    })

    it('hides the "Sent to" words with visibility messages.sent_to, keeping the time', () => {
      const mine = said({ author: { id: 1, name: 'Me', level: 2 }, can_see: '0,2,3' })
      const { getByTestId, queryByTestId } = renderWithProviders(<Chat messages={thread(mine)} />, hidden('messages.sent_to'))
      expect(queryByTestId('chat-sent-to')).toBeNull()
      expect(getByTestId('chat-time')).toHaveTextContent(/^12:05 PM$/)
    })

    it('paints my bubble solid in the brand colour with its ink and a tail, the time in that ink, and the other\'s in the quiet fill', () => {
      const mine = said({ id: 11, author: { id: 1, name: 'Me', level: 2 }, comment: 'mine' })
      const { getAllByTestId, getByText } = renderWithProviders(<Chat messages={thread(said(), mine)} />)
      const bubble = theme.native.components.chat_bubble.base
      const colors = theme.native.tokens.color
      expect(bubble.mine_background).toBe(colors.primary)
      expect(bubble.mine_color).toBe(colors.on_primary)
      expect(bubble.tail).toBe(true)
      const [mineBubble, theirBubble] = getAllByTestId('chat-bubble')
      expect(flat(mineBubble).backgroundColor).toBe(bubble.mine_background)
      expect(flat(theirBubble).backgroundColor).toBe(bubble.theirs_background)
      expect(flat(mineBubble).borderRadius).toBe(bubble.radius)
      // The tail: the corner at the sender's side is nearly square.
      expect(flat(mineBubble).borderBottomRightRadius).toBe(theme.native.tokens.space.xxs)
      expect(flat(theirBubble).borderBottomLeftRadius).toBe(theme.native.tokens.space.xxs)
      expect(flat(getByText('mine')).color).toBe(bubble.mine_color)
      const [mineTime, theirTime] = getAllByTestId('chat-time')
      expect(flat(mineTime).color).toBe(bubble.mine_color)
      expect(flat(theirTime).color).toBe(colors.text_muted)
      expect(flat(mineTime).alignSelf).toBe('flex-end')
    })

    it('shows the order\'s own messages as pills: it was placed (with its time), and a change of its status', () => {
      const { getByText, getAllByTestId } = renderWithProviders(
        <Chat messages={thread(placed, changed)} order={{ ...sampleOrder, app_id: null }} />
      )
      expect(getByText('Order placed · 12:00 PM')).toBeTruthy()
      expect(getByText('Accepted by business · 12:06 PM')).toBeTruthy()
      expect(getAllByTestId('chat-notice')).toHaveLength(2)
      const notice = theme.native.components.chat_bubble.base
      expect(flat(getAllByTestId('chat-notice')[0]).borderRadius).toBe(notice.notice_radius)
    })

    it('shows a status change as the pill of the status it went to, with its time (one line, no sentence)', () => {
      const { getByText, queryByText } = renderWithProviders(<Chat messages={thread(changed)} />)
      expect(getByText('Accepted by business · 12:06 PM')).toBeTruthy()
      expect(queryByText(/Changed from/)).toBeNull()
    })

    it('writes only the new message when the list grows: the others are not formatted again', () => {
      const first = said({ id: 10 })
      const second = said({ id: 11, comment: 'second' })
      const { rerender, getByText } = renderWithProviders(<Chat messages={thread(first, second)} />)
      mockParseDate.mockClear()
      // The controller hands a new list, even new copies of the messages already there, plus one new message.
      rerender(<Chat messages={thread({ ...first }, { ...second }, said({ id: 12, comment: 'third' }))} />)
      expect(getByText('third')).toBeTruthy()
      // One stamp (the API's text in the device's clock) for the new message only: three for three messages otherwise.
      expect(mockParseDate).toHaveBeenCalledTimes(1)
    })

    it('writes the messages again when who reads the app changes (the cache key)', () => {
      const mine = said({ id: 10, author: { id: 1, name: 'Me', level: 2 }, can_see: '0,2,3' })
      const { rerender, getByTestId } = renderWithProviders(<Chat messages={thread(mine)} />)
      expect(getByTestId('chat-sent-to')).toHaveTextContent(/Sent to: Customer$/)
      asLevel(0)
      rerender(<Chat messages={thread(mine)} />)
      expect(getByTestId('chat-sent-to')).toHaveTextContent(/Sent to: Business, Customer$/)
    })

    it('adds the app an order came through to its pill', () => {
      const { getByText } = renderWithProviders(<Chat messages={thread(placed)} order={{ ...sampleOrder, app_id: 'web' }} />)
      expect(getByText('Order placed · 12:00 PM · Via web')).toBeTruthy()
    })

    it('leaves out a change it has no words for (no raw codes)', () => {
      const unknown = { ...changed, id: 22, change: { attribute: 'distance', old: 1, new: 2 } }
      const { queryAllByTestId } = renderWithProviders(<Chat messages={thread(unknown)} />)
      expect(queryAllByTestId('chat-notice')).toHaveLength(0)
    })

    it('hides them with visibility messages.order_console, and only them', () => {
      const { queryByText, getByText } = renderWithProviders(
        <Chat messages={thread(placed, changed, said())} />,
        hidden('messages.order_console')
      )
      expect(queryByText(/Order placed/)).toBeNull()
      expect(queryByText(/Accepted by business/)).toBeNull()
      expect(getByText('Jane (Customer)')).toBeTruthy()
    })

    it('shows the messages of the store\'s side only', () => {
      const { queryByText } = renderWithProviders(<Chat messages={thread(said({ can_see: '3,4', comment: 'between the others' }))} />)
      expect(queryByText('between the others')).toBeNull()
    })
  })

  describe('who receives the message', () => {
    const chip = (view: any, key: string) => view.queryByTestId(`chat-recipient-${key}`)

    it('is a row of chips inside the composer: Customer and Driver for a business owner, marked while they receive it', () => {
      const view = renderWithProviders(<Chat canRead={{ business: true, customer: true, driver: true }} />)
      expect(view.getByText('Send to')).toBeTruthy()
      expect(view.getByTestId('chat-composer').findAll((node: any) => node === view.getByTestId('chat-recipients'))).toHaveLength(1)
      expect(chip(view, 'business')).toBeNull()
      expect(marked(chip(view, 'customer'))).toBe(true)
      expect(marked(chip(view, 'driver'))).toBe(true)
    })

    it('marks each chip with the driver\'s selection marks: a ticked circle while it receives the message, an empty one when not', () => {
      const { Icon: IconComponent } = require('../../shared')
      const view = renderWithProviders(<Chat canRead={{ business: true, customer: true, driver: false }} />)
      const iconOf = (key: string) => (chip(view, key) as any).findAll((node: any) => node.type === IconComponent)[0]?.props.name
      expect(iconOf('customer')).toBe('checkmark-circle')
      expect(iconOf('driver')).toBe('ellipse-outline')
    })

    it('adds the Business chip for an administrator', () => {
      asLevel(0)
      const view = renderWithProviders(<Chat canRead={{ business: true, customer: true, driver: true }} />)
      expect(marked(chip(view, 'business'))).toBe(true)
    })

    it('starts with the customer only for an administrator (the mockup), the Business chip off; the store\'s own level keeps it on, unseen', () => {
      asLevel(0)
      const admin = jest.fn()
      renderWithProviders(<Chat order={withoutDriver} setCanRead={admin} canRead={{ administrator: true, business: true, customer: true, driver: true }} />)
      expect(admin).toHaveBeenCalledWith({ administrator: true, business: false, customer: true, driver: false })
      asLevel(2)
      const owner = jest.fn()
      renderWithProviders(<Chat order={withoutDriver} setCanRead={owner} canRead={{ administrator: true, business: true, customer: true, driver: true }} />)
      expect(owner).toHaveBeenCalledWith({ administrator: true, business: true, customer: true, driver: false })
    })

    it('draws the row as one that scrolls sideways, to the edges of the screen with its content on the gutter', () => {
      const view = renderWithProviders(<Chat order={withoutDriver} canRead={{ business: true, customer: true, driver: false }} />)
      expect(view.UNSAFE_queryAllByProps({ horizontal: true, testID: 'chat-recipients' }).length).toBeGreaterThan(0)
      const gutter = theme.native.tokens.layout.page_gutter
      expect(flat(view.getByTestId('chat-recipients')).marginHorizontal).toBe(-gutter)
    })

    it('draws the Driver chip disabled, with its note "No driver yet" in the chip, while the order has none', () => {
      const setCanRead = jest.fn()
      const view = renderWithProviders(<Chat order={withoutDriver} canRead={{ business: true, customer: true, driver: false }} setCanRead={setCanRead} />)
      expect(chip(view, 'driver').props.accessibilityState.disabled).toBe(true)
      expect(marked(chip(view, 'driver'))).toBe(false)
      expect(view.getByText('Driver · No driver yet')).toBeTruthy()
      fireEvent.press(chip(view, 'driver'))
      expect(setCanRead).not.toHaveBeenCalledWith(expect.objectContaining({ driver: true }))
    })

    it('has no note when the order has a driver, and the chip can be pressed', () => {
      const setCanRead = jest.fn()
      const view = renderWithProviders(<Chat canRead={{ business: true, customer: true, driver: true }} setCanRead={setCanRead} />)
      expect(view.queryByText(/No driver yet/)).toBeNull()
      expect(view.getByText('Driver')).toBeTruthy()
      expect(chip(view, 'driver').props.accessibilityState.disabled).toBe(false)
      fireEvent.press(chip(view, 'driver'))
      expect(setCanRead).toHaveBeenCalledWith(expect.objectContaining({ driver: false }))
    })

    it('keeps one reader: a business owner with a driver cannot switch both off', () => {
      const setCanRead = jest.fn()
      const view = renderWithProviders(<Chat canRead={{ administrator: true, business: true, customer: false, driver: true }} setCanRead={setCanRead} />)
      fireEvent.press(chip(view, 'driver'))
      expect(setCanRead).toHaveBeenLastCalledWith(expect.objectContaining({ driver: false, customer: true }))
    })

    it('does not let a business owner with no driver change who receives it', () => {
      const setCanRead = jest.fn()
      const view = renderWithProviders(<Chat order={withoutDriver} canRead={{ business: true, customer: true, driver: false }} setCanRead={setCanRead} />)
      setCanRead.mockClear()
      fireEvent.press(chip(view, 'customer'))
      expect(setCanRead).not.toHaveBeenCalled()
    })

    it('keeps one of the store\'s side for an administrator', () => {
      asLevel(0)
      const setCanRead = jest.fn()
      const view = renderWithProviders(<Chat canRead={{ administrator: true, business: true, customer: false, driver: false }} setCanRead={setCanRead} />)
      fireEvent.press(chip(view, 'business'))
      expect(setCanRead).toHaveBeenLastCalledWith(expect.objectContaining({ business: false, customer: true }))
    })

    it('turns the driver off as a reader of an order without one, and on for one that has it', () => {
      const off = jest.fn()
      renderWithProviders(<Chat setCanRead={off} canRead={{ business: true, customer: true, driver: true }} order={withoutDriver} />)
      expect(off).toHaveBeenCalledWith(expect.objectContaining({ driver: false }))
      const on = jest.fn()
      renderWithProviders(<Chat setCanRead={on} canRead={{ business: true, customer: true, driver: false }} />)
      expect(on).toHaveBeenCalledWith(expect.objectContaining({ driver: true }))
    })

    it('is never hidden: no visibility key of the chat takes it', () => {
      const all = themeWith({
        visibility: {
          'messages.quick_messages': false,
          'messages.image_upload': false,
          'messages.signature': false,
          'messages.order_console': false,
          'messages.time': false,
          'messages.sent_to': false
        }
      })
      const { getByText, getByTestId, getByLabelText } = renderWithProviders(<Chat />, { themeOverrides: all })
      expect(getByTestId('chat-recipient-customer')).toBeTruthy()
      expect(getByText('Send to')).toBeTruthy()
      expect(getByTestId('chat-input')).toBeTruthy()
      expect(getByLabelText('Send message')).toBeTruthy()
    })
  })

  describe('quick messages', () => {
    const withTexts = (dictionary: Record<string, string>, render: () => any) => {
      const { useLanguage } = require('@components')
      useLanguage.mockReturnValue([{ loading: false, dictionary }, (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key])
      const view = render()
      useLanguage.mockReturnValue([{ loading: false, dictionary: {} }, (key: string, fallback?: string) => fallback ?? key])
      return view
    }

    it('draws none, and no row for them, when the project has no text for any (a key is not a message)', () => {
      const { queryByTestId, queryByText } = renderWithProviders(<Chat />)
      expect(queryByTestId('chat-quick-messages')).toBeNull()
      expect(queryByText('store_message_1')).toBeNull()
    })

    it('never writes a key of another language\'s catalog entry as a message', () => {
      const keys = { STORE_MESSAGE_1: 'tienda_message_1', STORE_MESSAGE_2: 'magasin_message_2', STORE_MESSAGE_3: 'store_message_3' }
      const { queryByTestId } = withTexts(keys, () => renderWithProviders(<Chat />))
      expect(queryByTestId('chat-quick-messages')).toBeNull()
      expect(quickMessagesOf(2, (key, fallback) => (keys as any)[key] ?? fallback)).toEqual([])
    })

    it('shows the store\'s messages to a business owner, the administrator\'s to an administrator', () => {
      const dictionary = { STORE_MESSAGE_1: 'On it', ADMIN_MESSAGE_1: 'We are checking' }
      const owner = withTexts(dictionary, () => renderWithProviders(<Chat />))
      expect(owner.getByText('On it')).toBeTruthy()
      expect(owner.queryByText('We are checking')).toBeNull()
      asLevel(0)
      const admin = withTexts(dictionary, () => renderWithProviders(<Chat />))
      expect(admin.getByText('We are checking')).toBeTruthy()
      expect(admin.queryByText('On it')).toBeNull()
    })

    it('writes the message into the field when pressed, after what is there', () => {
      const setMessage = jest.fn()
      const { getByText } = withTexts({ STORE_MESSAGE_1: 'On it' }, () => renderWithProviders(<Chat setMessage={setMessage} message='Hi' />))
      fireEvent.press(getByText('On it'))
      expect(setMessage).toHaveBeenCalledWith('Hi On it')
    })

    it('hides them with visibility messages.quick_messages, and nothing else', () => {
      const { queryByTestId, getByTestId } = withTexts({ STORE_MESSAGE_1: 'On it' }, () => renderWithProviders(<Chat />, hidden('messages.quick_messages')))
      expect(queryByTestId('chat-quick-messages')).toBeNull()
      expect(getByTestId('chat-recipient-customer')).toBeTruthy()
    })
  })

  describe('composer', () => {
    it('updates the message from the field', () => {
      const setMessage = jest.fn()
      const { getByTestId } = renderWithProviders(<Chat setMessage={setMessage} message='' />)
      fireEvent.changeText(getByTestId('chat-input'), 'Hello customer')
      expect(setMessage).toHaveBeenCalledWith('Hello customer')
    })

    it('sends with the send button and clears the composer', () => {
      const handleSend = jest.fn()
      const setMessage = jest.fn()
      const setImage = jest.fn()
      const { getByLabelText } = renderWithProviders(
        <Chat handleSend={handleSend} setMessage={setMessage} setImage={setImage} message='hi' />
      )
      fireEvent.press(getByLabelText('Send message'))
      expect(handleSend).toHaveBeenCalled()
      expect(setMessage).toHaveBeenCalledWith('')
      expect(setImage).toHaveBeenCalledWith(null)
    })

    it('draws the send button as its slot says, disabled with nothing to send', () => {
      const slot = theme.native.components.chat_bubble.slots.send
      const empty = renderWithProviders(<Chat message='' image={null} />)
      expect(empty.getByLabelText('Send message').props.accessibilityState.disabled).toBe(true)
      const ready = renderWithProviders(<Chat message='hi' />)
      const send = ready.getByLabelText('Send message')
      expect(send.props.accessibilityState.disabled).toBe(false)
      expect(flat(send.children[0] as any).borderRadius).toBe(
        slot.shape === 'round' ? theme.native.components.button.shapes.round.radius : theme.native.components.button.shapes.icon.radius
      )
    })

    it('sends from the keyboard', () => {
      const handleSend = jest.fn()
      const { getByTestId } = renderWithProviders(<Chat handleSend={handleSend} message='hi' />)
      fireEvent(getByTestId('chat-input'), 'submitEditing')
      expect(handleSend).toHaveBeenCalled()
    })

    it('does not send while the messages load or a message is on its way', () => {
      const loading = renderWithProviders(<Chat message='hi' messages={{ loading: true, messages: [] }} />)
      expect(loading.getByLabelText('Send message').props.accessibilityState.disabled).toBe(true)
      const sending = renderWithProviders(<Chat message='hi' sendMessage={{ loading: true }} />)
      expect(sending.getByLabelText('Send message').props.accessibilityState.disabled).toBe(true)
    })

    it('attaches a photo from the image button, and removes it', () => {
      const setImage = jest.fn()
      const { getByLabelText, queryByLabelText } = renderWithProviders(<Chat setImage={setImage} image={null} />)
      expect(queryByLabelText('Remove')).toBeNull()
      fireEvent.press(getByLabelText('Attach photo'))
      expect(launchImageLibrary).toHaveBeenCalled()
      expect((launchImageLibrary as jest.Mock).mock.calls[0][0].saveToPhotos).not.toBe(true)
      expect(setImage).toHaveBeenCalledWith('data:image/jpeg;base64,abc123')
      fireEvent.press(getByLabelText('Remove'))
      expect(setImage).toHaveBeenLastCalledWith(null)
      expect(queryByLabelText('Remove')).toBeNull()
    })

    it('attaches nothing when no photo is picked', () => {
      const setImage = jest.fn()
      ;(launchImageLibrary as jest.Mock).mockImplementationOnce((_opts, cb) => cb?.({ assets: [] }))
      const { getByLabelText } = renderWithProviders(<Chat setImage={setImage} image={null} />)
      fireEvent.press(getByLabelText('Attach photo'))
      expect(setImage).not.toHaveBeenCalled()
    })

    it('hides the image button with visibility messages.image_upload, and nothing else', () => {
      const { queryByLabelText, getByTestId } = renderWithProviders(<Chat />, hidden('messages.image_upload'))
      expect(queryByLabelText('Attach photo')).toBeNull()
      expect(getByTestId('chat-input')).toBeTruthy()
    })

    it('has no signature button by default (the mockup draws none), and no file button', () => {
      const { queryByLabelText } = renderWithProviders(<Chat />)
      expect(queryByLabelText('Signature')).toBeNull()
      expect(queryByLabelText('Attach file')).toBeNull()
    })

    it('keeps the signature pad behind visibility messages.signature: opens, clears and closes it', () => {
      const setImage = jest.fn()
      const { getByLabelText, queryByTestId, getByTestId } = renderWithProviders(
        <Chat setImage={setImage} image='data:image/jpeg;base64,abc123' />,
        shown('messages.signature')
      )
      expect(queryByTestId('chat-signature')).toBeNull()
      fireEvent.press(getByLabelText('Signature'))
      expect(setImage).toHaveBeenCalledWith(null)
      expect(getByTestId('signature-pad')).toBeTruthy()
      fireEvent.press(getByLabelText('Clear'))
      expect(mockClearSignature).toHaveBeenCalled()
      fireEvent.press(getByLabelText('Signature'))
      expect(queryByTestId('chat-signature')).toBeNull()
    })

    it('draws the send button round as its slot says now, after the field', () => {
      const slot = theme.native.components.chat_bubble.slots.send
      expect(slot.shape).toBe('round')
      expect(slot.color).toBe('primary')
      expect(slot.appearance).toBe('solid')
      const { getByLabelText } = renderWithProviders(<Chat message='hi' />)
      expect(flat(getByLabelText('Send message').children[0] as any).borderRadius).toBe(theme.native.components.button.shapes.round.radius)
    })

    it('lays the composer out as the driver\'s: who receives it, then the buttons, the field and the send button in one row', () => {
      const { getByTestId, getByLabelText } = renderWithProviders(<Chat message='hi' />)
      const composer = getByTestId('chat-composer')
      const row = getByTestId('chat-composer-row')
      expect(flat(row).flexDirection).toBe('row')
      expect(flat(row).gap).toBe(theme.native.tokens.space.xs)
      expect(composer.findAll((node: any) => node === getByTestId('chat-recipients'))).toHaveLength(1)
      const inRow = (node: any) => row.findAll((candidate: any) => candidate === node).length > 0
      expect(inRow(getByLabelText('Attach photo'))).toBe(true)
      expect(inRow(getByTestId('chat-input'))).toBe(true)
      expect(inRow(getByLabelText('Send message'))).toBe(true)
    })

    it('puts the quick messages and the composer under the line, the recipients before the quick messages', () => {
      const { useLanguage } = require('@components')
      const dictionary = { STORE_MESSAGE_1: 'On it' }
      useLanguage.mockReturnValue([{ loading: false, dictionary }, (key: string, fallback?: string) => (dictionary as any)[key] ?? fallback ?? key])
      const { getByTestId, UNSAFE_getAllByProps } = renderWithProviders(<Chat />)
      useLanguage.mockReturnValue([{ loading: false, dictionary: {} }, (key: string, fallback?: string) => fallback ?? key])
      const composer = getByTestId('chat-composer')
      expect(composer.findAll((node: any) => node === getByTestId('chat-quick-messages'))).toHaveLength(1)
      expect(UNSAFE_getAllByProps({ testID: 'chat-composer-row' }).length).toBeGreaterThan(0)
      const order = composer.findAll((node: any) => node.props?.testID === 'chat-recipients' || node.props?.testID === 'chat-quick-messages')
        .map((node: any) => node.props.testID)
      expect(order.indexOf('chat-recipients')).toBeLessThan(order.indexOf('chat-quick-messages'))
    })

    it('lifts the composer over the keyboard with the bar padding, and clears the inset when it is down', () => {
      const listeners: Record<string, Function> = {}
      const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((event: any, listener: any) => {
        listeners[event] = listener
        return { remove: jest.fn() } as any
      })
      const { getByTestId } = renderWithProviders(<Chat />)
      const resting = flat(getByTestId('chat-composer')).paddingBottom
      act(() => { listeners.keyboardWillShow?.({ endCoordinates: { screenX: 0, screenY: 500, width: 390, height: 300 } }) })
      expect(flat(getByTestId('chat-composer')).paddingBottom).toBe(theme.native.components.bottom_bar.base.padding)
      expect(resting).toBeDefined()
      spy.mockRestore()
    })
  })

  describe('an ended order', () => {
    const ended = { ...sampleOrder, status: 1 }

    it('keeps the thread readable and replaces the composer with a notice and "View order"', () => {
      const onViewOrder = jest.fn()
      const { getByText, queryByTestId, queryByLabelText, getByTestId, queryByText } = renderWithProviders(
        <Chat order={ended} onViewOrder={onViewOrder} />
      )
      expect(getByText('Hello there')).toBeTruthy()
      expect(getByText('This order has ended, so you can\'t send new messages.')).toBeTruthy()
      expect(queryByTestId('chat-input')).toBeNull()
      expect(queryByLabelText('Send message')).toBeNull()
      expect(queryByTestId('chat-recipients')).toBeNull()
      expect(queryByTestId('chat-quick-messages')).toBeNull()
      expect(queryByText('Send to')).toBeNull()
      fireEvent.press(getByTestId('chat-view-order'))
      expect(onViewOrder).toHaveBeenCalledTimes(1)
    })

    it('draws the notice as a row whose text wraps to the room that is left (never one cut line)', () => {
      const { getByTestId, getByText } = renderWithProviders(<Chat order={ended} />)
      const box = flat(getByTestId('chat-ended-notice'))
      expect(box.flexDirection).toBe('row')
      const text = getByText('This order has ended, so you can\'t send new messages.')
      // The app's own notice (`ONotice`): its text takes the lines it needs and the body takes the room that is left.
      expect(text.props.numberOfLines).toBeUndefined()
      let body: any = text.parent
      while (body && flat(body)?.flexShrink !== 1) body = body.parent
      expect(body).toBeTruthy()
    })

    it.each([1, 2, 5, 6, 10, 11, 12, 15, 16, 17])('is ended for status %s', (status) => {
      const { queryByTestId } = renderWithProviders(<Chat order={{ ...sampleOrder, status }} />)
      expect(queryByTestId('chat-input')).toBeNull()
    })

    it.each([0, 3, 4, 7, 8, 9, 13, 14, 18, 22])('can be written to for status %s', (status) => {
      const { queryByTestId } = renderWithProviders(<Chat order={{ ...sampleOrder, status }} />)
      expect(queryByTestId('chat-input')).toBeTruthy()
      expect(queryByTestId('chat-recipients')).toBeTruthy()
    })
  })

  describe('message options', () => {
    it('opens on a long press of a bubble and copies its text', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Chat />)
      expect(queryByText('Copy text')).toBeNull()
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      expect(getByText('Message options')).toBeTruthy()
      fireEvent.press(getByText('Copy text'))
      expect(Clipboard.setString).toHaveBeenCalledWith('Hello there')
      expect(queryByText('Copy text')).toBeNull()
    })

    it('closes with Cancel', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      fireEvent.press(getByText('Cancel'))
      expect(queryByText('Copy text')).toBeNull()
    })

    it('offers to call or text the phone of a message', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
      const { getByTestId, getByText, queryByText, getAllByText } = renderWithProviders(<Chat messages={thread(said())} />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      expect(getAllByText('555-123-4567')).toHaveLength(2)
      fireEvent.press(getByText('Call'))
      expect(openURL).toHaveBeenCalledWith('tel:5551234567')
      expect(queryByText('Call')).toBeNull()
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      fireEvent.press(getByText('Text'))
      expect(openURL).toHaveBeenCalledWith('sms:5551234567')
      openURL.mockRestore()
    })

    it('opens with a tap on a phone of the text, for that phone', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
      const { getByText, queryByText } = renderWithProviders(
        <Chat messages={thread(said({ comment: 'Store 555-000-1111 or me 555-123-4567' }))} />
      )
      expect(queryByText('Call')).toBeNull()
      fireEvent.press(getByText('555-123-4567'))
      expect(openURL).not.toHaveBeenCalled()
      fireEvent.press(getByText('Call'))
      expect(openURL).toHaveBeenCalledWith('tel:5551234567')
      openURL.mockRestore()
    })

    it('offers no call for a message without a phone', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      expect(getByText('Copy text')).toBeTruthy()
      expect(queryByText('Call')).toBeNull()
      expect(queryByText('Text')).toBeNull()
    })

    it('reads a link on its bubble: legible over the solid brand colour (the bubble\'s own ink)', () => {
      const { getByText } = renderWithProviders(
        <Chat messages={thread(said({ author: { id: 1, name: 'Me', level: 2 }, comment: 'See https://example.com/x' }))} />
      )
      const link = flat(getByText('https://example.com/x'))
      expect(link.textDecorationLine).toBe('underline')
      expect(link.color).toBe(theme.native.components.chat_bubble.base.mine_color)
    })
  })
})
