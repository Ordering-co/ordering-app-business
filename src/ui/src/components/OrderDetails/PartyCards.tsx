import React, { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { SlotButton } from './SlotButton'
import {
  customerCard, customerFullName, deliveryOptionName, distanceText, driverCall, storeToCustomerKilometers
} from './partyContact'
import { deliveryDateText, placeLines, orderNumber } from './orderData'
import { isDeliveryOrder } from './orderStages'
import { useOpenContact } from './useOpenContact'
import { MiniMap } from './MiniMap'
import type { Coordinates } from '../GoogleMap/useDriverTracking'
import { Icon, IconTile, OAvatar, OBadge, OCard, ODivider, OText } from '../shared'

import { useConfig, useLanguage } from '@components'
import { useFormats } from '@/hooks/useFormats'

/** A text of at most `lines` lines with "Read more" under it when it is longer (address notes, a long address). */
const ExpandableText = ({ children, label, lines = 2, onPress, testID }: { children: string, label?: string, lines?: number, onPress?: () => void, testID?: string }) => {
  const [, t] = useLanguage()
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)
  return (
    <View>
      <OText
        preset='body_sm'
        color={label ? undefined : 'text_muted'}
        numberOfLines={open ? undefined : lines}
        onTextLayout={(event: any) => { if (!open) setLong(event.nativeEvent.lines.length > lines) }}
        onPress={onPress}
        testID={testID}
      >
        {!!label && <OText preset='body_sm' color='text_muted'>{`${label}: `}</OText>}
        {children}
      </OText>
      {long && (
        <OText preset='body_sm' color='primary_text' onPress={() => setOpen(!open)} testID={testID && `${testID}-more`}>
          {open ? t('SHOW_LESS', 'Show less') : t('READ_MORE', 'Read more')}
        </OText>
      )}
    </View>
  )
}

interface CustomerProps {
  order: any
  /** `hide_customer_contact_business_app`: no name, e-mail or phone. */
  hideContact: boolean
  /** The message button exists (the chat is open, the contact is not hidden, the theme shows it). */
  canMessage: boolean
  unread: number
  onMessage: () => void
  /** Opens the app's own map (`actions.openMap`) from the address; without it (no coordinates, the theme hides the map) the address is plain text. */
  onOpenMap?: () => void
}

/**
 * The customer's card: who (an avatar, the name, the phone), a call and a message button (the message one with its
 * unread count), and under a line where (the address that opens the app's map, how far it is from the store and
 * when it is for), the table, spot or reservation of the order and what the customer left for the delivery.
 * The business can hide the customer's name, phone and e-mail (`hide_customer_contact_business_app`): the card
 * then says "Customer" and has no call or message button; the address stays.
 */
