import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeGutter, themeSpace, themeVisible } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'
import {
  printerKey, removePrinter, setAutoPrint, usePrinting, type SavedPrinter
} from '../../../../printing'
import { SafeAreaContainerLayout } from '../../layouts/SafeAreaContainer'
import {
  Icon, OButton, OCard, ONavbar, OListRow, OSpinner, OSwitch, OText, PaneLayout, ScreenContainer, useConfirm
} from '../shared'
import { NotFoundSource } from '../NotFoundSource'
import { PrinterCard } from './PrinterCard'
import { PrinterEdition } from '../PrinterEdition'

/**
 * The printers: the switch that prints an order when it is accepted, one card per saved printer (its last result,
 * a test ticket, edit, remove), and the row of the ticket's options (only when a generic printer exists: the
 * options apply to those). With no printer, the empty state. On a landscape tablet the list has the add / edit
 * wizard beside it.
 */
export const PrinterSettings = (props: any) => {
  const { navigation } = props
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const layout = useLayout()
  const confirm = useConfirm()
  const printing = usePrinting()
  const { printers, loaded, autoPrint, resultOf, hasGenericPrinter } = printing

  const [testing, setTesting] = useState<string | null>(null)
  // The tablet's detail pane: the wizard for a new printer (`'new'`) or for the printer at an index.
  const [pane, setPane] = useState<null | 'new' | number>(null)

  const split = layout.landscapeTablet
  const noPrinters = loaded && printers.length === 0
  const wizardOpen = split && (pane !== null || noPrinters)

  const styles = useMemo(() => StyleSheet.create({
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'xl'), gap: themeSpace(theme, 'md') },
    autoRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    autoTexts: { flex: 1 },
    waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fill: { flex: 1 }
  }), [theme])

  const goBack = () => navigation?.canGoBack?.() && navigation.goBack()
  const open = (printer?: SavedPrinter, index?: number) => {
    if (split) setPane(printer === undefined ? 'new' : (index as number))
    else navigation?.navigate?.('PrinterConfigure', { printer: printer ? { ...printer, index } : null })
  }
  const closePane = () => setPane(null)

  const test = async (printer: SavedPrinter) => {
    const key = printerKey(printer)
    setTesting(key)
    try {
      await printing.testPrint(printer)
    } finally {
      setTesting((current) => (current === key ? null : current))
    }
  }

  const remove = (printer: SavedPrinter, index: number) => confirm({
    // Titled by the action (not the app's name); the printer is named in the message.
    title: t('REMOVE_PRINTER', 'Remove printer'),
    message: t('PRINTER_REMOVE_CONSEQUENCE', '_name_ will no longer receive tickets from this device.').replace('_name_', printer.nickname || printer.model),
    // The accept button shares its row with Cancel in the dialog's narrow box: the title says what is removed, the button one word.
    acceptText: t('REMOVE', 'Remove'),
    destructive: true,
    onAccept: async () => {
      await removePrinter(printer, index)
      if (pane === index) closePane()
    }
  })

  const emptyState = (
    <NotFoundSource
      fill
      icon='print-outline'
      content={t('NO_PRINTERS_YET', 'No printers yet')}
      text={t('NO_PRINTERS_YET_HINT', 'Add one to print a ticket as soon as you accept an order.')}
      // Beside the wizard (two panes) the wizard is the way to add one: a button would open what is already open.
      btnTitle={split ? undefined : t('ADD_PRINTER', 'Add printer')}
      onClickButton={split ? undefined : () => open()}
      actionTestID='printers-add-empty'
      footnote={themeVisible(theme, 'ticket.pdf') ? t('PRINTERS_EMPTY_PDF_HINT', 'Without a printer you can still share any ticket as a PDF.') : undefined}
      testID='printers-empty'
    />
  )

  const list = (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <OCard testID='printers-auto-print'>
        <View style={styles.autoRow}>
          <View style={styles.autoTexts}>
            <OText preset='label'>{t('PRINT_ON_ACCEPT', 'Print when I accept an order')}</OText>
            <OText preset='body_sm' color='text_muted'>{t('AUTO_PRINT_HINT', 'One ticket on every printer that is ready')}</OText>
          </View>
          <OSwitch
            testID='printers-auto-print-switch'
            value={autoPrint}
            onChange={(on) => { setAutoPrint(on) }}
            accessibilityLabel={t('PRINT_ON_ACCEPT', 'Print when I accept an order')}
          />
        </View>
      </OCard>
      {printers.map((printer, index) => (
        <PrinterCard
          key={`${printerKey(printer)}:${index}`}
          testID={`printer-${index}`}
          printer={printer}
          result={resultOf(printer)}
          testing={testing === printerKey(printer)}
          selected={split && pane === index}
          onTest={() => test(printer)}
          onEdit={() => open(printer, index)}
          onDelete={() => remove(printer, index)}
        />
      ))}
      {hasGenericPrinter && (
        <OListRow
          testID='print-settings-button'
          icon='list-outline'
          title={t('TICKET', 'Ticket')}
          subtitle={t('TICKET_SETTINGS_HINT', 'What the ticket prints')}
          onPress={() => navigation?.navigate?.('PrintTicketSettings')}
        />
      )}
    </ScrollView>
  )

  const bar = (
    <ONavbar
      title={t('PRINTERS', 'Printers')}
      onBack={goBack}
      rightButtons
      right={printers.length > 0
        ? (
          <OButton
            iconOnly
            testID='printers-add'
            appearance='ghost'
            color='neutral'
            icon={<Icon name='add' size='lg' />}
            accessibilityLabel={t('ADD_PRINTER', 'Add printer')}
            onClick={() => open()}
          />
        )
        : undefined}
    />
  )

  const body = !loaded
    ? <View style={styles.waiting}><OSpinner size='lg' /></View>
    : noPrinters ? emptyState : list

  const detail = wizardOpen
    ? (
      <PrinterEdition
        key={String(pane)}
        embedded
        printer={typeof pane === 'number' ? { ...printers[pane], index: pane } : null}
        // With no printer the wizard is the pane's only content: it has nothing to close back to (no close button).
        onClose={noPrinters && pane === null ? undefined : closePane}
      />
    )
    : (
      <NotFoundSource fill icon='print-outline' text={t('PRINTERS_PANE_HINT', 'Choose a printer to edit it, or add a new one.')} testID='printers-detail-hint' />
    )

  return (
    <SafeAreaContainerLayout>
      {split
        ? (
          <PaneLayout
            testID='printers-panes'
            list={<View style={styles.fill}>{bar}{body}</View>}
            detail={detail}
          />
        )
        : <ScreenContainer testID='printers-screen'>{bar}{body}</ScreenContainer>}
      {printing.host}
    </SafeAreaContainerLayout>
  )
}

export default PrinterSettings
