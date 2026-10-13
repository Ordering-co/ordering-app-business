import React from 'react';
import { useConfig } from '@components';
import {
  OrderDetailsBusiness as OrderDetailsController,
  SafeAreaContainerLayout,
  isManualDriverAssignmentEnabled,
} from '@ui';
import settings from '../config.json'

const OrderDetails = ({ navigation, route }: any) => {
  const [{ configs }] = useConfig();
  const orderDetailsProps = {
    navigation,
    orderId: route.params?.orderId || route.params?.order?.id,
    driverAndBusinessId: true,
    order: route.params?.order,
    isFromCheckout: route.params?.isFromCheckout,
    isFromRoot: route.params?.isFromRoot,
    isFetchDrivers: isManualDriverAssignmentEnabled(configs),
    isBusiness: true,
    isDisabledOrdersRoom: true,
    isBusinessApp: true,
    notificationApp: settings?.notification_app,
    actions: { accept: 'acceptByBusiness', reject: 'rejectByBusiness', forceStatus: 'forceStatus' },
    orderTitle: {
      accept: { key: 'PREPARATION_TIME', text: 'Preparation time', btnKey: 'CHANGE_PREPARATION_TIME', btnText: 'Change preparation time' },
      reject: { key: 'REJECT_ORDER', text: 'Reject Order', btnKey: 'REJECT', btnText: 'Reject' },
      forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' }
    },
    appTitle: { key: 'BUSINESS_APP', text: 'Business App' },
  };

  return (
    <SafeAreaContainerLayout paddingHorizontal={0} edges={['top', 'left', 'right', 'bottom']}>
      <OrderDetailsController {...orderDetailsProps} />
    </SafeAreaContainerLayout>
  );
};

export default OrderDetails;
