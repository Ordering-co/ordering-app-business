import { useEffect, useRef, useState } from 'react'

import { useEvent } from '@components'

/**
 * How many messages of an order the business has not read, for the message button of the customer's card.
 *
 * The details load the order's messages once and follow the socket's `message` for new ones, but the chat is a
 * screen of its own with its own copy: reading it did not reach the details, and the button kept its count. The
 * read is the app's one event, `order_message_read`, so the count follows it too: what the details know of the
 * order when it comes is read; a message that arrives later counts again.
 */
export const useUnreadMessagesOfOrder = (
  orderId: number | string | undefined,
  messages: any[] | undefined,
  userId: number | string | undefined
): number => {
  const [events] = useEvent()
  const [readUpTo, setReadUpTo] = useState(0)
  // The latest messages, for the event's handler to read when it comes.
  const latest = useRef(messages)
  latest.current = messages

  useEffect(() => {
    if (orderId === undefined || orderId === null) return
    const handleRead = (readOrderId: number | string) => {
      if (Number(readOrderId) !== Number(orderId)) return
      const newest = Math.max(0, ...(latest.current ?? []).map((message: any) => Number(message?.id) || 0))
      setReadUpTo((previous) => Math.max(previous, newest))
    }
    events.on('order_message_read', handleRead)
    return () => events.off('order_message_read', handleRead)
  }, [events, orderId])

  return (messages ?? []).filter((message: any) =>
    message?.author_id !== userId && !message?.read && !(Number(message?.id) <= readUpTo)
  ).length
}
