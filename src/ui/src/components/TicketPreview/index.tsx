import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import Canvas from 'react-native-canvas'

import { BackButton, Container, TitleGroups } from './styles'
import { useLanguage, useToast, ToastType } from '@components'
import { OButton, OIcon, OText } from '@ui'
import { usePrinterCommands } from './usePrinterCommands'
import { PrinterUtilities } from './utils'
import { getPrintRunFeedback } from './getPrintRunFeedback'
import { resolvePaperWidth } from '../PrinterEdition/paperWidth'

export const TicketPreview = (props: any) => {
  const {
    order,
    navigation,
    printerSettings,
    shouldPrintOnMount
  } = props

  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme = useTheme()
  const { textProps } = PrinterUtilities()

  const { printButton, generateCommands, createBitmapFromText } = usePrinterCommands()

  const [ticketState, setTicketState] = useState({ loading: true, image: '' })

  const canvas: any = useRef(null)
  const canvas2: any = useRef(null)
  const ctx: any = useRef(null)
  const ctx2: any = useRef(null)
  const loading: any = useRef(false)

  const styles = StyleSheet.create({
    addButtonText: {
      color: theme.colors.inputTextColor,
      fontSize: 16,
    },
    addButton: {
      height: 40,
      marginTop: 10,
      borderRadius: 8,
      marginRight: 10,
      marginBottom: 10,
    },
  })

  const goToBack = () => navigation?.canGoBack() && navigation.goBack()

  const handlePrint = async () => {
    const printers = Array.isArray(printerSettings) ? printerSettings : []
    const results = []
    for (const printer of printers) {
      const driver = printer?.driver === 'epson' ? 'epson' : 'star'
      const useTextCommands = printer?.printMode === 'append' || driver === 'epson'
      const paperWidth = resolvePaperWidth(printer?.paperWidthMm)
      const commandsText = generateCommands(order, paperWidth.ticketWidthToShow)
      const image = useTextCommands
        ? null
        : await createBitmapFromText(
          commandsText,
          canvas2,
          ctx2,
          paperWidth.fontSizeToPrint,
          paperWidth.ticketWidth
        )

      const ok = await printButton({
        portName: printer?.portName,
        type: printer?.type,
        driver,
        deviceName: printer?.model,
        ip: printer?.ip || printer?.portName,
        image,
        commandsText: useTextCommands ? commandsText : null,
        ticketWidth: paperWidth.ticketWidth,
        showAlert: false
      })
      results.push(ok)
    }

    if (getPrintRunFeedback(results).showSuccessToast) {
      showToast(ToastType.Info, t('ORDER_PRINTED_SUCCESS', 'Order printed'), 3000)
    }
  }

  useEffect(() => {
    if (canvas.current) {
      ctx.current = canvas.current.getContext('2d')
    }
  }, [canvas?.current])

  useEffect(() => {
    if (canvas2.current) {
      ctx2.current = canvas2.current.getContext('2d')
    }
  }, [canvas2?.current])

  useEffect(() => {
    if (
      order &&
      canvas.current &&
      canvas2.current &&
      ctx.current &&
      ctx2.current &&
      !loading.current &&
      !ticketState.image
    ) {
      const setState = async () => {
        loading.current = true
        const image = await createBitmapFromText(generateCommands(order, textProps.ticketWidthToShow), canvas, ctx)
        setTicketState({ image, loading: false })
        if (shouldPrintOnMount) {
          await handlePrint()
        }
        loading.current = false
      }
      setState()
    }
  }, [order, canvas.current, ctx.current, loading.current])

  return (
    <Container>
      <TitleGroups>
        <BackButton onPress={() => goToBack()}>
          <OIcon src={theme.images.general.arrow_left} color={theme.colors.textGray} />
        </BackButton>
      </TitleGroups>
      <OText size={24} style={{ paddingTop: 0, marginBottom: 20 }}>
        {t('TICKET_PREVIEW', 'Ticket Preview')}
      </OText>
      {!ticketState.loading && (
        <OButton
          text={t('PRINT_TICKET', 'Print ticket')}
          imgRightSrc={null}
          textStyle={styles.addButtonText}
          style={styles.addButton}
          bgColor={theme.colors.primary}
          borderColor={theme.colors.primary}
          onClick={() => handlePrint()}
        />
      )}
      <View style={{ height: generateCommands(order).split('\n').length * textProps.fontSize * 1.5 }}>
        {ticketState.loading && <ActivityIndicator size="large" />}
        <Canvas ref={canvas} />
        <Canvas ref={canvas2} style={{ opacity: 0 }} />
      </View>
    </Container>
  )
}
