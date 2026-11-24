import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'
import Clipboard from '@react-native-clipboard/clipboard'

import { ToastType, useConfig, useLanguage, useSession, useToast } from '@components'
import { OListRow } from '../shared'
import { themeVisible } from '@/theme/helpers'
import { canAdjustTime, canAssignDriver, canMessageCustomer, customerCallUrl, hasMapCoordinates, orderNumberOf } from './rules'
import { Linking } from 'react-native'
import { HANDOFF_DELAY_MS } from './constants'
import { sheetStyles } from './styles'
import type { ActionRequest, MoreHandlers } from './types'
import { closeRequest, replaceRequest } from './store'

interface Props {
  request: ActionRequest
}

/**
 * The "More actions" sheet (SheetOrderMore): one row per thing the store can do about the order, each only when it
 * applies. The caller passes what only it can do (`onPrint`: the ticket preview, `onCopy`: the order's text, `onMessage`:
 * the chat, `onShare`: the PDF); the sheet opens the adjust-time and assign-driver sheets and the map itself.
 */
export const MoreSheet = ({ request }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const [{ user }] = useSession() as any
  const [, { showToast }] = useToast() as any
  const styles = useMemo(() => sheetStyles(theme), [theme])
  const { order } = request
  const handlers: MoreHandlers = request.opts ?? {}
  const visible = (key: string) => themeVisible(theme, key)

  // Runs a row's action once the sheet has gone (a navigation, a call), as the sheet closes.
  const leave = (action?: () => void) => () => {
    closeRequest()
    action?.()
  }
  // Leads to another sheet in place: the same window, new content.
  const toSheet = (kind: 'prepTime' | 'assignDriver', opts: any) => () => replaceRequest(kind, order, opts)
  // Leads to the full-screen map, after this sheet's fade.
  const toMap = () => {
    closeRequest()
    setTimeout(() => replaceRequest('map', order, { driverLocation: handlers.driverLocation }), HANDOFF_DELAY_MS)
  }
  const copyNumber = () => {
    Clipboard.setString(orderNumberOf(order, configs))
    showToast(ToastType.Info, t('COPIED', 'Copied'), 1000)
  }

  const callUrl = customerCallUrl(order, configs)

  const rows: Array<{ key: string, icon: string, title: string, onPress: () => void, set?: 'ion' | 'mci' }> = []
  if (handlers.onPrint && visible('confirmation.order.print')) {
    rows.push({ key: 'print', icon: 'print-outline', title: t('PRINT_TICKET', 'Print ticket'), onPress: leave(handlers.onPrint) })
  }
  if (visible('confirmation.order.copy')) {
    rows.push(handlers.onCopy
      ? { key: 'copy', icon: 'copy-outline', title: t('COPY_ORDER_DETAILS', 'Copy order details'), onPress: leave(handlers.onCopy) }
      : { key: 'copy', icon: 'copy-outline', title: t('COPY_ORDER_NUMBER', 'Copy order number'), onPress: leave(copyNumber) })
  }
  if (hasMapCoordinates(order) && visible('confirmation.order.directions')) {
    rows.push({ key: 'map', icon: 'map-outline', title: t('VIEW_ON_MAP', 'View on map'), onPress: toMap })
  }
  if (handlers.onMessage && canMessageCustomer(order, configs) && visible('confirmation.order.messages')) {
    rows.push({ key: 'message', icon: 'chatbubble-outline', title: t('MESSAGE_CUSTOMER', 'Message customer'), onPress: leave(handlers.onMessage) })
  }
  if (callUrl) {
    rows.push({ key: 'call', icon: 'call-outline', title: t('CALL_CUSTOMER', 'Call customer'), onPress: leave(() => Linking.openURL(callUrl)) })
  }
  if (canAdjustTime(order)) {
    rows.push({ key: 'adjust', icon: 'time-outline', title: t('ADJUST_TIME', 'Adjust time'), onPress: toSheet('prepTime', handlers.prepTime ?? {}) })
  }
  if (canAssignDriver(order, configs, user?.level)) {
    rows.push({ key: 'assign', icon: 'person-add-outline', title: t('ASSIGN_DRIVER', 'Assign driver'), onPress: toSheet('assignDriver', handlers.assignDriver ?? {}) })
  }
  if (handlers.onShare && visible('ticket.pdf')) {
    rows.push({ key: 'share', icon: 'paper-plane-outline', title: t('SHARE_AS_PDF', 'Share as PDF'), onPress: leave(handlers.onShare) })
  }

  return (
    <View style={styles.list} testID='order-sheet-more'>
      {rows.map((row, index) => (
        <OListRow
          key={row.key}
          icon={row.icon}
          title={row.title}
          chevron={false}
          last={index === rows.length - 1}
          onPress={row.onPress}
          testID={`more-${row.key}`}
        />
      ))}
    </View>
  )
}

export default MoreSheet
