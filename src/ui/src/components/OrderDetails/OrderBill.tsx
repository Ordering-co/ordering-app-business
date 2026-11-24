import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { verifyDecimals } from '../../utils'
import { themeVisible } from '@/theme/helpers'
import { OText } from '../shared'

import { useLanguage, useUtils, useConfig } from '@components'

/** The order has a driver tip the bill shows (not for a pickup). */
export const hasDriverTip = (order: any) =>
  (order?.summary?.driver_tip > 0 || order?.driver_tip > 0) && order?.delivery_type !== 2

/** The amount of the order's driver tip, to write with `parsePrice`. */
export const driverTipAmount = (order: any) => order?.summary?.driver_tip ?? order?.totalDriverTip

/** A bill with a total of 0 is not drawn (a free order has nothing to pay). */
export const hasBill = (order: any) => Number(order?.summary?.total ?? order?.total ?? 0) !== 0

/** Two money amounts are the same when they round to the same cent. */
const sameAmount = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100)

/**
 * The rows of an order's bill (subtotal, discounts, taxes, fees, delivery fee, driver tip), already drawn. The subtotal
 * is a row only when it says something the total does not: another line stands between them (a fee, a tax, a tip, a
 * discount) or the two amounts differ. A bill that is only the subtotal is the total again, so it has no rows
 * (`OrderReadyPickup` draws "Total" alone, `OrderPending` the subtotal over its fee, tax, tip and discount).
 */
export const useBillRows = (order: any): React.ReactNode[] => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ parsePrice, parseNumber }] = useUtils()
  const [{ configs }] = useConfig()
  const styles = useMemo(() => detailsStyles(theme), [theme])

  const getIncludedTaxes = (isDeliveryFee?: boolean) => {
    if (!order?.taxes) return 0
    if (order?.taxes?.length === 0) {
      return order.tax_type === 1 ? order?.summary?.tax ?? 0 : 0
    }
    return order.taxes.reduce((taxIncluded: number, tax: any) => {
      return taxIncluded +
        (((!isDeliveryFee && tax.type === 1 && tax.target === 'product') ||
          (isDeliveryFee && tax.type === 1 && tax.target === 'delivery_fee')) ? tax.summary?.tax : 0)
    }, 0)
  }

  const getIncludedTaxesDiscounts = () =>
    order?.taxes?.filter((tax: any) => tax?.type === 1 && tax?.target === 'product')
      ?.reduce((carry: number, tax: any) => carry + (tax?.summary?.tax_after_discount ?? tax?.summary?.tax), 0)

  const row = (label: React.ReactNode, amount: React.ReactNode, key?: string | number) => (
    <View style={styles.billRow} key={key}>
      <OText preset='body_sm' style={styles.billRowLabel}>{label}</OText>
      <OText preset='body_sm' style={styles.billRowAmount}>{amount}</OText>
    </View>
  )

  const offerName = (offer: any) => (
    <>
      {t(offer.name?.toUpperCase?.()?.replace(/ /g, '_'), offer.name)}
      {offer.rate_type === 1 && `(${verifyDecimals(offer?.rate, parsePrice)}%)`}
    </>
  )

  const offersOf = (target: number) => order?.offers?.length > 0
    ? order.offers.filter((offer: any) => offer?.target === target).map((offer: any) => row(
      offerName(offer),
      <>- {parsePrice(offer?.summary?.discount)}</>,
      offer.id
    ))
    : null

  const subtotal = Number(order?.summary?.subtotal ?? order?.subtotal) + getIncludedTaxes()
  const total = Number(order?.summary?.total ?? order?.total)
  const others = (
    <>
      {((order?.summary?.discount > 0) || (order?.discount > 0)) && order?.offers?.length === 0 && row(
        order?.offer_type === 1
          ? <>{t('DISCOUNT', 'Discount')}{' '}{`(${verifyDecimals(order?.offer_rate, parsePrice)}%)`}</>
          : t('DISCOUNT', 'Discount'),
        <>- {parsePrice(order?.summary?.discount ?? order?.discount)}</>
      )}
      {offersOf(1)}
      {order?.summary?.subtotal_with_discount > 0 && order?.summary?.discount > 0 && order?.summary?.total >= 0 && row(
        t('SUBTOTAL_WITH_DISCOUNT', 'Subtotal with discount'),
        order?.tax_type === 1
          ? parsePrice((order?.summary?.subtotal_with_discount + getIncludedTaxesDiscounts()))
          : parsePrice(order?.summary?.subtotal_with_discount ?? 0)
      )}
      {order?.taxes?.length === 0 && order?.tax_type === 2 && order?.summary?.tax > 0 && row(
        <>{t('TAX', 'Tax')} {`(${verifyDecimals(order?.tax, parseNumber)}%)`}</>,
        parsePrice(order?.summary?.tax ?? 0)
      )}
      {order?.fees?.length === 0 && order?.summary?.service_fee > 0 && row(
        <>{t('SERVICE_FEE', 'Service fee')}{`(${verifyDecimals(order?.service_fee, parseNumber)}%)`}</>,
        parsePrice(order?.summary?.service_fee ?? 0)
      )}
      {order?.taxes?.length > 0 && order.taxes.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'product').map((tax: any) => row(
        <>
          {t(tax?.name?.toUpperCase?.()?.replace(/ /g, '_'), tax?.name) || t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
          {`(${verifyDecimals(tax?.rate, parseNumber)}%)`}{' '}
        </>,
        parsePrice(tax?.summary?.tax_after_discount ?? tax?.summary?.tax ?? 0),
        tax.id
      ))}
      {order?.fees?.length > 0 && order.fees.filter((fee: any) => !(fee.fixed === 0 && fee.percentage === 0)).map((fee: any) => row(
        <>
          {t(fee?.name?.toUpperCase?.()?.replace(/ /g, '_'), fee?.name) || t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
          ({fee?.fixed > 0 && `${parsePrice(fee?.fixed)} + `}{fee.percentage}%){' '}
        </>,
        parsePrice(fee?.summary?.amount ?? (fee?.summary?.fixed + (fee?.summary?.percentage_after_discount ?? fee?.summary?.percentage))),
        fee.id
      ))}
      {offersOf(3)}
      {typeof order?.summary?.delivery_price === 'number' && order.delivery_type !== 2 && row(
        t('DELIVERY_FEE', 'Delivery Fee'),
        parsePrice(order.summary.delivery_price + getIncludedTaxes(true))
      )}
      {order?.taxes?.length > 0 && order.taxes.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'delivery_fee').map((tax: any, i: number) => row(
        <>
          {tax.name || t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
          {`(${verifyDecimals(tax?.rate, parseNumber)}%)`}
        </>,
        parsePrice(tax?.summary?.tax_after_discount ?? tax?.summary?.tax ?? 0),
        `${tax.description}_${i}`
      ))}
      {offersOf(2)}
      {hasDriverTip(order) && row(
        <>
          {t('DRIVER_TIP', 'Driver tip')}
          {order?.driver_tip > 0 && parseInt(configs?.driver_tip_type?.value, 10) === 2 &&
            !parseInt(configs?.driver_tip_use_custom?.value, 10) &&
            (`(${verifyDecimals(order?.driver_tip, parseNumber)}%)`)}
        </>,
        parsePrice(driverTipAmount(order))
      )}
    </>
  )
  const between = React.Children.toArray(others.props.children)
  const showSubtotal = between.length > 0 || !Number.isFinite(total) || !sameAmount(subtotal, total)
  return showSubtotal
    ? [row(t('SUBTOTAL', 'Subtotal'), parsePrice(subtotal), 'subtotal'), ...between]
    : between
}

