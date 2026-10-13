import React from 'react'
import { useTheme } from 'styled-components/native'
import { Container, PrinterEdition } from '@ui'

interface Props {
  navigation: any
  route: any
}

const PrinterConfigure = (props: Props) => {
  const theme = useTheme()
  const printer = props.route?.params?.printer ?? null

  return (
    <Container
      noPadding
      style={{ flexGrow: 1, backgroundColor: theme.colors.white }}
    >
      <PrinterEdition
        navigation={props.navigation}
        printer={printer}
        onClose={() => props.navigation?.canGoBack?.() && props.navigation.goBack()}
      />
    </Container>
  )
}

export default PrinterConfigure
