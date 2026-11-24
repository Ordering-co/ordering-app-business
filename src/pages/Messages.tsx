import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  MessagesOption,
  OrderMessage,
  PaneLayout,
  KeyboardScreen,
  SafeAreaContainerLayout,
  ScreenContainer,
  SelectConversation,
} from '@ui';
import { useLayout } from '@/theme/platform';

const Messages = ({ navigation }: any) => {
  const { landscapeTablet } = useLayout();
  // The conversation open in the second pane of a landscape tablet.
  const [selectedOrderId, setSelectedOrderId] = useState<number | string | null>(null);

  const MyOrderProps = {
    navigation,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      // A landscape tablet shows the chat beside the list; the phone (and a portrait tablet) opens it as a screen.
      if (landscapeTablet && page === 'OrderMessage') {
        setSelectedOrderId(params?.orderId);
        return;
      }
      navigation.navigate(page, params);
    },
    firstFetch: 'orders',
    sortParams: {
      param: 'last_direct_message_at',
      direction: 'asc',
    },
    paginationSettings: {
      page: 1,
      pageSize: 45,
      controlType: 'infinity',
    },
  };

  // The layout gives the safe area and the page's background; the list carries the gutter.
  if (landscapeTablet) {
    return (
      <SafeAreaContainerLayout>
        <PaneLayout
          testID='messages-panes'
          list={<MessagesOption {...MyOrderProps} selectedOrderId={selectedOrderId} />}
          detail={selectedOrderId === null ? <SelectConversation /> : (
            <KeyboardScreen behavior='padding' style={styles.screen} testID='chat-keyboard-screen'>
              <OrderMessage
                key={selectedOrderId}
                navigation={navigation}
                orderId={selectedOrderId}
                isDisabledOrdersRoom
                isPane
              />
            </KeyboardScreen>
          )}
        />
      </SafeAreaContainerLayout>
    );
  }

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer>
        <MessagesOption {...MyOrderProps} />
      </ScreenContainer>
    </SafeAreaContainerLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
});

export default Messages;
