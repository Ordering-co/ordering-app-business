import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeGutter, themeSpace } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'
import {
  SAMPLE_ORDER, getTicketPrintOptionGroups, setCopies, setTicketOptions, ticketColumns, usePrinting,
  type TicketPrintOptionKey, type TicketPrintOptions
} from '../../../../printing'
import { SafeAreaContainerLayout } from '../../layouts/SafeAreaContainer'
import { Icon, OListRow, ONavbar, OStepper, OSwitch, OText, PaneLayout, ScreenContainer, SectionTitle } from '../shared'
import { TicketPaper } from '../TicketPreview/TicketPaper'

/** How many lines of the sample ticket the phone's paper shows over the rows (a tablet shows it all beside them). */
const PREVIEW_LINES = 14

/** How many lines of context the phone's paper keeps above the first line a switch changed. */
const CONTEXT_LINES = 3

/** The sign that the paper goes on above or below what is shown. */
const MORE = '...'

/** The index of the first line where two tickets differ (the shorter one's length when one is the start of the other). */
const firstChange = (before: string, after: string): number => {
  const a = before.split('\n')
  const b = after.split('\n')
  const limit = Math.min(a.length, b.length)
  let at = 0
  while (at < limit && a[at] === b[at]) at++
  return at
}

/** The window of the ticket the phone's paper shows: `size` lines from `start`, the cut ends marked. */
const ticketWindow = (text: string, focus: number, size: number): string => {
  const lines = text.split('\n')
  const start = Math.max(0, Math.min(focus - CONTEXT_LINES, lines.length - size))
  const end = Math.min(lines.length, start + size)
  return [...(start > 0 ? [MORE] : []), ...lines.slice(start, end), ...(end < lines.length ? [MORE] : [])].join('\n')
}

/** The six switches of the screen, each one driving the stored options of its group. */
const ROWS: Array<{ id: string, keys: TicketPrintOptionKey[], title: [string, string], hint?: [string, string] }> = [
  { id: 'customer', keys: ['customerSection'], title: ['CUSTOMER_DETAILS', 'Customer details'], hint: ['CUSTOMER_DETAILS_HINT', 'Name, phone, address'] },
  { id: 'business', keys: ['businessSection'], title: ['STORE_DETAILS', 'Store details'], hint: ['STORE_DETAILS_HINT', 'Name, phone, address'] },
  { id: 'note', keys: ['orderComment'], title: ['ORDER_NOTE', 'Order note'] },
  { id: 'products', keys: ['productOptions', 'productComments', 'productIngredients'], title: ['PRODUCT_OPTIONS_AND_NOTES', 'Product options and notes'] },
  { id: 'totals', keys: ['totalsBreakdown'], title: ['TOTALS_BREAKDOWN', 'Totals breakdown'], hint: ['TOTALS_BREAKDOWN_HINT', 'Subtotal, fees, taxes, tip'] },
  { id: 'payments', keys: ['payments'], title: ['PAYMENTS', 'Payments'] }
]

/**
 * What the ticket prints: six switches that drive the 25 stored options, a "Details" list with every option, the copies
 * per order and a live paper that shows the real ticket text with the options as they are. The options apply to
 * generic (ESC/POS) printers only: the Star and Epson tickets do not take them. On a landscape tablet the paper is beside
 * the switches.
 */
