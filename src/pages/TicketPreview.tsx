import React from 'react'
import {
  Container,
  TicketPreview
} from '@ui'

interface Props {
  navigation: any;
  route: any;
}

const TicketPage = (props: Props) => {
  const printerProps = {
    ...props,
    order: { ...props?.route?.params?.order, orderStatus: props?.route?.params?.orderStatus },
    printerSettings: props?.route?.params?.printerSettings,
    shouldPrintOnMount: !!props?.route?.params?.shouldPrintOnMount
  }

  return (
    <Container>
      <TicketPreview {...printerProps} />
    </Container>
  )
}

export default TicketPage
