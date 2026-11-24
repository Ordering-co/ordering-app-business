import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeGutter, themeSpace, themeVisible } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'
import { printerKey, ticketColumns, usePrinting, type PrintOutcome, type SavedPrinter } from '../../../../printing'
import { SafeAreaContainerLayout } from '../../layouts/SafeAreaContainer'
import { NotFoundSource } from '../NotFoundSource'
import { useOrderNumberText } from '../OrderDetails/useOrderNumberText'
import { FilterChip, OBottomBar, OButton, ONavbar, ONotice, OStepper, OText, PaneLayout, ScreenContainer } from '../shared'
import { TicketPaper } from './TicketPaper'

interface Props {
  navigation?: any
  /** The order, with its status text as `orderStatus` when the caller has it. */
  order: any
  /** Only these printers are offered (the accept flow's); without them, every saved printer. */
  printerSettings?: unknown
  /** Print as soon as the ticket is on screen (the accept flow's). */
  shouldPrintOnMount?: boolean
}

/**
 * The ticket before it is printed: the printers it will go to (chips, all selected), the ticket as the first of them
 * prints it (its brand's text at its paper's width), the copies, and the ways out: print, share a PDF, or the
 * system's print dialog. It opens with no printer saved (PDF and system print only). A failed print says why and offers
 * to try the printers that failed again; a print that does not answer ends in an error (the facade's timeout).
 */