/** The bill's rows in the compact look of the mockups: small muted rows `xs` apart; nothing when there are none. */
export const OrderBill = ({ order }: { order: any }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const rows = useBillRows(order)
  if (rows.length === 0) return null
  return <View style={styles.billRows} testID='order-bill'>{rows}</View>
}

/**
 * How the order was paid, one muted line per payment event ("Payments · Cash  $20.00"), when it was paid in more
 * than one (`confirmation.order.payments`): with a single payment the total says it already.
 */
export const OrderPayments = ({ order }: { order: any }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ parsePrice }] = useUtils()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const events: any[] = (order?.payment_events ?? []).filter((event: any) => !event?.event || event.event === 'payment')
  if (events.length < 2 || !themeVisible(theme, 'confirmation.order.payments')) return null
  const walletName: any = {
    cash: t('PAY_WITH_CASH_WALLET', 'Pay with Cash Wallet'),
    credit_point: t('PAY_WITH_CREDITS_POINTS_WALLET', 'Pay with Credit Points Wallet')
  }
  const name = (event: any) => event?.wallet_event
    ? walletName[event.wallet_event?.wallet?.type]
    : event?.paymethod?.gateway
      ? t(event.paymethod.gateway.toUpperCase?.(), event.paymethod.name)
      : order?.paymethod?.id === event?.paymethod_id
        ? t(order.paymethod?.gateway?.toUpperCase?.(), order.paymethod?.name)
        : ''
  return (
    <View style={styles.billRows} testID='order-payments'>
      {events.map((event: any, index: number) => (
        <View style={styles.billRow} key={event.id ?? index}>
          <OText preset='body_sm' style={styles.paymentLabel}>{`${t('PAYMENTS', 'Payments')} · ${name(event)}`}</OText>
          <OText preset='body_sm' style={styles.billRowAmount}>{parsePrice(event?.paymethod?.gateway === 'cash' && order?.cash ? order.cash : event?.amount)}</OText>
        </View>
      ))}
    </View>
  )
}
