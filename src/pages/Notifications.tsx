import React from 'react'
import { SafeAreaContainerLayout, AlertsAndSound } from '@ui'

interface Props {
  navigation: any
  route: any
}

/** Alerts and sound: the permission notice and the local settings of the new-order alert. */
const Notifications = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <AlertsAndSound navigation={navigation} />
  </SafeAreaContainerLayout>
)

export default Notifications
