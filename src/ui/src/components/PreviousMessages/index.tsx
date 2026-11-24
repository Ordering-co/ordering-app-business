import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { PreviousMessagesParams } from '../../types';
import { FooterComponent } from './FooterMessageComponent';
import { ConversationRow } from './ConversationRow';
import { MessageListSkeleton } from './MessageListSkeleton';
import { messageListStyles } from './styles';
import { customerNameOf, isEnded, lastIncomingRole, orderTypeLabel, unreadOf } from './conversation';
import { orderStatusVariant } from '../shared/orderStates';

import { useConfig, useLanguage, useSession } from '@components';
import { ODivider } from '../shared';
import { statusLabel } from '../OrderDetails/orderStages';
import { orderNumber } from '../OrderDetails/orderData';
import { themePart, themeVisible } from '@/theme/helpers';
import { useFormats } from '@/hooks/useFormats';

const NO_ORDERS: Array<any> = []

type PreviousMessagesProps = PreviousMessagesParams & {
  /** The order whose chat is open in a tablet's second pane. */
  selectedOrderId?: number | string | null
}

/**
 * The conversations of the Messages tab, each a flat row that opens its chat (`ConversationRow`), with the
 * app's line between them, pull to refresh and, at the end, the rows loading next or the button that asks for
 * them. The rows come already filtered (All / Unread, the search); the styles are in `./styles`, shared with
 * the list's skeleton.
 */
export const PreviousMessages = (props: PreviousMessagesProps) => {
  const {
    orders,
    onNavigationRedirect,
    getOrders,
    pagination,
    loading,
    reload,
    loadMore,
    error,
    selectedOrderId,
  } = props;

  const [, t] = useLanguage();
  const theme: any = useTheme();
  const styles = useMemo(() => messageListStyles(theme), [theme]);
  const { time, date } = useFormats();
  const [{ configs }] = useConfig();
  const [{ user }] = useSession();
  const [refreshing] = useState(false);
  const spinner = themePart(theme, 'spinner', 'base.color')
  const spinnerColors = useMemo(() => [spinner], [spinner])
  const showUnread = themeVisible(theme, 'messages.unread_badge')

  const handlePressOrder = useCallback((order: any) => {
    onNavigationRedirect && onNavigationRedirect('OrderMessage', { orderId: order?.id });
  }, [onNavigationRedirect]);

  // The time of the last message when it was today, else its day: the list never shows a bare time of another day.
  const timeOf = (order: any): string | undefined => {
    const at = order?.last_direct_message_at
    if (!at) return undefined
    // Today's messages say their time, the others their day.
    return date(at) === date(Date.now()) ? time(at) : date(at)
  }

  const roleLabels: Record<string, string> = {
    driver: t('DRIVER', 'Driver'),
    business: t('BUSINESS', 'Business'),
  }

  const renderOrder = ({ item: order }: { item: any }) => {
    const role = lastIncomingRole(order, user?.id)
    return (
      <ConversationRow
        order={order}
        title={customerNameOf(order, configs, t)}
        number={`#${orderNumber(order, configs)}`}
        tag={role ? roleLabels[role] : undefined}
        meta={orderTypeLabel(t, order?.delivery_type)}
        time={timeOf(order)}
        status={statusLabel(order?.status, t, order)}
        statusVariant={orderStatusVariant(order?.status)}
        unread={unreadOf(order)}
        ended={isEnded(order)}
        selected={selectedOrderId !== undefined && selectedOrderId !== null && Number(selectedOrderId) === Number(order?.id)}
        showUnread={showUnread}
        onPress={handlePressOrder}
        styles={styles}
      />
    )
  }

  const showRows = !reload && !error
  const showInitialSkeleton = (loading || reload) && !orders?.length;

  return (
    <View style={styles.fill}>
      {showInitialSkeleton ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <MessageListSkeleton count={6} />
        </ScrollView>
      ) : (
        <FlatList
          data={showRows ? orders : NO_ORDERS}
          renderItem={renderOrder}
          keyExtractor={(order) => String(order?.id)}
          ItemSeparatorComponent={ODivider}
          extraData={selectedOrderId}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
          style={styles.list}
          contentContainerStyle={[styles.content, !orders?.length && styles.contentEmpty]}
          refreshControl={<RefreshControl
            refreshing={refreshing}
            onRefresh={() => getOrders?.()}
            tintColor={spinner}
            colors={spinnerColors}
          />}
          ListFooterComponent={<FooterComponent
            loading={loading}
            reload={reload}
            pagination={pagination}
            loadMore={loadMore}
            skeletonCount={orders?.length ? 2 : 0}
            showMore={!error}
          />}
        />
      )}
    </View>
  );
};
