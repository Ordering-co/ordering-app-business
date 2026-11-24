import React from 'react'
import { View } from 'react-native'

import { OAvatar, OBadge, OText } from '../shared'
import { orderTypeVariant } from '../shared/orderTypeVariant'

/**
 * The pieces the order card and the group's card share under the band, as the approved drawing has them: the header (the
 * store's tile, its name over the title, the total at the end) and the facts (type, Paid / Unpaid, items).
 */
type Styles = Record<string, any>

interface HeaderProps {
  /** The store's logo and name: the tile and the name line; without it the header is the title and the total. */
  store?: { name: string, logo?: string }
  title: string
  /** An order with something unread (a dot before the title). */
  unread?: boolean
  /** The total written, at the header's end; none hides it. */
  total?: string
  styles: Styles
  /** Prefix of the test ids of the store's tile and name, the title and the total. */
  testID?: string
}

export const OrderCardHeader = ({ store, title, unread = false, total, styles, testID = 'order-card-store' }: HeaderProps) => (
  <View style={styles.header} testID={`${testID}-header`}>
    {!!store && <OAvatar kind='business' tone='neutral' size='md' source={store.logo} name={store.name} testID={`${testID}-logo`} />}
    <View style={styles.titles}>
      {!!store && <OText style={styles.storeName} numberOfLines={1} testID={`${testID}-name`}>{store.name}</OText>}
      <View style={styles.titleRow}>
        {unread && <View style={styles.unreadDot} testID='order-card-unread' />}
        <OText style={styles.title} numberOfLines={1} testID={`${testID}-title`}>{title}</OText>
      </View>
    </View>
    {total !== undefined && <OText preset='h4' style={styles.total} testID={`${testID}-total`}>{total}</OText>}
  </View>
)

interface FactsProps {
  /** The `delivery_type` of the order (its chip's colour is the type's own) and its written name. */
  type?: number | string | null
  typeText?: string
  payment?: 'paid' | 'unpaid'
  paidText: string
  unpaidText: string
  items?: string
  /** A control at the row's end (the group's chevron). */
  trailing?: React.ReactNode
  styles: Styles
  testID?: string
}

/** The type chip, the Paid / Unpaid chip and the number of items; one row that wraps if it must. */
export const OrderFacts = ({ type, typeText, payment, paidText, unpaidText, items, trailing, styles, testID }: FactsProps) => {
  if (!typeText && !payment && !items && !trailing) return null
  return (
    <View style={styles.facts} testID={testID}>
      {!!typeText && <OBadge variant={orderTypeVariant(type)} style={styles.chip} testID={testID && `${testID}-type`}>{typeText}</OBadge>}
      {!!payment && (
        <OBadge variant={payment === 'paid' ? 'success_soft' : 'warning_soft'} style={styles.chip} testID={testID && `${testID}-payment`}>
          {payment === 'paid' ? paidText : unpaidText}
        </OBadge>
      )}
      {!!items && <OText style={styles.items} testID={testID && `${testID}-items`}>{items}</OText>}
      {!!trailing && <View style={styles.factsEnd}>{trailing}</View>}
    </View>
  )
}