export const PrintTicketSettings = (props: any) => {
  const { navigation } = props
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const layout = useLayout()
  const printing = usePrinting()
  const [options, setOptions] = useState<TicketPrintOptions | null>(null)
  const [copies, setCopiesState] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // The first line of the ticket the last switch changed: the phone's short paper shows that part of the ticket.
  const [focus, setFocus] = useState(0)

  useEffect(() => {
    if (printing.loaded && options === null) {
      setOptions(printing.options)
      setCopiesState(printing.copies)
    }
  }, [printing.loaded, printing.options, printing.copies, options])

  const styles = useMemo(() => StyleSheet.create({
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'xl'), gap: themeSpace(theme, 'md') },
    fill: { flex: 1 },
    paperPane: { paddingHorizontal: themeGutter(theme), paddingTop: themeSpace(theme, 'sm'), paddingBottom: themeSpace(theme, 'xl') },
    paperPhone: { paddingHorizontal: themeGutter(theme), paddingTop: themeSpace(theme, 'xs'), paddingBottom: themeSpace(theme, 'sm') },
    copies: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeSpace(theme, 'xxxl') },
    copiesLabel: { flex: 1 },
    group: { gap: themeSpace(theme, 'xs') },
    hints: { gap: themeSpace(theme, 'xs') }
  }), [theme])

  const goBack = () => navigation?.canGoBack?.() && navigation.goBack()

  const changeCopies = (value: number) => {
    setCopiesState(value)
    setCopies(value)
  }

  // The ticket as a generic printer prints it: its saved printer's paper, else 80 mm.
  const previewPrinter = printing.printers.find((printer) => printer.driver === 'generic') ?? { driver: 'generic', paperWidthMm: 80 }
  const text = useMemo(
    () => options ? printing.ticketText(SAMPLE_ORDER, { printer: previewPrinter, options }) : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, printing.ticketText, previewPrinter.paperWidthMm]
  )

  const change = (keys: TicketPrintOptionKey[], on: boolean) => {
    if (!options) return
    const next = { ...options }
    keys.forEach((key) => { next[key] = on })
    setFocus(firstChange(text, printing.ticketText(SAMPLE_ORDER, { printer: previewPrinter, options: next })))
    setOptions(next)
    setTicketOptions(next)
  }

  // A phone shows a short paper (the mockup's) and moves it to what the last switch changed, so every switch is seen working; a tablet shows it all.
  const shownText = layout.landscapeTablet ? text : ticketWindow(text, focus, PREVIEW_LINES)
  const paper = options
    ? <TicketPaper testID='ticket-settings-paper' text={shownText} columns={ticketColumns(previewPrinter)} />
    : null

  const rows = options && (
    <View>
      {ROWS.map(({ id, keys, title, hint }) => (
        <OListRow
          key={id}
          testID={`print-option-${id}`}
          title={t(title[0], title[1])}
          subtitle={hint ? t(hint[0], hint[1]) : undefined}
          last={false}
          trailing={
            <OSwitch
              testID={`print-option-${id}-switch`}
              value={keys.some((key) => options[key])}
              onChange={(on) => change(keys, on)}
              accessibilityLabel={t(title[0], title[1])}
            />
          }
        />
      ))}
      <OListRow
        testID='print-details-toggle'
        title={t('TICKET_DETAILS', 'Details')}
        onPress={() => setDetailsOpen((open) => !open)}
        trailing={<Icon name={detailsOpen ? 'chevron-up' : 'chevron-down'} color='text_muted' />}
        last={!detailsOpen}
      />
      {detailsOpen && getTicketPrintOptionGroups(t).map((group) => {
        const sectionOn = !group.sectionOption || options[group.sectionOption]
        return (
          <View key={group.key} style={styles.group} testID={`print-group-${group.key}`}>
            <SectionTitle>{group.title}</SectionTitle>
            {!!group.sectionOption && (
              <OListRow
                title={group.title}
                trailing={
                  <OSwitch
                    testID={`print-option-${group.sectionOption}`}
                    value={options[group.sectionOption]}
                    onChange={(on) => change([group.sectionOption as TicketPrintOptionKey], on)}
                    accessibilityLabel={group.title}
                  />
                }
              />
            )}
            {sectionOn && group.options.map((option) => (
              <OListRow
                key={option.key}
                title={option.label}
                trailing={
                  <OSwitch
                    testID={`print-option-${option.key}`}
                    value={options[option.key]}
                    onChange={(on) => change([option.key], on)}
                    accessibilityLabel={option.label}
                  />
                }
              />
            ))}
          </View>
        )
      })}
    </View>
  )

  const copiesRow = copies !== null && (
    <View style={styles.copies}>
      <OText preset='label' style={styles.copiesLabel}>{t('COPIES_PER_ORDER', 'Copies per order')}</OText>
      <OStepper testID='ticket-copies' value={copies} min={1} max={9} onChange={changeCopies} />
    </View>
  )

  const hints = (
    <View style={styles.hints}>
      <OText preset='body_sm' color='text_muted'>{t('TICKET_ALWAYS_PRINTS', 'The order number, products and total always print.')}</OText>
      <OText preset='body_sm' color='text_muted'>{t('TICKET_SETTINGS_GENERIC_ONLY', 'These options apply to generic (ESC/POS) printers.')}</OText>
    </View>
  )

  const bar = <ONavbar title={t('TICKET', 'Ticket')} subtitle={t('TICKET_SETTINGS_HINT', 'What the ticket prints')} onBack={goBack} />

  if (layout.landscapeTablet) {
    return (
      <SafeAreaContainerLayout>
        <PaneLayout
          testID='ticket-settings-panes'
          list={(
            <View style={styles.fill}>
              {bar}
              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {rows}{copiesRow}{hints}
              </ScrollView>
            </View>
          )}
          detail={<ScrollView contentContainerStyle={styles.paperPane}>{paper}</ScrollView>}
        />
      </SafeAreaContainerLayout>
    )
  }

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer testID='ticket-settings'>
        {bar}
        <View style={styles.paperPhone}>{paper}</View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {rows}{copiesRow}{hints}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaContainerLayout>
  )
}

export default PrintTicketSettings
