import React from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import {
  OrderMessage as OrderMessageController,
  SafeAreaContainer,
} from '@ui';

const OrderMessage = ({navigation, route}: any) => {
  const {orderId, isFromCheckout, setOrders} = route.params;
  const orderDetailsProps = {
    navigation,
    orderId,
    setOrders,
    isFromCheckout,
    isDisabledOrdersRoom: true,
    driverAndBusinessId: true,
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.screen}
      testID="chat-keyboard-screen">
      <SafeAreaContainer edges={['top', 'left', 'right']}>
        <OrderMessageController {...orderDetailsProps} />
      </SafeAreaContainer>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
});

export default OrderMessage;
