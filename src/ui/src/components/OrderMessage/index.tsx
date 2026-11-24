import React, { useEffect, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Chat } from '../Chat';
import { OrderDetailsParams } from '../../types';
import {
  useConfig,
  useLanguage,
  OrderDetails as OrderDetailsController,
  useSession,
} from '@components';
import { Icon, ODivider, OButton, ONavbar } from '../shared';
import { ChatMessageSkeleton } from './ChatMessageSkeleton';
import { customerNameOf, customerPhoneOf, isEnded, orderTypeLabel } from '../PreviousMessages/conversation';
import { orderNumberText } from '../OrderDetails/orderData';
import { useOnReconnect } from '../../../../context/SocketReconnectContext';

/**
 * What the chat screen is given besides the order controller's props: `isPane` (the chat of a tablet's second
 * pane: nothing to go back to) and `goToBack`.
 */
type OrderMessageProps = OrderDetailsParams & {
  orderId?: number | string
  isDisabledOrdersRoom?: boolean
  isPane?: boolean
  goToBack?: () => void
}

const orderMessageStyles = () => StyleSheet.create({
  screen: { flex: 1 },
  chat: { flex: 1 },
})

/**
 * The chat screen of an order: the top bar (back, the customer's name, the order's number and type under it, and
 * at its end a call button and the way to the order), and the chat (`Chat`). While the order loads it is the
 * chat's skeleton. An ended order has no call button: its chat only has the notice and "View order".
 *
 * The chat is read when it opens and again whenever a message of someone else arrives while it is on screen: the
 * order's count (the list's row, the tab's counter, the details' button) never keeps a message the business is
 * looking at. The list follows through the controller's `order_message_read` event.
 */
export const OrderMessageUI = (props: OrderMessageProps) => {
  const {
    navigation,
    messages,
    setMessages,
    readMessages,
    goToBack,
    isPane,
  } = props;

  const styles = useMemo(() => orderMessageStyles(), []);
  const [, t] = useLanguage();
  const [{ user }] = useSession();
  const [{ configs }] = useConfig();
  const { order, loading } = props.order;

  const goBack = () => {
    if (goToBack) {
      goToBack();
    } else {
      navigation?.canGoBack() && navigation.goBack();
    }
  };

  const lastIncomingId = [...(messages?.messages ?? [])].reverse().find((message: any) => message?.author_id !== user?.id)?.id;
  useEffect(() => {
    if (!order?.id || messages?.loading) return;
    readMessages && readMessages();
  }, [order?.id, messages?.loading, lastIncomingId]);

  // The socket came back: the messages of the gap are lost, so the chat loads them again.
  useOnReconnect(() => {
    if (order?.id) props.loadMessages?.();
  });

  const viewOrder = () => navigation?.navigate('OrderDetails', { orderId: order?.id });

  const ended = isEnded(order);
  const phone = customerPhoneOf(order, configs);
  const title = customerNameOf(order, configs, t);
  // "Order #1053 · Delivery" (the number the project shows, the app's one phrase): the order the chat is about and how it is served.
  const subtitle = `${orderNumberText(order, t, configs)} · ${orderTypeLabel(t, order?.delivery_type)}`;

  return (
    <>
      {(!order || Object.keys(order).length === 0 || loading) && (
        <ChatMessageSkeleton onBack={isPane ? undefined : goBack} />
      )}

      {order && Object.keys(order).length > 0 && !loading && (
        <View style={styles.screen}>
          <ONavbar
            title={title}
            subtitle={subtitle}
            onBack={isPane ? undefined : goBack}
            rightButtons
            right={ended ? undefined : (
              <>
                {!!phone && (
                  <OButton
                    iconOnly
                    color='neutral'
                    appearance='ghost'
                    size='md'
                    accessibilityLabel={t('CALL_CUSTOMER', 'Call customer')}
                    icon={<Icon name='call-outline' />}
                    onClick={() => { Linking.openURL(`tel:${phone}`).catch(() => {}) }}
                    testID='chat-call'
                  />
                )}
                <OButton
                  iconOnly
                  color='neutral'
                  appearance='ghost'
                  size='md'
                  accessibilityLabel={t('VIEW_ORDER', 'View order')}
                  icon={<Icon name='bag-outline' />}
                  onClick={viewOrder}
                  testID='chat-view-order-button'
                />
              </>
            )}
          />
          <ODivider />

          <View style={styles.chat}>
            <Chat
              orderId={order?.id}
              messages={messages}
              order={order}
              setMessages={setMessages}
              onViewOrder={viewOrder}
            />
          </View>
        </View>
      )}
    </>
  );
};

export const OrderMessage = (props: OrderMessageProps) => {
  const orderDetailsProps = {
    ...props,
    driverAndBusinessId: true,
    isDisabledOrdersRoom: true,
    UIComponent: OrderMessageUI,
  };
  return <OrderDetailsController {...orderDetailsProps} />;
};
