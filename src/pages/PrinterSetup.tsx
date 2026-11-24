import React from 'react'
import { PrinterSettings } from '@ui'

interface Props {
  navigation: any
  route: any
}

/** The printers list (route `Printers`). It lays out its own screen. */
const PrinterSetup = (props: Props) => <PrinterSettings {...props} />

export default PrinterSetup
