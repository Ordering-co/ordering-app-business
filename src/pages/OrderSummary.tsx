import React from 'react';
import { useTheme } from 'styled-components/native';

import {
  OrderSummary as OrderSummaryController,
  SafeAreaContainer,
} from '@ui';

const OrderSummary = ({ route, navigation }: any) => {
  const orderSummaryProps = {
    order: route.params.order,
    navigation,
    orderStatus: route.params.orderStatus,
  };

  const theme = useTheme();

  return (
    <SafeAreaContainer style={{ backgroundColor: theme.colors.white }}>
      <OrderSummaryController {...orderSummaryProps} />
    </SafeAreaContainer>
  );
};

export default OrderSummary;
