import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { nativeTextStyle, themeColor, themeSpace } from '@/theme/helpers'
import { printerSummary, type LastResult, type SavedPrinter } from '../../../../printing'
import { useFormats } from '@/hooks/useFormats'
import { Icon, IconTile, OBadge, OButton, OCard, OText } from '../shared'

const NBSP = '\u00A0'

/**
 * The summary's separators never start a line ("Generic ESC/POS · Bluetooth · 80 mm" breaks after a dot, as the Stores card's
 * "Open · closes 11:59 PM" does): each dot is bound to the word before it, and a paper width to its unit.
 */
export const keepSummaryTogether = (summary: string): string =>
  summary.replace(/ · /g, `${NBSP}· `).replace(/(\d) mm\b/g, `$1${NBSP}mm`)

interface Props {
  printer: SavedPrinter
  result?: LastResult
  /** A test ticket is on its way. */
  testing?: boolean
  /** The card is the one the tablet's detail pane shows. */
  selected?: boolean
  onTest: () => void
  onEdit: () => void
  onDelete: () => void
  testID?: string
}

/**
 * One saved printer (`components.item_card`): its name, what it is and how it is connected, the state of its last
 * ticket (the stored result: no polling), and the buttons that check or change it. A printer that failed shows
 * when and why, and its check button says "Reconnect" (it prints a short test ticket, the one honest check).
 */
export const PrinterCard = ({ printer, result, testing, selected, onTest, onEdit, onDelete, testID }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const { time } = useFormats()
  const card = theme.native.components.item_card
  const tile = card.slots.device_tile
  const status = card.slots.status
  const failed = result?.ok === false
  const styles = useMemo(() => StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
    texts: { flex: 1 },
    name: { ...nativeTextStyle(card.base.title), color: card.base.title_color },
    summary: { ...nativeTextStyle(card.base.subtitle), color: card.base.subtitle_color },
    failure: { ...nativeTextStyle(card.base.subtitle), color: card.base.failure_color },
    note: { ...nativeTextStyle(card.base.subtitle), color: card.base.subtitle_color },
    actions: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    grow: { flex: 1 }
  }), [theme, card])

  const when = result ? time(result.at) : ''
  const name = printer.nickname || printer.model
  const action = card.slots.action
  const secondary = card.slots.action_secondary

  return (
    <OCard look={card.base} testID={testID} style={selected ? { borderColor: themeColor(theme, 'primary') } : undefined}>
      <View style={styles.head}>
        <IconTile icon='print-outline' size={tile.size} variant={tile.variant} />
        <View style={styles.texts}>
          <OText style={styles.name} numberOfLines={1}>{name}</OText>
          <OText style={styles.summary} numberOfLines={2}>{keepSummaryTogether(printerSummary(printer, t))}</OText>
        </View>
        {result?.ok === true && (
          <OBadge variant='success_soft' size={status.size} testID={`${testID}-status`}>{t('PRINTER_READY', 'Ready')}</OBadge>
        )}
        {failed && (
          <OBadge variant='danger_soft' size={status.size} testID={`${testID}-status`}>{t('PRINTER_STATUS_OFFLINE', 'Offline')}</OBadge>
        )}
        {!result && (
          <OBadge variant='neutral' size={status.size} testID={`${testID}-status`}>{t('PRINTER_STATUS_UNKNOWN', 'Not tested yet')}</OBadge>
        )}
      </View>
      {failed && (
        <View>
          <OText style={styles.failure} testID={`${testID}-failure`}>
            {t('PRINTER_LAST_FAILED', 'The last ticket failed at _time_.').replace('_time_', when)}
          </OText>
          {!!result?.message && <OText style={styles.note} numberOfLines={3}>{result.message}</OText>}
        </View>
      )}
      {result?.ok === true && result.test && (
        <OText style={styles.note}>{t('TEST_TICKET_SENT', 'Test ticket sent at _time_.').replace('_time_', when)}</OText>
      )}
      <View style={styles.actions}>
        <OButton
          style={styles.grow}
          testID={`${testID}-test`}
          text={failed ? t('RECONNECT', 'Reconnect') : t('TEST_PRINT', 'Test print')}
          size={action.size}
          appearance={action.appearance}
          color={action.color}
          loading={testing}
          onClick={onTest}
        />
        <OButton
          style={styles.grow}
          testID={`${testID}-edit`}
          text={t('EDIT', 'Edit')}
          size={secondary.size}
          appearance={secondary.appearance}
          color={secondary.color}
          onClick={onEdit}
        />
        <OButton
          iconOnly
          testID={`${testID}-delete`}
          size={secondary.size}
          appearance='ghost'
          color='danger'
          icon={<Icon name='trash-outline' color='danger_text' />}
          accessibilityLabel={t('REMOVE_PRINTER', 'Remove printer')}
          onClick={onDelete}
        />
      </View>
    </OCard>
  )
}

export default PrinterCard
