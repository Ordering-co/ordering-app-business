import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import {
  BusinessController as BusinessSingleCard,
  useLanguage,
  ToastType,
  useToast,
} from '@components'
import { themeColor, themeVisible } from '@/theme/helpers'
import OText from '../shared/OText'
import OCard from '../shared/OCard'
import ODivider from '../shared/ODivider'
import OSwitch from '../shared/OSwitch'
import OButton from '../shared/OButton'
import { OBadge } from '../shared/OBadge'
import OAvatar from '../shared/OAvatar'
import IconTile from '../shared/IconTile'
import Icon from '../shared/Icon'
import { getStoreStatus, type StoreStatus } from '../StoresList/storeStatus'
import { PauseOrdersSheet } from '../StoresList/PauseOrdersSheet'
import { useWhen } from '../StoresList/useWhen'
import { storeZoneNote } from '../StoresList/zonedTime'
import type { PauseOption } from '../StoresList/pauseOptions'
import { storeCardStyles } from './styles'

type Translate = (key: string, fallback: string) => string

const NBSP = '\u00A0'

/**
 * A time written into a phrase so that a line never breaks inside it (T3-C4: "Open · closes / 11:59 PM" in the Stores
 * landscape pane's narrow card): the meridiem stays with its digits and, for "closes _time_", the time with its verb, so
 * the phrase breaks only before "closes" (or stays whole).
 */
const withTime = (phrase: string, token: string, time: string, bindWord: boolean): string => {
  const held = time.replace(/(\d) ([AaPp]\.?[Mm]\.?)/g, `$1${NBSP}$2`)
  return (bindWord ? phrase.replace(` ${token}`, `${NBSP}${token}`) : phrase).replace(token, held)
}

/** The status row's text, from the store's state. The closing / opening times are in the store's own clock. */
export const storeStatusText = (
  status: StoreStatus,
  timeZone: string | null | undefined,
  t: Translate,
  when: (date: Date, timeZone?: string | null) => string,
  showHours = true,
): string => {
  switch (status.kind) {
    case 'open':
      return showHours && status.closesAt
        ? withTime(t('STORE_OPEN_CLOSES_AT', 'Open · closes _time_'), '_time_', when(status.closesAt, timeZone), true)
        : t('STORE_OPEN', 'Open')
    case 'closed':
      return showHours && status.opensAt
        ? withTime(t('STORE_CLOSED_OPENS_AT', 'Closed · opens _when_'), '_when_', when(status.opensAt, timeZone), false)
        : t('STORE_CLOSED', 'Closed')
    case 'paused':
      return withTime(t('STORE_PAUSED_UNTIL', 'Paused · until _when_'), '_when_', when(status.until, timeZone), false)
    default:
      return t('STORE_TURNED_OFF', 'Orders turned off')
  }
}

/** The dot's color role by state. */
const DOT_COLOR: Record<StoreStatus['kind'], string> = {
  open: 'success',
  closed: 'border_strong',
  paused: 'warning',
  off: 'border_strong',
}

/** The line's text color role by state. */
const TEXT_COLOR: Record<StoreStatus['kind'], string> = {
  open: 'success_text',
  closed: 'text_muted',
  paused: 'warning_text',
  off: 'text_muted',
}

interface Pending {
  changes: Record<string, any>
  toast: string
  /** The controller's error and business when the request started: a save that worked hands back a new business. */
  before: any
  beforeBusiness: any
}

/**
 * "Open · closes 11:59 PM" in a narrow card (a tablet's list pane) wraps where there is room: the time of day and its
 * AM / PM are never split over two lines, so "PM" does not sit alone under the text.
 */
const keepTimeTogether = (text: string) => text.replace(/(\d) (AM|PM)\b/gi, '$1\u00A0$2')

const asBusiness = (value: any) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null)

/**
 * One store of the stores list, as `Stores` draws it: the logo (or a glyph tile), the name and the address, a line,
 * and the state of its orders with the switch "Accepting orders". The row above the line opens the store's menu
 * (or selects it on a tablet's two panes); the switch pauses orders (a sheet), turns them back on, and "Resume now"
 * ends a pause. Everything goes through `updateBusiness(id, params)` of the controller (`enabled`, `snooze_until`).
 */