export const CustomerCard = ({ order, hideContact, canMessage, unread, onMessage, onOpenMap }: CustomerProps) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ configs }] = useConfig()
  const { dateTime } = useFormats()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const open = useOpenContact()

  const customer = order?.customer
  const name = customerFullName(order, hideContact).trim()
  const { call } = customerCard(order, hideContact)
  const phone = hideContact ? '' : [customer?.country_phone_code ? '+' + customer.country_phone_code : '', customer?.cellphone ?? customer?.phone ?? ''].join('')
  const km = storeToCustomerKilometers(order)
  const asap = new Date(order?.delivery_datetime) <= new Date()
  const when = order?.delivery_type === 9 || !order?.delivery_datetime
    ? ''
    : asap && isDeliveryOrder(order)
      ? t('DELIVER_ASAP', 'Deliver ASAP')
      : deliveryDateText(order, { t, dateTime })
  const where = [
    km !== null ? t('DISTANCE_FROM_STORE', '_distance_ from the store').replace('_distance_', distanceText(km, configs?.distance_unit?.value, t)) : '',
    when
  ].filter(Boolean).join(' · ')
  const places = placeLines(order, { t, dateTime })
  const rating = order?.user_review?.qualification
  const option = deliveryOptionName(order, t)
  const address: string | undefined = customer?.address
  const hasLower = !!address || places.length > 0 || !!where

  return (
    <OCard testID='customer-card'>
      <View style={styles.row}>
        <OAvatar name={name || undefined} source={hideContact ? undefined : customer?.photo} size='md' />
        <View style={styles.grow}>
          <View style={styles.ratingBox}>
            <OText preset='label' numberOfLines={2} testID='customer-name'>{name || t('CUSTOMER', 'Customer')}</OText>
            {!!rating && !hideContact && (
              <>
                <Icon name='star' size='sm' color='text_muted' />
                <OText preset='body_sm'>{rating}</OText>
              </>
            )}
          </View>
          {!!phone && <OText preset='body_sm' color='text_muted' testID='customer-phone'>{phone}</OText>}
        </View>
        {!!call && (
          <SlotButton
            slot='call'
            icon={<Icon name='call-outline' />}
            onClick={() => open(call.url)}
            accessibilityLabel={t('CALL_CUSTOMER', 'Call customer')}
            testID='customer-call'
          />
        )}
        {canMessage && (
          <SlotButton
            slot='messages'
            icon={<Icon name='chatbubble-outline' />}
            count={unread}
            onClick={onMessage}
            accessibilityLabel={t('MESSAGE_CUSTOMER', 'Message customer')}
            testID='customer-message'
          />
        )}
      </View>
      {hasLower && <ODivider />}
      {!!address && (
        <Pressable
          style={({ pressed }) => [styles.rowTop, pressed && !!onOpenMap && styles.pressed]}
          disabled={!onOpenMap}
          accessibilityRole={onOpenMap ? 'link' : undefined}
          accessibilityLabel={address}
          onPress={onOpenMap}
          testID='customer-address'
        >
          <Icon name='location-outline' color='text_muted' />
          <View style={styles.grow}>
            <OText numberOfLines={3}>{address}</OText>
            {!!where && <OText preset='body_sm' color='text_muted' testID='customer-where'>{where}</OText>}
          </View>
        </Pressable>
      )}
      {!address && !!where && <OText preset='body_sm' color='text_muted' testID='customer-where'>{where}</OText>}
      {places.length > 0 && (
        <View style={styles.facts}>
          {places.map((line) => (
            <OText preset='body_sm' key={line.key} testID={`customer-${line.key}`}>
              <OText preset='body_sm' color='text_muted'>{`${line.label}: `}</OText>{line.value}
            </OText>
          ))}
        </View>
      )}
      {(!!customer?.address_notes || !!order?.on_behalf_of || !!option) && (
        <View style={styles.notes}>
          {!!customer?.address_notes && <ExpandableText label={t('NOTES', 'Notes')} testID='customer-address-notes'>{customer.address_notes}</ExpandableText>}
          {!!order?.on_behalf_of && (
            <OText preset='body_sm' color='text_muted'>{`${t('ON_BEHALF_OF', 'On behalf of')}: ${order.on_behalf_of}`}</OText>
          )}
          {!!option && <OBadge variant='neutral' testID='customer-delivery-option'>{option}</OBadge>}
        </View>
      )}
    </OCard>
  )
}

interface HandoffProps {
  order: any
  hideContact: boolean
  canMessage: boolean
  unread: number
  onMessage: () => void
}

/**
 * The hand-off card of an order that is ready for pickup: whom to give it to and what to ask for (the order's
 * number), with a call and a message button. Without the customer's name (the business hides it) it says "Customer".
 */
