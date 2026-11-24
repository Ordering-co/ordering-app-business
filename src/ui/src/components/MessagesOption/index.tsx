import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useNetInfo } from '@react-native-community/netinfo';

import { MessagesOptionParams } from '../../types';

import { Contacts, useApi, useConfig, useEvent, useLanguage, useSession } from '@components';
import {
  FilterChip,
  OBadge,
  Icon,
  OButton,
  OInput,
  ONavbar,
  ONotice,
  NotFoundSource,
  PreviousMessages
} from '@ui'
import { countText } from '../shared/countText'
import { applyStatusToRows, ORDER_CHANGED_EVENT } from '../OrdersOption/orderChanges'
import { apiErrorText } from '../../utils/errorText'
import { customerNameOf, unreadOf } from '../PreviousMessages/conversation'
import { orderNumber } from '../OrderDetails/orderData'
import { themeGutter, themeSpace, themeVisible } from '@/theme/helpers'
import { columnBleed, useLayout } from '@/theme/platform'
import { useReportUnreadMessages } from '../../../../context/UnreadMessagesContext'
import { useOnReconnect } from '../../../../context/SocketReconnectContext'
import { openChatOrderId } from '../../../../navigators/NavigationRef'

/**
 * The Messages tab: its title and search button (`visibility.messages.title`, `messages.search`), the All / Unread
 * chips (`messages.filter`) and the conversations (`PreviousMessages`). The search looks through the rows the list
 * has loaded (the customer's name, the order's number); the list asks for more pages with its "Load more" button.
 * The chips and the list carry the page gutter on their content, as the rest of the app's lists do.
 *
 * It also tells the tab bar how many messages are unread: the sum of the `unread_direct_count` of the orders it
 * has loaded (the one datum the API gives; no call of its own), `more` when the list has pages it has not loaded
 * yet. It says nothing before there is a session, while the list loads for the first time or once it has failed,
 * so the tab shows no number the app cannot know. The `Unread` chip counts the conversations with unread messages.
 *
 * The list is asked for only once there is a session (a token and a user), and again when the user changes. A
 * failed list is never kept: the `Contacts` controller carries the error of the render a request left from into
 * its answer, so a retry made on the same controller still shows the old error. Any new request made while the
 * list is in error (refresh, a page) is therefore a new controller (`restart`), which asks again from nothing.
 *
 * It is built at launch, before its tab is ever opened, and stays in the tree while another tab is shown:
 * nothing here may depend on the screen being visible (no focus effect, no read marking, no sound, no tracking
 * event); `MessagesOption.live.test.tsx` pins it.
 */
const messagesStyles = (theme: any, bleed = 0) => StyleSheet.create({
  // The chips scroll out to the screen's edges (the window's, on a tablet held upright: `bleed`): the gutter is on their content.
  filters: { flexGrow: 0, marginBottom: themeSpace(theme, 'xs'), marginHorizontal: -bleed },
  // No space of its own over the chips: the bar owns the space under it.
  chips: { gap: themeSpace(theme, 'sm'), paddingHorizontal: themeGutter(theme) + bleed },
  badge: { alignSelf: 'center' as const },
  notice: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'xs') },
  search: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'xs') },
  gutter: { paddingHorizontal: themeGutter(theme) },
  list: { flex: 1 },
})

type FilterKey = 'all' | 'unread'

/** What the list's screen is given besides the controller's props. */
type MessagesOptionProps = MessagesOptionParams & {
  /** The order whose chat is open beside the list (a landscape tablet): its row is marked and its count is never kept. */
  selectedOrderId?: number | string | null
  /** Starts the list over with a new controller. */
  onRestart?: () => void
}

/** The customer's name and the order's number, lower-cased, as a row is looked up by. */
const searchText = (order: any, configs: any, t: any) => [
  customerNameOf(order, configs, t),
  `#${orderNumber(order, configs)}`,
  // The order's own id too: it is what the other screens of the dashboard print.
  `#${order?.id}`,
  order?.business?.name,
].filter(Boolean).join(' ').toLowerCase()

