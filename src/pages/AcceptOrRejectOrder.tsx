import React from 'react';
import {
  AcceptOrRejectOrder as AcceptOrRejectOrderController,
  SafeAreaContainer,
} from '@ui';

const AcceptOrRejectOrder = ({ navigation, route }: any) => {
  return (
    <SafeAreaContainer>
      <AcceptOrRejectOrderController
        isPage
        navigation={navigation}
        route={route.params}
        notShowCustomerPhone={false}
        actions={{ accept: 'acceptByBusiness', reject: 'rejectByBusiness', forceStatus: 'forceStatus' }}
        appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
        orderTitle={{
          accept: { key: 'PREPARATION_TIME', text: 'Preparation time', btnKey: 'ACCEPT', btnText: 'Accept' },
          reject: { key: 'REJECT_ORDER', text: 'Reject Order', btnKey: 'REJECT', btnText: 'Reject' },
          forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' }
        }}
        action={route.params.action}
        customerCellphone={route.params?.order?.customer?.cellphone}
        orderId={route.params.ids?.[0]}
        handleUpdateOrder={async (param1: any, param2: any) => {
          const result = await route.params?.handleChangeOrderStatus &&
            await route.params?.handleChangeOrderStatus(param1, route.params?.ids, param2)
          result?.length === route.params?.ids?.length && navigation?.canGoBack() && navigation.goBack()
        }}
        closeModal={() => navigation?.canGoBack() && navigation.goBack()}
      />
    </SafeAreaContainer>
  );
};

export default AcceptOrRejectOrder;
