import React from 'react'
import { PrinterEdition } from '@ui'

interface Props {
  navigation: any
  route: any
}

/** The add / edit printer wizard. Params: `{ printer?: SavedPrinter & { index?: number } }`: with it, Edit. */
const PrinterConfigure = (props: Props) => {
  const printer = props.route?.params?.printer ?? null

  return (
    <PrinterEdition
      navigation={props.navigation}
      printer={printer}
      onClose={() => props.navigation?.canGoBack?.() && props.navigation.goBack()}
    />
  )
}

export default PrinterConfigure
