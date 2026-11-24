import React, { useMemo } from 'react'
import { TicketPreview } from '@ui'

interface Props {
  navigation: any
  route: any
}

/**
 * The ticket preview. Params: `{ order, orderStatus?, printerSettings?, shouldPrintOnMount? }`. It opens with or without
 * a printer saved (the old `OrderSummary` screen is gone: this page is the print entry).
 */
const TicketPage = (props: Props) => {
  const params = props.route?.params ?? {}
  const order = useMemo(
    () => ({ ...params.order, orderStatus: params.orderStatus ?? params.order?.orderStatus }),
    [params.order, params.orderStatus]
  )

  return (
    <TicketPreview
      navigation={props.navigation}
      order={order}
      printerSettings={params.printerSettings}
      shouldPrintOnMount={!!params.shouldPrintOnMount}
    />
  )
}

export default TicketPage
