import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { businessContacts, customerCard, customerFullName } from './partyContact'
import { orderCustomFields, orderDataLines, vehicleLines, type DataLine } from './orderData'
import { themeVisible } from '@/theme/helpers'
import { OLink, OText } from '../shared'

import { useConfig, useLanguage, useUtils } from '@components'
import { useFormats } from '@/hooks/useFormats'

const DetailLine = ({ label, value, testID }: { label: string, value: string, testID?: string }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  return (
    <View style={styles.detailLine} testID={testID}>
      <OText preset='body_sm' style={styles.detailLabel}>{label}</OText>
      <OText preset='body_sm' style={styles.detailValue}>{value}</OText>
    </View>
  )
}

/**
 * What the order carries besides what the kitchen acts on, one folded row (page section `more_details`): the
 * store (its name, contacts, address and notes), the order's data (type, how it is paid, when it is for, its
 * external id, when it was created), the customer's other phone and e-mail and the rest of what is known of them
 * (internal number, zip code; nothing of the customer's contact when the business hides it), the custom fields
 * and the vehicle of a curbside order. The store's address opens the app's own map (`onOpenMap`) when there is one to open.
 */
export const MoreDetails = ({ order, hideContact, onOpenMap }: { order: any, hideContact: boolean, onOpenMap?: () => void }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ configs }] = useConfig()
  const [{ parsePrice }] = useUtils()
  const { dateTime } = useFormats()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const [open, setOpen] = useState(false)

  const business = order?.business
  const contacts = businessContacts(order)
  const data = orderDataLines(order, {
    t,
    dateTime,
    parsePrice,
    configs,
    showDate: themeVisible(theme, 'confirmation.order.date'),
    showType: themeVisible(theme, 'confirmation.order.type')
  })
  const { links } = customerCard(order, hideContact)
  const customerName = customerFullName(order, hideContact).trim()
  const customer = order?.customer
  const extra: DataLine[] = [
    customer?.internal_number && { key: 'internal_number', label: t('INTERNAL_NUMBER', 'Internal Number'), value: String(customer.internal_number) },
    customer?.zipcode && { key: 'zipcode', label: t('ZIP_CODE', 'Zip code'), value: String(customer.zipcode) }
  ].filter(Boolean) as DataLine[]
  const fields = orderCustomFields(order)
  const vehicle = vehicleLines(order, t)

  return (
    <FoldedRow
      open={open}
      onToggle={() => setOpen(!open)}
      label={t('MORE_DETAILS', 'More details')}
      header={(
        <>
          <OText preset='label'>{t('MORE_DETAILS', 'More details')}</OText>
          <OText preset='body_sm' color='text_muted' numberOfLines={1}>{t('MORE_DETAILS_HINT', 'Store, external ID, custom fields')}</OText>
        </>
      )}
      body={(
        <>
          <OText style={styles.subtitle}>{t('BUSINESS_DETAILS', 'Business details')}</OText>
          {!!business?.name && <OText preset='body_sm' testID='more-store-name'>{business.name}</OText>}
          {!!contacts.email && <OLink url={contacts.email.url} shorcut={contacts.email.text} size='sm' />}
          {contacts.phones.map((link) => <OLink key={link.key} url={link.url} shorcut={link.text} size='sm' />)}
          {!!business?.address && (
            <OLink onPress={onOpenMap} disabled={!onOpenMap} variant={onOpenMap ? 'default' : 'muted'} shorcut={business.address} size='sm' numberOfLines={2} testID='more-store-address' />
          )}
          {!!business?.address_notes && <OText preset='body_sm' color='text_muted'>{business.address_notes}</OText>}

          {data.length > 0 && <OText style={styles.subtitle}>{t('ORDER_DETAILS', 'Order Details')}</OText>}
          {data.map((line) => <DetailLine key={line.key} label={line.label} value={line.value} testID={`more-${line.key}`} />)}

          {(links.length > 0 || extra.length > 0) && !!(customerName || links.length || extra.length) && (
            <OText style={styles.subtitle}>{customerName || t('CUSTOMER_DETAILS', 'Customer details')}</OText>
          )}
          {links.map((link) => <OLink key={link.key} url={link.url} shorcut={link.text} size='sm' />)}
          {extra.map((line) => <DetailLine key={line.key} label={line.label} value={line.value} testID={`more-${line.key}`} />)}

          {fields.length > 0 && <OText style={styles.subtitle}>{t('CUSTOM_FIELDS', 'Custom fields')}</OText>}
          {fields.map((field) => <DetailLine key={field.id} label={field.key} value={field.value} testID={`more-field-${field.id}`} />)}

          {vehicle.length > 0 && <OText style={styles.subtitle}>{t('VEHICLE', 'Vehicle')}</OText>}
          {vehicle.map((line) => <DetailLine key={line.key} label={line.label} value={line.value} testID={`more-vehicle-${line.key}`} />)}
        </>
      )}
      testID='more-details'
    />
  )
}
