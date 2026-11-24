import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useConfig, useLanguage } from '@components'
import { ChoiceRow, IconTile, OButton, OSpinner, OText } from '../shared'
import { NotFoundSource } from '../NotFoundSource'
import { initialsOf } from '../shared/OAvatar'
import { apiErrorText } from './rules'
import { driverRows, useDrivers, type DriverRow } from './useDrivers'
import { SheetError } from './SheetParts'
import { sheetStyles } from './styles'
import type { ActionRequest } from './types'

interface Props {
  request: ActionRequest
  onFinish: (order?: any) => void
}

/**
 * The assign-driver sheet (SheetDriver): the order's drivers as radio rows (initials, name, "Available · 0.8 km away ·
 * 1 active order"; a driver who is not available is greyed and cannot be chosen), "No driver" to unassign (only when the
 * order has one), and the button that names the choice. It lists what `GET controls/orders/:id` gives (availability,
 * and active orders) and sends `{ driver_id }`. No distance or ETA is drawn: the API gives none. Open it only under `canAssignDriver`.
 */
export const AssignDriverSheet = ({ request, onFinish }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const order = request.order
  const options = request.opts ?? {}
  const styles = useMemo(() => sheetStyles(theme), [theme])
  const { loading, drivers, error: loadError, assign } = useDrivers(order, options.drivers, options.handleAssignDriver)
  const currentId: number | null = order?.driver_id ?? order?.driver?.id ?? null
  // `undefined`: nothing chosen yet (the order's driver stays); `null`: the order is left without a driver.
  const [choice, setChoice] = useState<number | null | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(() => {
    const list = driverRows(drivers, order)
    // The order's own driver is always in the list, even when the answer leaves it out.
    if (currentId && !list.some((row) => row.id === currentId) && order?.driver) {
      list.unshift({ id: currentId, name: [order.driver.name, order.driver.lastname ? `${Array.from(String(order.driver.lastname))[0]}.` : ''].filter(Boolean).join(' '), available: true, activeOrders: 0 })
    }
    return list
  }, [drivers, order, currentId])

  const selected: number | null = choice === undefined ? currentId : choice
  const selectedRow = rows.find((row) => row.id === selected)
  const unchanged = selected === currentId

  const detail = (row: DriverRow) => {
    const parts = [row.available ? t('AVAILABLE', 'Available') : t('NOT_AVAILABLE', 'Not available')]
    if (row.available && row.activeOrders > 0) {
      parts.push(row.activeOrders === 1
        ? t('ONE_ACTIVE_ORDER', '1 active order')
        : t('ACTIVE_ORDERS_COUNT', '_count_ active orders').replace('_count_', String(row.activeOrders)))
    }
    return parts.join(' · ')
  }

  const submit = async () => {
    if (submitting || unchanged) return
    setSubmitting(true)
    setError(null)
    const outcome = await assign(selected)
    setSubmitting(false)
    if (!outcome.ok) {
      setError(apiErrorText(outcome.error, t))
      return
    }
    options.onDone?.(outcome.order)
    onFinish(outcome.order)
  }

  // Nothing to choose: the store has no driver (the controls answer lists the drivers of the store's driver groups) and the order has none.
  const noDrivers = !loading && !loadError && !rows.length && !currentId

  const buttonText = selected === null && currentId
    ? t('UNASSIGN_DRIVER_BUTTON', 'Unassign driver')
    : selectedRow
      ? t('ASSIGN_DRIVER_NAME', 'Assign _name_').replace('_name_', selectedRow.name)
      : t('ASSIGN_DRIVER', 'Assign driver')

  const disc = (name: string, available: boolean) => (
    <View style={[styles.initials, available ? styles.initialsBrand : styles.initialsNeutral]}>
      <OText preset='label' color={available ? 'primary_text' : 'text_muted'}>{initialsOf(name)}</OText>
    </View>
  )

  return (
    <View style={styles.body} testID='order-sheet-assign-driver'>
      {loading ? (
        <View style={styles.loading}><OSpinner testID='drivers-loading' /></View>
      ) : noDrivers ? (
        <NotFoundSource
          icon='bicycle-outline'
          content={t('NO_DRIVERS_FOR_STORE', 'No drivers for this store yet')}
          text={t('NO_DRIVERS_FOR_STORE_HINT', 'Drivers appear here once the store belongs to a driver group.')}
          testID='drivers-empty'
        />
      ) : (
        <View accessibilityRole='radiogroup' accessibilityLabel={t('DRIVER', 'Driver')}>
          {rows.map((row, index) => (
            <ChoiceRow
              key={row.id}
              selected={selected === row.id}
              disabled={!row.available && row.id !== currentId}
              onPress={() => setChoice(row.id)}
              last={index === rows.length - 1 && !currentId}
              testID={`driver-${row.id}`}
              accessibilityLabel={`${row.name}, ${detail(row)}`}
            >
              {disc(row.name, row.available)}
              <View style={styles.rowText}>
                <OText preset='label' color={row.available ? 'text' : 'text_disabled'}>{row.name}</OText>
                <OText preset='body_sm' color={row.available ? 'text_muted' : 'text_disabled'}>{detail(row)}</OText>
              </View>
            </ChoiceRow>
          ))}
          {!!currentId && (
            <ChoiceRow selected={selected === null} onPress={() => setChoice(null)} last testID='driver-none' accessibilityLabel={t('NO_DRIVER', 'No driver')}>
              <IconTile icon='close' variant='neutral' />
              <View style={styles.rowText}>
                <OText preset='label'>{t('NO_DRIVER', 'No driver')}</OText>
                <OText preset='body_sm' color='text_muted'>{t('LEAVE_UNASSIGNED', 'Leave it unassigned')}</OText>
              </View>
            </ChoiceRow>
          )}
        </View>
      )}

      {/* With no driver to choose there is nothing to press. */}
      {!noDrivers && (
        <View style={styles.footer}>
          <SheetError>{error ?? (loadError ? apiErrorText(loadError, t) : null)}</SheetError>
          <OButton
            size='lg'
            text={buttonText}
            loading={submitting}
            disabled={submitting || loading || unchanged}
            onClick={submit}
            testID='order-action'
          />
        </View>
      )}
    </View>
  )
}

export default AssignDriverSheet