export const TicketPreview = (props: Props) => {
  const { navigation, order, printerSettings, shouldPrintOnMount } = props
  const [, t] = useLanguage()
  const numberText = useOrderNumberText()
  const theme: any = useTheme()
  const layout = useLayout()
  const printing = usePrinting()

  const candidates: SavedPrinter[] = useMemo(
    () => Array.isArray(printerSettings) && printerSettings.length ? printerSettings as SavedPrinter[] : printing.printers,
    [printerSettings, printing.printers]
  )
  const [selected, setSelected] = useState<string[] | null>(null)
  const [copies, setCopies] = useState<number | null>(null)
  const [busy, setBusy] = useState<'print' | 'pdf' | 'system' | null>(null)
  const [outcomes, setOutcomes] = useState<PrintOutcome[] | null>(null)
  const [documentError, setDocumentError] = useState(false)
  const alive = useRef(true)
  const auto = useRef(false)
  useEffect(() => () => { alive.current = false }, [])

  useEffect(() => {
    if (!printing.loaded || selected !== null) return
    setSelected(candidates.map(printerKey))
    setCopies(printing.copies)
  }, [printing.loaded, selected, candidates, printing.copies])

  // A Star TSP100's ticket is a picture drawn on a canvas (a web view): bring it up while the ticket is read, not at the tap.
  const { warm } = printing
  useEffect(() => { warm(candidates) }, [candidates, warm])

  const chosen = candidates.filter((printer) => selected?.includes(printerKey(printer)))
  // The paper shows the ticket of the first printer it goes to (or of the first one there is).
  const paperPrinter = chosen[0] ?? candidates[0]
  const hasPrinters = candidates.length > 0
  const text = useMemo(
    () => printing.ticketText(order, { printer: paperPrinter }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, paperPrinter, printing.options, printing.loaded]
  )

  const styles = useMemo(() => StyleSheet.create({
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'xl'), gap: themeSpace(theme, 'md') },
    chips: { flexDirection: 'row', gap: themeSpace(theme, 'sm'), paddingHorizontal: themeGutter(theme) },
    // A horizontal scroll view shrinks by default: beside the page's scroll it was squeezed to half a chip.
    chipsScroll: { flexGrow: 0, flexShrink: 0 },
    // On the phone the chips are the page's first block and scroll with it; the gutter is the page's, so they bleed to it.
    chipsBleed: { marginHorizontal: -themeGutter(theme) },
    copies: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeSpace(theme, 'xxxl') },
    copiesLabel: { flex: 1 },
    fill: { flex: 1 },
    link: { alignSelf: 'flex-start' },
    paperPane: { paddingHorizontal: themeGutter(theme), paddingTop: themeSpace(theme, 'sm'), paddingBottom: themeSpace(theme, 'xl') },
    failures: { gap: themeSpace(theme, 'xxs') }
  }), [theme])

  const goBack = () => navigation?.canGoBack?.() && navigation.goBack()
  const nameOf = (printer: SavedPrinter) => printer.nickname || printer.model

  const run = async (targets: SavedPrinter[]) => {
    if (busy || !targets.length) return
    setBusy('print')
    setOutcomes(null)
    setDocumentError(false)
    try {
      const result = await printing.print({ order, printers: targets, copies: copies ?? 1 })
      if (alive.current) setOutcomes(result)
    } finally {
      if (alive.current) setBusy(null)
    }
  }

  // The accept flow opens the ticket to print it at once.
  useEffect(() => {
    if (!shouldPrintOnMount || auto.current || selected === null || !chosen.length) return
    auto.current = true
    run(chosen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPrintOnMount, selected])

  const openDocument = async (kind: 'pdf' | 'system') => {
    if (busy) return
    setBusy(kind)
    setDocumentError(false)
    try {
      const result = kind === 'pdf'
        ? await printing.exportPdf(order, { printer: paperPrinter })
        : await printing.systemPrint(order, { printer: paperPrinter })
      if (alive.current && !result.ok) setDocumentError(true)
    } finally {
      if (alive.current) setBusy(null)
    }
  }

  const toggle = (printer: SavedPrinter) => {
    const key = printerKey(printer)
    setSelected((current) => (current ?? []).includes(key) ? (current ?? []).filter((item) => item !== key) : [...(current ?? []), key])
  }

  const failed = (outcomes ?? []).filter((outcome) => !outcome.ok)

  const printText = chosen.length === 1
    ? t('PRINT_ON_PRINTER', 'Print on _printer_').replace('_printer_', nameOf(chosen[0]))
    : chosen.length > 1
      ? t('PRINT_ON_N_PRINTERS', 'Print on _count_ printers').replace('_count_', String(chosen.length))
      : t('PRINT_TICKET', 'Print ticket')

  const pdfAllowed = themeVisible(theme, 'ticket.pdf')
  const actions = [
    ...(pdfAllowed
      ? [{ key: 'pdf', slot: 'secondary' as const, testID: 'ticket-share-pdf', text: t('SHARE_PDF', 'Share PDF'), loading: busy === 'pdf', disabled: !!busy && busy !== 'pdf', onClick: () => openDocument('pdf') }]
      : []),
    hasPrinters
      ? { key: 'print', testID: 'ticket-print', text: printText, loading: busy === 'print', disabled: !chosen.length || (!!busy && busy !== 'print'), onClick: () => run(chosen) }
      // No printer: the bar keeps the mockup's two buttons (Share PDF, Print); the long sentence wrapped in a 50 high button.
      : { key: 'system', testID: 'ticket-system-print', text: t('PRINT', 'Print'), accessibilityLabel: t('PRINT_WITH_SYSTEM_PRINTER', 'Print with the system printer'), loading: busy === 'system', disabled: !!busy && busy !== 'system', onClick: () => openDocument('system') }
  ]

  const chips = (bleed: boolean) => hasPrinters && (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsScroll, bleed && styles.chipsBleed]} contentContainerStyle={styles.chips} testID='ticket-printers'>
      {candidates.map((printer, index) => {
        const result = printing.resultOf(printer)
        const offline = result?.ok === false
        return (
          <FilterChip
            key={`${printerKey(printer)}:${index}`}
            testID={`ticket-chip-${index}`}
            text={offline ? t('PRINTER_CHIP_OFFLINE', '_name_ · offline').replace('_name_', nameOf(printer)) : nameOf(printer)}
            dot={result?.ok === true ? 'success' : offline ? 'danger' : 'border_strong'}
            selected={!!selected?.includes(printerKey(printer))}
            onPress={() => toggle(printer)}
          />
        )
      })}
    </ScrollView>
  )

  const copiesRow = copies !== null && hasPrinters && (
    <View style={styles.copies}>
      <OText preset='label' style={styles.copiesLabel}>{t('COPIES', 'Copies')}</OText>
      <OStepper testID='ticket-copies' value={copies} min={1} max={9} onChange={setCopies} />
    </View>
  )

  const notices = (
    <>
      {outcomes && failed.length === 0 && outcomes.length > 0 && (
        <ONotice variant='success' testID='ticket-printed'>{t('ORDER_PRINTED_SUCCESS', 'Order printed')}</ONotice>
      )}
      {failed.length > 0 && (
        <ONotice
          variant='danger'
          testID='ticket-failed'
          title={t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed')}
          action={{ text: t('RETRY', 'Retry'), testID: 'ticket-retry', onPress: () => run(failed.map((outcome) => outcome.printer)) }}
        >
          <View style={styles.failures}>
            {failed.map((outcome) => (
              <OText key={outcome.key} preset='body_sm'>{`${nameOf(outcome.printer)}: ${outcome.message ?? ''}`}</OText>
            ))}
          </View>
        </ONotice>
      )}
      {documentError && (
        <ONotice variant='danger' testID='ticket-document-failed'>
          {t('PRINT_FAILED', 'Could not open the print dialog. Please try again.')}
        </ONotice>
      )}
    </>
  )

  const systemLink = hasPrinters && (
    <OButton
      testID='ticket-system-print'
      style={styles.link}
      appearance='ghost'
      text={t('PRINT_WITH_SYSTEM_PRINTER', 'Print with the system printer')}
      loading={busy === 'system'}
      disabled={!!busy && busy !== 'system'}
      onClick={() => openDocument('system')}
    />
  )

  const paper = (
    <TicketPaper testID='ticket-paper' text={text} columns={ticketColumns(paperPrinter)} />
  )

  const bar = (
    <ONavbar
      title={t('PRINT_TICKET', 'Print ticket')}
      subtitle={order?.id !== undefined ? numberText(order) : undefined}
      onBack={goBack}
    />
  )

  const actionBar = <OBottomBar testID='ticket-actions' actions={actions} />

  if (layout.landscapeTablet) {
    return (
      <SafeAreaContainerLayout>
        <PaneLayout
          testID='ticket-panes'
          list={(
            <View style={styles.fill}>
              {bar}
              {chips(false)}
              {/* The copies and the printers are for a saved printer: without one the pane says so instead of standing empty. */}
              {!hasPrinters && !outcomes && !documentError && (
                <NotFoundSource
                  fill
                  icon='print-outline'
                  content={t('NO_PRINTERS_YET', 'No printers yet')}
                  text={t('TICKET_NO_PRINTERS_HINT', 'Share the ticket as a PDF or print it with the system printer. Add a printer in Profile to print here.')}
                  testID='ticket-no-printers'
                />
              )}
              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {copiesRow}{systemLink}{notices}
              </ScrollView>
              {actionBar}
            </View>
          )}
          detail={<ScrollView contentContainerStyle={styles.paperPane}>{paper}</ScrollView>}
        />
        {printing.host}
      </SafeAreaContainerLayout>
    )
  }

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer testID='ticket-preview'>
        {bar}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {chips(true)}{paper}{copiesRow}{systemLink}{notices}
        </ScrollView>
        {actionBar}
      </ScreenContainer>
      {printing.host}
    </SafeAreaContainerLayout>
  )
}

export default TicketPreview
