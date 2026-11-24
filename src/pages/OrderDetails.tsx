import React from 'react'
import { OrderDetailsPage, SafeAreaContainerLayout, ScreenContainer } from '@ui'

/**
 * The order's details as a stack screen. The page itself (`OrderDetailsPage`, shared with the tablet board's
 * right-hand panel) builds what the details controller needs; this only reads the route and lays the screen's column.
 */
const OrderDetails = ({ navigation, route }: any) => (
  <SafeAreaContainerLayout>
    <ScreenContainer>
      <OrderDetailsPage
        presentation='screen'
        navigation={navigation}
        orderId={route.params?.orderId || route.params?.order?.id}
        order={route.params?.order}
        isFromCheckout={route.params?.isFromCheckout}
        isFromRoot={route.params?.isFromRoot}
      />
    </ScreenContainer>
  </SafeAreaContainerLayout>
)

export default OrderDetails
