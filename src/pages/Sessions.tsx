import React from 'react'
import { SafeAreaContainerLayout, Sessions as SessionsController } from '@ui'

interface Props {
  navigation: any
  route: any
}

const Sessions = (props: Props) => (
  <SafeAreaContainerLayout>
    <SessionsController {...props} />
  </SafeAreaContainerLayout>
)

export default Sessions
