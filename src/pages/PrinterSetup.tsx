import React from 'react'
import { useTheme } from 'styled-components/native'
import {
  Container,
  PrinterSettings
} from '@ui'

interface Props {
  navigation: any;
  route: any;
}

const PrinterSetup = (props: Props) => {
  const theme = useTheme()
  const printerProps = {
    ...props
  }

  return (
    <Container
      noPadding
      style={{ flexGrow: 1, backgroundColor: theme.colors.white }}
    >
      <PrinterSettings {...printerProps} />
    </Container>
  )
}

export default PrinterSetup