export const BusinessControllerUI = (props: any) => {
  const { businessState, updateBusiness, navigation, onSelectStore, selected = false, isOffline = false, now: nowProp } = props
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme: any = useTheme()
  const when = useWhen()
  const styles = useMemo(() => storeCardStyles(theme), [theme])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [applied, setApplied] = useState<{ on: any, changes: Record<string, any> } | null>(null)
  const started = useRef(false)

  // The last good business: a failed save leaves the controller with the error text in its place.
  const lastGood = useRef<any>(null)
  const current = asBusiness(businessState?.business)
  if (current) lastGood.current = current
  const base = current ?? lastGood.current
  // What the API did not send back of a saved change is kept from the change itself, until the list refreshes.
  const business = base && applied && applied.on === base ? { ...base, ...applied.changes } : base

  const now = nowProp ?? new Date()
  const status = useMemo(() => getStoreStatus(business, now), [business, now])
  const loading = !!businessState?.loading

  // The answer of a save: the controller's `loading` goes up and comes down (it has no result to hand back).
  useEffect(() => {
    if (!pending) return
    if (loading) {
      started.current = true
      return
    }
    if (!started.current) return
    started.current = false
    const failed = !current || current === pending.beforeBusiness || (businessState?.error && businessState.error !== pending.before)
    if (failed) {
      showToast(ToastType.Error, t('ERROR_UPDATING_BUSINESS', 'Error updating business'))
    } else {
      setApplied({ on: current, changes: pending.changes })
      showToast(ToastType.Success, pending.toast)
    }
    setPending(null)
    setSheetOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  if (!business) return null

  const request = (changes: Record<string, any>, toast: string) => {
    if (!updateBusiness || pending) return
    setPending({ changes: { ...changes, ...(changes.snooze_until === '' ? { snooze_until: null } : {}) }, toast, before: businessState?.error, beforeBusiness: current })
    updateBusiness(business.id, changes)
  }

  const open = () => {
    if (onSelectStore) return onSelectStore(business)
    if (navigation && business.slug) navigation.navigate('BusinessProductListing', { slug: business.slug, name: business.name })
  }

  const handleSwitch = () => {
    if (status.kind === 'off') request({ enabled: true }, t('ORDERS_RESUMED', 'Orders resumed'))
    else setSheetOpen(true)
  }

  const handleConfirm = (option: PauseOption) => {
    const toast = option.until
      ? t('ORDERS_PAUSED_UNTIL', 'Orders paused until _time_').replace('_time_', when(option.until, business.timezone))
      : t('DISABLED_BUSINESS', 'Disabled business')
    request(option.changes, toast)
  }

  const zipcode = String(business.zipcode ?? '').trim()
  const address = [business.address, zipcode !== '' && zipcode !== '-1' ? zipcode : ''].filter(Boolean).join(' ')
  const showAddress = themeVisible(theme, 'stores.address') && !!address
  const showLogo = themeVisible(theme, 'business_card.logo') && !!business.logo
  const showHours = themeVisible(theme, 'stores.hours')
  const zone = showHours ? storeZoneNote(business.timezone) : null
  const statusText = storeStatusText(status, business.timezone, t, when, showHours)
  const busy = !!pending
  const switchOn = status.kind !== 'off'

  return (
    <>
    <OCard variant={selected ? 'tint' : 'default'} style={styles.card} testID={`store-card-${business.id}`}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={business.name}
        onPress={open}
        style={({ pressed }) => [styles.top, pressed && styles.pressed]}
        testID={`store-open-${business.id}`}
      >
        {showLogo
          ? <OAvatar source={business.logo} kind='business' size='md' name={business.name} />
          : <IconTile icon='storefront-outline' size='lg' variant='neutral' />}
        <View style={styles.texts}>
          <OText preset='label' numberOfLines={1}>{business.name}</OText>
          {showAddress && <OText preset='body_sm' color='text_muted' numberOfLines={1}>{address}</OText>}
        </View>
        <Icon name='chevron-forward' size='md' color='text_muted' />
      </Pressable>
      <ODivider />
      <View style={styles.statusRow}>
        <View style={styles.statusSide}>
          {status.kind === 'paused'
            ? <OBadge variant='warning_soft' testID={`store-status-${business.id}`}>{statusText}</OBadge>
            : (
              <View style={styles.statusLine}>
                <View style={[styles.dot, { backgroundColor: themeColor(theme, DOT_COLOR[status.kind]) }]} testID={`store-dot-${status.kind}`} />
                <OText style={[styles.statusText, { color: themeColor(theme, TEXT_COLOR[status.kind]) }]} numberOfLines={2} testID={`store-status-${business.id}`}>
                  {keepTimeTogether(statusText)}
                </OText>
              </View>
            )}
          {!!zone && (
            <OText preset='caption' color='text_muted' testID={`store-zone-${business.id}`}>
              {t('STORE_TIME_ZONE', 'Store time: _zone_').replace('_zone_', zone)}
            </OText>
          )}
        </View>
        {status.kind === 'paused'
          ? (
            <OButton
              text={t('RESUME_NOW', 'Resume now')}
              appearance='tonal'
              size='md'
              loading={busy}
              disabled={isOffline || busy}
              onClick={() => request({ snooze_until: '' }, t('ORDERS_RESUMED', 'Orders resumed'))}
              testID={`store-resume-${business.id}`}
            />
          )
          : (
            <OSwitch
              value={switchOn}
              label={t('ACCEPTING_ORDERS', 'Accepting orders')}
              accessibilityLabel={`${t('ACCEPTING_ORDERS', 'Accepting orders')} · ${business.name}`}
              disabled={isOffline || busy}
              onChange={handleSwitch}
              testID={`store-switch-${business.id}`}
            />
          )}
      </View>
    </OCard>
    {sheetOpen && (
      <PauseOrdersSheet
        open
        onClose={() => !busy && setSheetOpen(false)}
        targets={[business]}
        name={business.name}
        onConfirm={handleConfirm}
        loading={busy}
      />
    )}
    </>
  )
}

export const BusinessController = (props: any) => {
  const BusinessControllerProps = {
    ...props,
    isDisabledInterval: true,
    UIComponent: BusinessControllerUI,
  }
  return <BusinessSingleCard {...BusinessControllerProps} />
}