export const HandoffCard = ({ order, hideContact, canMessage, unread, onMessage }: HandoffProps) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ configs }] = useConfig()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const open = useOpenContact()
  const name = customerFullName(order, hideContact).trim()
  const { call } = customerCard(order, hideContact)
  return (
    <OCard variant='tint' testID='handoff-card'>
      <View style={styles.row}>
        <View style={styles.grow}>
          <OText style={styles.handoffLabel}>{t('HAND_OFF_TO', 'Hand off to')}</OText>
          <OText preset='h4' numberOfLines={2} testID='handoff-name'>{name || t('CUSTOMER', 'Customer')}</OText>
          <OText preset='body_sm' color='text_muted'>
            {t('ASK_FOR_ORDER', 'Ask for order #_number_').replace('_number_', orderNumber(order, configs))}
          </OText>
        </View>
        {!!call && (
          <SlotButton
            slot='call'
            onTint
            icon={<Icon name='call-outline' />}
            onClick={() => open(call.url)}
            accessibilityLabel={t('CALL_CUSTOMER', 'Call customer')}
            testID='handoff-call'
          />
        )}
        {canMessage && (
          <SlotButton
            slot='messages'
            onTint
            icon={<Icon name='chatbubble-outline' />}
            count={unread}
            onClick={onMessage}
            accessibilityLabel={t('MESSAGE_CUSTOMER', 'Message customer')}
            testID='handoff-message'
          />
        )}
      </View>
    </OCard>
  )
}

interface DriverProps {
  order: any
  /** The business may assign or change the driver (config and level): the card has the button. */
  canAssign: boolean
  onAssign: () => void
  /** The map button (a driver on the way and a place to draw). */
  onTrack?: () => void
  onMessage?: () => void
  /** Draw the mini map of the places (a delivery with positions; the page decides). */
  miniMap?: boolean
  driverLocation?: Coordinates | null
}

/**
 * The driver's card: who has the order (or "Not assigned yet") and, when the business may, the button to assign or
 * change the driver. With a driver on the way it has the call and message buttons, a mini map of the places and
 * "Track on map". With a driver, his name leads and "Driver" is the caption under it (OrderDelivery); without one,
 * the caption leads and "Not assigned yet" is the line (OrderPreparing). No arrival estimate: the API does not give one.
 */
export const DriverCard = ({ order, canAssign, onAssign, onTrack, onMessage, miniMap = false, driverLocation }: DriverProps) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const open = useOpenContact()
  const driver = order?.driver
  const phone = driverCall(driver)
  const name = driver ? `${driver.name ?? ''}${driver.lastname ? ` ${String(driver.lastname).trim().charAt(0)}.` : ''}`.trim() : ''
  return (
    <OCard testID='driver-card'>
      <View style={styles.row}>
        {driver
          ? <OAvatar name={name} source={driver.photo} size='md' />
          : <IconTile icon='bicycle-outline' size='md' variant='neutral' />}
        <View style={styles.grow}>
          {!driver && <OText preset='body_sm' color='text_muted'>{t('DRIVER', 'Driver')}</OText>}
          <OText preset='label' numberOfLines={1} testID='driver-name'>{name || t('DRIVER_NOT_ASSIGNED_YET', 'Not assigned yet')}</OText>
          {!!driver && <OText preset='body_sm' color='text_muted'>{t('DRIVER', 'Driver')}</OText>}
        </View>
        {!!driver && !!phone && (
          <SlotButton
            slot='call'
            icon={<Icon name='call-outline' />}
            onClick={() => open(phone.url)}
            accessibilityLabel={t('CALL_DRIVER', 'Call driver')}
            testID='driver-call'
          />
        )}
        {!!driver && !!onMessage && (
          <SlotButton
            slot='messages'
            icon={<Icon name='chatbubble-outline' />}
            onClick={onMessage}
            accessibilityLabel={t('MESSAGE_DRIVER', 'Message driver')}
            testID='driver-message'
          />
        )}
        {canAssign && (
          <SlotButton
            slot='action'
            text={driver ? t('CHANGE_DRIVER', 'Change') : t('ASSIGN', 'Assign')}
            onClick={onAssign}
            testID='driver-assign'
          />
        )}
      </View>
      {miniMap && <MiniMap order={order} driverLocation={driverLocation} />}
      {!!onTrack && (
        <SlotButton slot='action' text={t('TRACK_ON_MAP', 'Track on map')} onClick={onTrack} testID='driver-track' />
      )}
    </OCard>
  )
}
