import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { checkNotifications } from 'react-native-permissions'

import {
  useEvent,
  useLanguage,
  useWebsocket,
  WebsocketStatus as WebsocketStatusController
} from '@components'
import { usePrinting } from '@/printing'
import { useFormats } from '@/hooks/useFormats'
import { themeColor, themeControlHeight, themeOpacity, themePart, themeSpace, themeVisible, nativeTextStyle } from '@/theme/helpers'
import { Icon, OBadge, OBottomPopup, OButton, OListRow, OText } from '../shared'
import { useOfflineActions } from '../../context/OfflineActions'
import {
  closeConnectionSheet, markConnectionUpdate, openConnectionSheet, useConnectionSheetOpen, useLastConnectionUpdate
} from './connectionStore'
import { useConnectFailure } from './connectError'
import { connectionRole, connectionStateOf, serverRole, serverStateOf, useSettledConnection, type ConnectionState } from './connectionState'

export { openConnectionSheet, closeConnectionSheet } from './connectionStore'
export { connectionStateOf } from './connectionState'

/** How long "Reconnect now" shows it is working when the connection does not answer. */
const RECONNECT_FEEDBACK_MS = 4000

/** What each state is called on the pill and in the sheet, and the badge that draws it. */
const PILL_VARIANT: Record<ConnectionState, 'success_soft' | 'warning_soft' | 'danger_soft'> = {
  live: 'success_soft',
  reconnecting: 'warning_soft',
  offline: 'danger_soft'
}

const useStateText = () => {
  const [, t] = useLanguage()
  return (state: ConnectionState) => state === 'live'
    ? t('LIVE', 'Live')
    : state === 'reconnecting' ? t('RECONNECTING', 'Reconnecting') : t('OFFLINE', 'Offline')
}

/** The socket's state and the network's, as the pill and the sheet read them. */
const useConnection = (socketStatus: number, connectedDate?: Date | string | number) => {
  const [{ isNetConnected }] = useOfflineActions() as any
  const heard = useLastConnectionUpdate()
  const connected = connectedDate ? new Date(connectedDate).getTime() : null
  const lastUpdate = Math.max(heard ?? 0, Number.isFinite(connected as number) ? (connected as number) : 0) || null
  const state = useSettledConnection(connectionStateOf({ isNetConnected, socketStatus }))
  return { state, lastUpdate, isNetConnected }
}

/**
 * The connection pill of a header (Main, OrdersOffline, TabletBoard): the state as text with a dot (never color alone):
 * Live, Reconnecting or Offline. A tap opens the connection sheet (hosted by `ConnectionHost`). It takes no props and
 * follows `connection_status` of the theme.
 */
