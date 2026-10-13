import React from 'react';
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
    <SafeAreaContainer edges={['top', 'left', 'right']}>
      <OrderMessageController {...orderDetailsProps} />
    </SafeAreaContainer>
  );
};

export default OrderMessage;
