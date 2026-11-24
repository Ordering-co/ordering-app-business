import { createReportedCount, type ReportedCount } from './reportedCount'

/**
 * How many messages the business has not read, for the Messages tab.
 *
 * The app has no call for a total: each order of the Messages list carries its own `unread_count` and the list
 * (the `Contacts` controller) keeps it fresh from the socket's `message` event. So the total is derived from what
 * that list has loaded and is reported here by the list itself (`useReportUnreadMessages`); the tab bar, which lives
 * outside the Messages screen, reads it (`useUnreadMessages`). The tab bar builds that screen at launch (the one tab
 * that is not lazy), so the list loads, and follows the socket, whichever tab is shown. Until the list has loaded
 * once there is nothing to show (`null`); `more` says it has pages it has not loaded, so the total is a lower bound
 * and is written with a "+".
 *
 * Without a provider (a component on its own, a test) a report goes nowhere and nothing is known.
 */
export type UnreadMessages = ReportedCount

const unread = createReportedCount()

export const UnreadMessagesProvider = unread.Provider

/** The unread messages the Messages list knows of; `null` while it knows nothing. */
export const useUnreadMessages = (): UnreadMessages | null => unread.useValue()

/** Reports the list's count while it is mounted and takes it back when it leaves. */
export const useReportUnreadMessages = (count: UnreadMessages | null) => unread.useReport(count)

/** What the Messages list counts: the unread messages of the orders it has loaded. */
export const unreadTotal = (orders: Array<{ unread_count?: number | string | null }> | null | undefined): number =>
  (orders ?? []).reduce((total, order) => total + (Number(order?.unread_count) > 0 ? Number(order?.unread_count) : 0), 0)

/**
 * The count as the tab bar and a row of the list write it for a screen reader ("2 unread messages"), with a "+"
 * when the list has more pages than it has loaded. One text per count, each with its own key.
 */
export const unreadMessagesText = (t: (key: string, fallback: string) => string, total: number, more = false): string => {
  const text = total === 1 && !more
    ? t('UNREAD_MESSAGES_COUNT_ONE', '_count_ unread message')
    : t('UNREAD_MESSAGES_COUNT', '_count_ unread messages')
  return text.replace('_count_', `${total}${more ? '+' : ''}`)
}