const ConnectionPillUI = ({ socketStatus, connectedDate }: any) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const stateText = useStateText()
  const { state } = useConnection(socketStatus, connectedDate)
  const styles = useMemo(() => StyleSheet.create({
    // The pill is a badge; its touch target is a control's height around it, its glyph row centered.
    // In a short bar it is the pill that gives way: its text shortens (an ellipsis) down to the dot and a stub of text, never below a control's width.
    pill: { minHeight: themeControlHeight(theme, 'md'), minWidth: themeControlHeight(theme, 'md'), flexShrink: 1, justifyContent: 'center', paddingHorizontal: themeSpace(theme, 'xs') },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    // The pill is as wide as the text of its state ("Live" is short, "Reconnecting" longer), up to the theme's maximum
    // (`header.base.status_max_width`): a longer translation ends in an ellipsis; the sheet and the accessibility label say it whole.
    badge: { alignSelf: 'center', maxWidth: themePart(theme, 'header', 'base.status_max_width') }
  }), [theme])
  if (!themeVisible(theme, 'connection_status')) return null
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${t('CONNECTION', 'Connection')}: ${stateText(state)}`}
      onPress={openConnectionSheet}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      testID='connection-pill'
    >
      <OBadge variant={PILL_VARIANT[state]} dot style={styles.badge} testID='connection-status'>
        {stateText(state)}
      </OBadge>
    </Pressable>
  )
}

export const WebsocketStatus = (props: any) => (
  <WebsocketStatusController {...props} UIComponent={ConnectionPillUI} />
)

/** The "Last update 12:31 PM" time of the sheet. */
const useTimeText = () => {
  const { time } = useFormats()
  return (moment: number | null) => moment ? time(moment) : ''
}

interface SheetProps {
  open: boolean
  onClose: () => void
  socketStatus: number
  connectedDate?: Date | string | number
  /** What the controller reports of the last connect error (`undefined`: it does not; the sheet listens itself). */
  connectError?: string | null
  connectErrorIsAuth?: boolean
}

/**
 * The connection sheet (SheetConnection): the state named and colored with when the last update came, the server, the
 * notifications and the printer, "Reconnect now" and a line for when orders stop arriving. Offline (the device has no
 * network) and a socket that is down are told apart in the words. "Reconnect now" reconnects the socket without
 * restarting the app; the shell's reconnect catch-up (`SocketReconnectContext`) then loads the lists again.
 */
export const ConnectionSheet = ({ open, onClose, socketStatus, connectedDate, connectError, connectErrorIsAuth }: SheetProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const socket: any = useWebsocket()
  const stateText = useStateText()
  const timeText = useTimeText()
  const { state, lastUpdate } = useConnection(socketStatus, connectedDate)
  const failure = useConnectFailure({ connectError, connectErrorIsAuth })
  const printing = usePrinting()
  const [permission, setPermission] = useState<'on' | 'off' | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const role = connectionRole(state)
  const server = serverStateOf(socketStatus)
  const tile = themePart(theme, 'icon_tile', 'sizes.lg')
  const tileBase = themePart(theme, 'icon_tile', 'base')
  const styles = useMemo(() => StyleSheet.create({
    body: { gap: themeSpace(theme, 'md') },
    head: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    tile: { width: tile.size, height: tile.size, borderRadius: tileBase.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColor(theme, `${role}_subtle`) },
    texts: { flex: 1, minWidth: 0 },
    title: { ...nativeTextStyle(theme.native.components.sheet.base.title), color: themeColor(theme, `${role}_text`) },
    note: { ...nativeTextStyle(theme.native.tokens.typography.body_sm), color: themeColor(theme, 'text_muted') },
    value: { ...nativeTextStyle(theme.native.tokens.typography.label) }
  }), [theme, tile, tileBase, role])

  // Whether the phone lets the app notify: read when the sheet opens (the permission may have changed meanwhile).
  useEffect(() => {
    if (!open) return
    let alive = true
    checkNotifications()
      .then(({ status }: any) => alive && setPermission(status === 'granted' || status === 'limited' ? 'on' : 'off'))
      .catch(() => alive && setPermission(null))
    return () => { alive = false }
  }, [open])

  // The attempt is over when the socket says so; else its feedback ends by itself.
  useEffect(() => {
    if (socketStatus === 1) setBusy(false)
  }, [socketStatus])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const reconnect = useCallback(() => {
    setBusy(true)
    try {
      // A socket that thinks it is connected may be stale: it is dropped first, so the catch-up (`connect` after a
      // `disconnect`) runs for the lists whichever way it was.
      if (socket?.socket?.connected) socket.socket.disconnect()
      socket?.connect?.()
    } catch {}
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setBusy(false), RECONNECT_FEEDBACK_MS)
  }, [socket])

  // The controller always knows when the socket last connected, so there is a time to write.
  const when = timeText(lastUpdate)
  const description = (
    state === 'live'
      ? t('CONNECTION_LIVE_DESCRIPTION', 'Orders update in real time. Last update _time_.')
      : state === 'reconnecting'
        // A server that answers and refuses the session is not a lost connection: the words say so.
        ? failure.rejected
          ? t('CONNECTION_REJECTED_DESCRIPTION', 'The server did not accept this session. Sign in again if it does not reconnect. Last update _time_.')
          : t('CONNECTION_RECONNECTING_DESCRIPTION', 'Lost the connection to the server. Trying to reconnect. Last update _time_.')
        : t('CONNECTION_OFFLINE_DESCRIPTION', 'No internet connection. Orders will update when you are back online. Last update _time_.')
  )
  const text = description.replace('_time_', when)

  const serverText = server === 'connected' ? t('CONNECTED', 'Connected') : server === 'connecting' ? t('CONNECTING', 'Connecting') : t('DISCONNECTED', 'Disconnected')

  // The printer line: the first saved printer's name and how its last ticket went (the printers contract).
  const [first] = printing.printers ?? []
  const result = first ? printing.resultOf(first) : undefined
  const name = first ? (first.nickname || (first as any).name || '') : ''
  const more = (printing.printers?.length ?? 0) - 1
  const printerName = more > 0 ? t('PRINTER_AND_MORE', '_name_ and _count_ more').replace('_name_', name).replace('_count_', String(more)) : name
  const failedAt = result && !result.ok ? timeText(result.at) : ''

  const ink = (tone: 'success' | 'warning' | 'danger') => ({ ...styles.value, color: themeColor(theme, `${tone}_text`) })

  return (
    <OBottomPopup open={open} onClose={onClose} title={t('CONNECTION', 'Connection')} closeIcon padded testID='connection-sheet'>
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.tile} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
            <Icon name={state === 'live' ? 'checkmark' : state === 'reconnecting' ? 'sync' : 'cloud-offline-outline'} size='md' color={`${role}_text`} />
          </View>
          <View style={styles.texts}>
            <OText style={styles.title} testID='connection-state'>{stateText(state)}</OText>
            <OText style={styles.note} testID='connection-description'>{text}</OText>
          </View>
        </View>

        <View>
          <OListRow
            title={t('CONNECTION_SERVER', 'Server')}
            trailing={<OText style={ink(serverRole(server))} testID='connection-server'>{serverText}</OText>}
            testID='connection-row-server'
          />
          {permission !== null && (
            <OListRow
              title={t('CONNECTION_NOTIFICATIONS', 'Notifications')}
              trailing={<OText style={ink(permission === 'on' ? 'success' : 'warning')} testID='connection-notifications'>{permission === 'on' ? t('CONNECTION_NOTIFICATIONS_ON', 'On') : t('CONNECTION_NOTIFICATIONS_OFF', 'Off')}</OText>}
              testID='connection-row-notifications'
            />
          )}
          {!!first && (
            <OListRow
              title={t('CONNECTION_PRINTER', 'Printer · _name_').replace('_name_', printerName)}
              subtitle={failedAt ? t('PRINTER_LAST_FAILED', 'The last ticket failed at _time_.').replace('_time_', failedAt) : undefined}
              trailing={result
                ? <OText style={ink(result.ok ? 'success' : 'danger')} testID='connection-printer'>{result.ok ? t('PRINTER_READY', 'Ready') : t('PRINTER_STATUS_OFFLINE', 'Offline')}</OText>
                : undefined}
              last
              testID='connection-row-printer'
            />
          )}
        </View>

        <OButton
          appearance='tonal'
          color='primary'
          size='md'
          text={t('RECONNECT_NOW', 'Reconnect now')}
          loading={busy}
          disabled={busy}
          onClick={reconnect}
          testID='connection-reconnect'
        />
        <OText style={styles.note}>{t('CONNECTION_CHECK_NETWORK', 'If orders stop arriving, check your Wi-Fi or mobile data.')}</OText>
      </View>
    </OBottomPopup>
  )
}

/** The socket's state for the host: it also notes every order event as "the last update". */
const ConnectionHostUI = ({ socketStatus, connectedDate, connectError, connectErrorIsAuth }: any) => {
  const [events] = useEvent() as any
  const open = useConnectionSheetOpen()

  useEffect(() => {
    const mark = () => markConnectionUpdate()
    events.on('order_added', mark)
    events.on('order_updated', mark)
    return () => {
      events.off('order_added', mark)
      events.off('order_updated', mark)
    }
  }, [events])

  return <ConnectionSheet open={open} onClose={closeConnectionSheet} socketStatus={socketStatus} connectedDate={connectedDate} connectError={connectError} connectErrorIsAuth={connectErrorIsAuth} />
}

/**
 * The connection sheet's host (a global overlay, `GlobalOverlays`): mounted once over the tabs and the stack so a pill in
 * any header opens the same sheet. It draws nothing until a pill asks for it.
 */
export const ConnectionHost = () => <WebsocketStatusController UIComponent={ConnectionHostUI} />