const MessagesOptionUI = (props: MessagesOptionProps) => {
  const {
    orders,
    setOrders,
    loadMore,
    pagination,
    messages,
    onNavigationRedirect,
    getOrders,
    onRestart,
    selectedOrderId
  } = props;

  const theme: any = useTheme();
  const layout = useLayout();
  const bleed = columnBleed(layout);
  const styles = useMemo(() => messagesStyles(theme, bleed), [theme, bleed]);
  const [, t] = useLanguage();
  const [events] = useEvent();
  const [{ configs }] = useConfig();
  const isOffline = useNetInfo().isConnected === false;

  const { loading, error, data: values } = orders;
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [known, setKnown] = useState<{ total: number, more: boolean } | null>(null);

  const showTitle = themeVisible(theme, 'messages.title')
  const showSearch = themeVisible(theme, 'messages.search')
  const showFilter = themeVisible(theme, 'messages.filter')
  const more = !!pagination?.totalPages && pagination.currentPage < pagination.totalPages

  // The controller edits the orders' array in place (a new message moves an order to the top), so what follows the
  // list follows its state object, which is new with every change, never the array.
  // A list that is loading keeps what it last knew (the count is replaced when a list arrives); one that has failed
  // knows nothing, and its error is not the count's to hide.
  useEffect(() => {
    if (loading) return
    if (error) {
      setKnown(null)
      return
    }
    setKnown({ total: (values ?? []).reduce((total: number, order: any) => total + unreadOf(order), 0), more })
  }, [loading, error, orders, more])
  useReportUnreadMessages(known)

  // A list in error asks again through a new controller (see the top of the file).
  const restart = useCallback(() => onRestart?.(), [onRestart])

  // The socket came back: the messages of the gap are lost, so the list (and with it the tab's count) loads again.
  useOnReconnect(() => {
    if (error) restart()
    else getOrders?.()
  })

  const clearUnread = (order: any) => ({ ...order, unread_count: 0, unread_direct_count: 0 })

  // The chat that is open on screen (the stack's, or the tablet's second pane) is read as its messages arrive. The
  // list refetches an order when a message of it arrives, and that answer can land after the chat's own read (or
  // before it) with a count the business is already looking at: the open chat's count is never kept.
  useEffect(() => {
    const openId = selectedOrderId !== undefined && selectedOrderId !== null ? Number(selectedOrderId) : openChatOrderId()
    if (!setOrders || openId === undefined) return
    if (!values?.some((order: any) => Number(order?.id) === openId && unreadOf(order) > 0)) return
    setOrders((previous: any) => ({
      ...previous,
      data: previous?.data?.map((order: any) => (Number(order?.id) === openId && unreadOf(order) > 0 ? clearUnread(order) : order))
    }))
  }, [orders, setOrders, selectedOrderId])

  // The business read the chat of an order: its count is zero in the list, so the sum (and the tab's counter) follows.
  useEffect(() => {
    if (!setOrders) return
    const handleChatRead = (orderId: number | string) => {
      setOrders((previous: any) => {
        const isUnread = (order: any) => Number(order?.id) === Number(orderId) && unreadOf(order) > 0
        if (!previous?.data?.some(isUnread)) return previous
        return { ...previous, data: previous.data.map((order: any) => (isUnread(order) ? clearUnread(order) : order)) }
      })
    }
    events.on('order_message_read', handleChatRead)
    return () => events.off('order_message_read', handleChatRead)
  }, [events, setOrders])

  // The app changed an order (accepted, marked ready, picked up…) and says so with the event the orders list hears: the row
  // that shows its status follows, without waiting for a socket event or a refresh.
  useEffect(() => {
    if (!setOrders) return
    const handleOrderChanged = (change: any) => {
      setOrders((previous: any) => {
        const data = applyStatusToRows(previous?.data, change)
        return data === previous?.data ? previous : { ...previous, data }
      })
    }
    events.on(ORDER_CHANGED_EVENT, handleOrderChanged)
    return () => events.off(ORDER_CHANGED_EVENT, handleOrderChanged)
  }, [events, setOrders])

  const unreadConversations = useMemo(
    () => (values ?? []).filter((order: any) => unreadOf(order) > 0).length,
    [orders]
  )

  const needle = query.trim().toLowerCase()
  const rows = useMemo(() => (values ?? []).filter((order: any) => {
    if (filter === 'unread' && unreadOf(order) === 0) return false
    return !needle || searchText(order, configs, t).includes(needle)
  }), [orders, filter, needle, configs])

  const toggleSearch = () => {
    if (searching) setQuery('')
    setSearching(!searching)
  }

  const unreadCount = unreadConversations > 0 ? countText(unreadConversations, more) : ''

  const emptyText = error
    ? apiErrorText(error, t)
    : filter === 'unread' && !needle
      ? t('NO_UNREAD_MESSAGES', 'No unread messages')
      : t('NO_RESULTS_FOUND', 'Sorry, no results found')

  return (
    <>
      {(showTitle || showSearch) && (
        <ONavbar
          title={showTitle ? t('MESSAGES', 'Messages') : undefined}
          tight
          rightButtons
          right={showSearch ? (
            <OButton
              iconOnly
              color='neutral'
              appearance='ghost'
              size='md'
              accessibilityLabel={t('SEARCH_MESSAGES', 'Search messages')}
              icon={<Icon name={searching ? 'close' : 'search-outline'} />}
              onClick={toggleSearch}
              testID='messages-search-button'
            />
          ) : undefined}
        />
      )}
      {isOffline && (
        <View style={styles.notice}>
          <ONotice variant='warning' testID='messages-offline'>
            {t('MESSAGES_OFFLINE_NOTICE', 'You are offline. Conversations will refresh when the connection returns.')}
          </ONotice>
        </View>
      )}
      {showSearch && searching && (
        <View style={styles.search}>
          <OInput
            testID='messages-search'
            value={query}
            isValueSync
            onChange={setQuery}
            autoFocus
            autoCorrect={false}
            returnKeyType='search'
            vertorIcon='magnify'
            inline
            accessibilityLabel={t('SEARCH_MESSAGES', 'Search messages')}
            placeholder={t('SEARCH_MESSAGES', 'Search messages')}
          />
        </View>
      )}
      {showFilter && (
        <ScrollView
          horizontal
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps='handled'
          testID='messages-filter'
        >
          <FilterChip
            text={t('ALL', 'All')}
            size='sm'
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            testID='messages-filter-all'
          />
          <FilterChip
            text={t('UNREAD', 'Unread')}
            trailing={unreadCount ? <OBadge variant='primary' count style={styles.badge} testID='messages-unread-badge'>{unreadCount}</OBadge> : undefined}
            accessibilityLabel={unreadCount ? `${t('UNREAD', 'Unread')} ${unreadCount}` : undefined}
            size='sm'
            selected={filter === 'unread'}
            onPress={() => setFilter('unread')}
            testID='messages-filter-unread'
          />
        </ScrollView>
      )}

      {!loading && (rows.length === 0 || error) && (
        <View style={styles.gutter}>
          <NotFoundSource content={emptyText} conditioned={false} />
        </View>
      )}
      <View style={styles.list}>
        <PreviousMessages
          orders={rows}
          messages={messages}
          onNavigationRedirect={onNavigationRedirect}
          getOrders={error ? restart : getOrders}
          pagination={pagination}
          loading={loading}
          setOrders={setOrders}
          loadMore={error ? restart : loadMore}
          error={error}
          selectedOrderId={selectedOrderId}
        />
      </View>
    </>
  );
};

/** What the screen shows before there is a session: the list is not asked for, so it is loading. */
const WAITING_FOR_SESSION = { orders: { data: [], loading: true, error: null } }

export const MessagesOption = (props: MessagesOptionProps) => {
  const [{ token, user }] = useSession();
  const [ordering] = useApi();
  const [attempt, setAttempt] = useState(0);

  const restart = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);

  const userId = user?.id;

  if (!token || userId === undefined || userId === null) {
    return <MessagesOptionUI {...props} {...WAITING_FOR_SESSION} />;
  }

  // The controller asks with the API object's own token and sets none (the others of the app set it on every
  // request): put the session's on it before the list is built, or the first request leaves with none.
  if (ordering.accessToken !== token) ordering.setAccessToken(token);

  // A new controller (a new key) per user and per start-over.
  return (
    <Contacts
      key={`${userId}:${attempt}`}
      {...props}
      onRestart={restart}
      UIComponent={MessagesOptionUI}
    />
  );
};
