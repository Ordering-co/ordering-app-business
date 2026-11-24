import React from 'react'
import { SafeAreaContainerLayout, OrdersDisplaySettings } from '@ui'

interface Props {
  navigation: any
  route: any
}

/** Orders display: how the order cards look on this device (quick actions, clock time). */
const OrdersDisplay = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <OrdersDisplaySettings navigation={navigation} />
  </SafeAreaContainerLayout>
)

export default OrdersDisplay
