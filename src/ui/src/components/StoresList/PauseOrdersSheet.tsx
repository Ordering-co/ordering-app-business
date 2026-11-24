import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { themeSpace } from '@/theme/helpers'
import OBottomPopup, { SheetFooter } from '../shared/OBottomPopup'
import ChoiceRow from '../shared/ChoiceRow'
import OText from '../shared/OText'
import OButton from '../shared/OButton'
import { getPauseOptions, type PauseKind, type PauseOption, type PauseOptionKey } from './pauseOptions'
import { useWhen } from './useWhen'
import { storeZoneNote } from './zonedTime'

/** A store the sheet can pause (a business of the API with its schedule and time zone). */
export interface PauseTarget {
  id: number | string
  name?: string
  timezone?: string | null
  schedule?: any
}

interface Props {
  open: boolean
  onClose: () => void
  /**
   * What the sheet pauses: one store (its name is in the title), or several (a choice of store comes first). For
   * `kind='product'` the one target is the product's store: its schedule gives the "tomorrow's opening" row.
   */
  targets: PauseTarget[]
  kind?: PauseKind
  /** The title's name: the store's, or the product's. */
  name?: string
  /** What the main button does with the chosen duration (and the store, when there was a choice). */
  onConfirm: (option: PauseOption, target: PauseTarget) => void
  /** The request is going: the button spins and nothing can be changed. */
  loading?: boolean
  testID?: string
}

const OPTION_TITLES: Record<PauseOptionKey, [string, string]> = {
  minutes_15: ['PAUSE_15_MINUTES', '15 minutes'],
  minutes_30: ['PAUSE_30_MINUTES', '30 minutes'],
  hour_1: ['PAUSE_1_HOUR', '1 hour'],
  hours_2: ['PAUSE_2_HOURS', '2 hours'],
  rest_of_day: ['PAUSE_REST_OF_TODAY', 'Rest of today'],
  until_resumed: ['PAUSE_UNTIL_TURNED_ON', 'Until I turn it back on'],
}

/**
 * The pause sheet (`SheetPause`): how long orders stop. The same sheet pauses a product's availability
 * (`kind='product'`). It only chooses; the screen sends the choice (`onConfirm`) through the controller that owns the
 * update, and closes the sheet when the answer comes.
 */
export const PauseOrdersSheet = ({ open, onClose, targets, kind = 'store', name, onConfirm, loading, testID }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const when = useWhen()
  const [targetId, setTargetId] = useState<string>(String(targets[0]?.id ?? ''))
  const [optionKey, setOptionKey] = useState<PauseOptionKey>('minutes_30')

  // Each opening starts from the first store and 30 minutes.
  useEffect(() => {
    if (!open) return
    setTargetId(String(targets[0]?.id ?? ''))
    setOptionKey('minutes_30')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const target = targets.find((item) => String(item.id) === targetId) ?? targets[0]
  const now = useMemo(() => new Date(), [open, target?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const options = useMemo(() => getPauseOptions(target, kind, now), [target, kind, now])
  const chosen = options.find((option) => option.key === optionKey) ?? options[0]

  const styles = useMemo(() => {
    return StyleSheet.create({
      hint: { marginBottom: themeSpace(theme, 'md') },
      group: { marginBottom: themeSpace(theme, 'md') },
      grow: { flex: 1 },
    })
  }, [theme])

  const subtitleOf = (option: PauseOption) => {
    if (option.key === 'until_resumed') return undefined
    if (!option.until) return undefined
    const text = when(option.until, target?.timezone, now)
    return option.key === 'rest_of_day'
      ? t('PAUSE_REOPENS_AT', 'Reopens _when_').replace('_when_', text)
      : t('PAUSE_UNTIL_TIME', 'Until _when_').replace('_when_', text)
  }

  const title = kind === 'store'
    ? (name ? t('PAUSE_ORDERS_STORE', 'Pause orders · _name_').replace('_name_', name) : t('PAUSE_ORDERS', 'Pause orders'))
    : t('PRODUCT_UNAVAILABLE_TITLE', 'Unavailable · _name_').replace('_name_', name ?? '')
  const hint = kind === 'store'
    ? t('PAUSE_ORDERS_HINT', 'Customers see the store as temporarily closed. Orders you already accepted are not affected.')
    : t('PAUSE_PRODUCT_HINT', 'Customers do not see this product until it is back.')
  // The times are the store's own clock: said so when it is not the device's.
  const zone = storeZoneNote(target?.timezone, now)
  const confirmText = kind === 'store' ? t('PAUSE_ORDERS', 'Pause orders') : t('PAUSE_PRODUCT', 'Make unavailable')

  return (
    <OBottomPopup open={open} onClose={onClose} title={title} closeIcon padded testID={testID}>
      <OText color='text_muted' style={styles.hint}>{hint}</OText>
      {!!zone && (
        <OText preset='body_sm' color='text_muted' style={styles.hint} testID='pause-zone-note'>
          {t('STORE_TIME_ZONE_NOTE', 'Times are in the store\'s time zone (_zone_).').replace('_zone_', zone)}
        </OText>
      )}

      {targets.length > 1 && (
        <View style={styles.group} accessibilityRole='radiogroup' accessibilityLabel={t('STORE', 'Store')}>
          {targets.map((item, index) => (
            <ChoiceRow
              key={String(item.id)}
              selected={String(item.id) === String(target?.id)}
              onPress={() => setTargetId(String(item.id))}
              last={index === targets.length - 1}
              testID={`pause-store-${item.id}`}
            >
              <OText preset='label' style={styles.grow} numberOfLines={1}>{item.name}</OText>
            </ChoiceRow>
          ))}
        </View>
      )}

      <View accessibilityRole='radiogroup' accessibilityLabel={t('PAUSE_DURATION', 'Pause duration')}>
        {options.map((option, index) => {
          const [key, fallback] = OPTION_TITLES[option.key]
          const subtitle = subtitleOf(option)
          return (
            <ChoiceRow
              key={option.key}
              selected={option.key === chosen?.key}
              onPress={() => setOptionKey(option.key)}
              last={index === options.length - 1}
              testID={`pause-option-${option.key}`}
            >
              <View style={styles.grow}>
                <OText preset='label'>{t(key, fallback)}</OText>
                {!!subtitle && <OText preset='body_sm' color='text_muted'>{subtitle}</OText>}
              </View>
            </ChoiceRow>
          )
        })}
      </View>
      <SheetFooter>
        <OButton
          text={confirmText}
          size='lg'
          loading={loading}
          disabled={loading || !chosen || !target}
          onClick={() => chosen && target && onConfirm(chosen, target)}
          testID='pause-confirm'
        />
      </SheetFooter>
    </OBottomPopup>
  )
}

export default PauseOrdersSheet
