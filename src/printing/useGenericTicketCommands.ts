import { Platform } from 'react-native'
import { useConfig, useLanguage, useUtils } from '@components'

import { verifyDecimals } from '../ui/src/utils'
import { isCustomerContactHidden } from '../ui/src/utils/contactVisibility'
import { PrinterUtilities } from './utils'
import { TICKET_OFFER_TARGET, getTicketOffersByTarget } from './getTicketOffersByTarget'
import { normalizeTicketPrintOptions, type TicketPrintOptions } from './ticketPrintOptions'

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false
  const text = String(value).trim().toLowerCase()
  return text !== '' && text !== 'null' && text !== 'undefined'
}

export const useGenericTicketCommands = () => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const hideCustomerContact = isCustomerContactHidden(configs)
  const [{ parsePrice, parseNumber }] = useUtils()
  const {
    deliveryStatus,
    textProps,
    parsePaymethods,
    parsePercentTip,
    parseCustomerName,
    parseDeliveryDate,
    parseOrderProducts,
    replaceInvalidChars,
    parseCommandLine,
    parseSizeStrings
  } = PrinterUtilities({ wordWrap: true })

  const generateGenericCommands = (order: any, maxWidth?: number, printOptions?: Partial<TicketPrintOptions>) => {
    if (!order) return ''

    const show = normalizeTicketPrintOptions(printOptions)
    const when = (enabled: boolean, ...items: any[]) => (enabled ? items : [])

    const getIncludedTaxes = (isDeliveryFee?: boolean) => {
      if (!order?.taxes) return 0
      if (order?.taxes?.length === 0) {
        return order.tax_type === 1 ? order?.summary?.tax ?? 0 : 0
      } else {
        return order?.taxes.reduce((taxIncluded: number, tax: any) => {
          return taxIncluded +
            (((!isDeliveryFee && tax.type === 1 && tax.target === 'product') ||
              (isDeliveryFee && tax.type === 1 && tax.target === 'delivery_fee')) ? tax.summary?.tax : 0)
        }, 0)
      }
    }

    let commands: any = [];

    const productOffers = getTicketOffersByTarget(order?.offers, TICKET_OFFER_TARGET.product)
    const deliveryOffers = getTicketOffersByTarget(order?.offers, TICKET_OFFER_TARGET.delivery)
    const serviceFeeOffers = getTicketOffersByTarget(order?.offers, TICKET_OFFER_TARGET.serviceFee)

    const printOfferLines = (offers: any[]) =>
      offers.length
        ? offers
          .map((offer: any) => `${parseCommandLine(
            `${t(offer.name?.toUpperCase?.()?.replace(/ /g, '_'), offer.name)} ${offer.rate_type === 1 ? `(${verifyDecimals(offer?.rate, parsePrice)}%)` : ''}`,
            `- ${parsePrice(offer?.summary?.discount)}`,
            maxWidth)}${textProps.endLine}`
          ).join(', ')
        : ''

    const appends: any = [
      { text: `${t('ORDER_NO', 'Order No.')} ${order.id}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 16 : 24 } },
      '_separator_',
      ...when(show.orderStatus, `${hasValue(order?.orderStatus) ? `${order.orderStatus}${textProps.endLine}` : ''}`),
      ...when(show.orderType, hasValue(deliveryStatus[order?.delivery_type])
        ? { text: `${t('ORDER_TYPE', 'Order Type')}: ${deliveryStatus[order?.delivery_type]}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 22 } }
        : ''),
      ...when(show.paymentMethod, hasValue(parsePaymethods(order).paymethodsText)
        ? { text: `${t(`PAYMENT_METHOD${parsePaymethods(order).paymethodsLength > 1 ? 'S' : ''}`, `Payment method${parsePaymethods(order).paymethodsLength > 1 ? 's' : ''}`)}: ${parsePaymethods(order).paymethodsText}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 22 } }
        : ''),
      ...when(show.deliveryPreference, `${!!order?.delivery_option?.id ? `${t('DELIVERY_PREFERENCE', 'Delivery Preference')}: ${parseSizeStrings(t(order?.delivery_option?.name?.toUpperCase()?.replace(/ /g, '_'), order?.delivery_option?.name), t('DELIVERY_PREFERENCE', 'Delivery Preference')?.length, maxWidth)}${textProps.endLine}` : ''}`),
      ...when(show.deliveryDate, { text: `${t('DELIVERY_DATE', 'Delivery Date')}: ${parseSizeStrings(parseDeliveryDate(order), t('DELIVERY_DATE', 'Delivery Date')?.length, maxWidth)}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 22 } }),
      '_separator_',
      ...when(
        show.customerSection,
        { text: `${t('CUSTOMER_DETAILS', 'Customer details')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 24 } },
        textProps.endLine,
        ...when(show.customerName, `${!hideCustomerContact && hasValue(parseCustomerName(order)) ? `${t('FULL_NAME', 'Full Name')}: ${parseCustomerName(order)}${textProps.endLine}` : ''}`),
        ...when(show.customerEmail, `${!hideCustomerContact && hasValue(order?.customer?.email) ? `${t('EMAIL', 'Email')}: ${order?.customer?.email}${textProps.endLine}` : ''}`),
        ...when(
          show.customerPhones,
          `${!hideCustomerContact && hasValue(order?.customer?.cellphone) ? `${t('MOBILE_PHONE', 'Mobile Phone')}: ${order?.customer?.cellphone}${textProps.endLine}` : ''}`,
          `${!hideCustomerContact && hasValue(order?.customer?.phone) ? `${t('MOBILE_PHONE', 'Mobile Phone')}: ${order?.customer?.phone}${textProps.endLine}` : ''}`
        ),
        ...when(show.customerAddress, `${hasValue(order?.customer?.address) ? `${t('FULL_ADDRESS', 'Full Address')}: ${parseSizeStrings(order?.customer?.address, t('FULL_ADDRESS', 'Full Address')?.length, maxWidth)}${textProps.endLine}` : ''}`),
        ...when(show.customerInternalNumber, `${hasValue(order?.customer?.internal_number) ? `${t('INTERNAL_NUMBER', 'Internal Number')}: ${order?.customer?.internal_number}${textProps.endLine}` : ''}`),
        ...when(show.customerAddressNotes, `${hasValue(order?.customer?.address_notes) ? `${t('NOTES', 'Notes')}: ${parseSizeStrings(order?.customer?.address_notes, t('NOTES', 'Notes')?.length, maxWidth)}${textProps.endLine}` : ''}`),
        ...when(show.customerZipcode, `${hasValue(order?.customer?.zipcode) ? `${t('ZIPCODE', 'Zipcode')}: ${order?.customer?.zipcode}${textProps.endLine}` : ''}`)
      ),
      '_separator_',
      ...when(
        show.businessSection,
        { text: `${t('BUSINESS_DETAILS', 'Business details')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 24 } },
        textProps.endLine,
        ...when(show.businessName, `${hasValue(order?.business?.name) ? `${order.business.name}${textProps.endLine}` : ''}`),
        ...when(show.businessEmail, `${hasValue(order?.business?.email) ? `${order.business.email}${textProps.endLine}` : ''}`),
        ...when(
          show.businessPhones,
          `${hasValue(order?.business?.cellphone) ? `${t('BUSINESS_PHONE', 'Business Phone')}: ${order?.business?.cellphone}${textProps.endLine}` : ''}`,
          `${hasValue(order?.business?.phone) ? `${t('BUSINESS_PHONE', 'Business Phone')}: ${order?.business?.phone}${textProps.endLine}` : ''}`
        ),
        ...when(show.businessAddress, `${hasValue(order?.business?.address) ? `${t('ADDRESS', 'Address')}: ${parseSizeStrings(order?.business?.address, t('ADDRESS', 'Address')?.length, maxWidth)}${textProps.endLine}` : ''}`),
        ...when(show.businessAddressNotes, `${hasValue(order?.business?.address_notes) ? `${t('SPECIAL_ADDRESS', 'Special Address')}: ${parseSizeStrings(order?.business?.address_notes, t('SPECIAL_ADDRESS', 'Special Address')?.length, maxWidth)}${textProps.endLine}` : ''}`)
      ),
      '_separator_',
      { text: `${t('ORDER_DETAILS', 'Order Details')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 24 } },
      textProps.endLine,
      ...when(show.orderComment, `${hasValue(order?.comment) ? `${t('ORDER_COMMENT', 'Order Comment')}: ${parseSizeStrings(order?.comment, t('ORDER_COMMENT', 'Order Comment')?.length, maxWidth)}${textProps.endLine}${textProps.endLine}` : ''}`),
      ...parseOrderProducts(order, maxWidth, show),
      ...when(
        show.totalsBreakdown,
      `${parseCommandLine(t('SUBTOTAL', 'Subtotal'), parsePrice(((order?.summary?.subtotal ?? order?.subtotal) + getIncludedTaxes())), maxWidth)}${textProps.endLine}`,
      `${(order?.summary?.discount > 0 || order?.discount > 0) && order?.offers?.length === 0 ? `${parseCommandLine(order?.offer_type === 1 ? `${t('DISCOUNT', 'Discount')} (${verifyDecimals(order?.offer_rate, parsePrice)}%)${textProps.endLine}` : t('DISCOUNT', 'Discount'), `- ${parsePrice(order?.summary?.discount ?? order?.discount)}`, maxWidth)}${textProps.endLine}` : ''}`,
      `${printOfferLines(productOffers)}`,
      `${order?.taxes?.length === 0 && order?.tax_type === 2 && order?.summary?.tax > 0 ? `${parseCommandLine(`${t('TAX', 'Tax')} (${verifyDecimals(order?.tax, parseNumber)}%)`, parsePrice(order?.summary?.tax ?? 0), maxWidth)}${textProps.endLine}` : ''}`,
      `${order?.fees?.length === 0 && order?.summary?.service_fee > 0 ? `${parseCommandLine(`${t('SERVICE_FEE', 'Service Fee')} (${verifyDecimals(order?.summary?.service_fee, parseNumber)}%)`, parsePrice(order?.summary?.service_fee ?? 0), maxWidth)}${textProps.endLine}` : ''}`,
      `${order?.taxes?.length > 0 && !!order?.taxes?.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'product')?.length
        ? order?.taxes
          ?.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'product')
          ?.map((tax: any) => `${parseCommandLine(
            `${t(tax?.name?.toUpperCase?.()?.replace(/ /g, '_'), tax?.name) || t('INHERIT_FROM_BUSINESS', 'Inherit from business')} ${`(${verifyDecimals(tax?.rate, parseNumber)}%)`}`,
            `${parsePrice(tax?.summary?.tax_after_discount ?? tax?.summary?.tax ?? 0)}`,
            maxWidth)}${textProps.endLine}`
          ).join(', ')
        : ''}`,
      `${printOfferLines(deliveryOffers)}`,
      `${typeof order?.summary?.delivery_price === 'number' && order.delivery_type !== 2 ? `${parseCommandLine(t('DELIVERY_FEE', 'Delivery Fee'), parsePrice(order?.summary?.delivery_price + getIncludedTaxes(true)), maxWidth)}${textProps.endLine}` : ''}`,
      `${(order?.summary?.driver_tip > 0 || order?.driver_tip > 0) && order.delivery_type !== 2 ? `${parseCommandLine(`${t('DRIVER_TIP', 'Driver tip')} ${parsePercentTip(order) ? `(${parsePercentTip(order)}%)` : ''}`, parsePrice(order?.summary?.driver_tip ?? order?.totalDriverTip), maxWidth)}${textProps.endLine}` : ''}`,
      `${order?.taxes?.length > 0 && !!order?.taxes?.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'delivery_fee')?.length
        ? order?.taxes
          ?.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'delivery_fee')
          ?.map((tax: any) => `${parseCommandLine(
            `${tax.name || t('INHERIT_FROM_BUSINESS', 'Inherit from business')} ${`(${verifyDecimals(tax?.rate, parseNumber)}%)`}`,
            `${parsePrice(tax?.summary?.tax_after_discount ?? tax?.summary?.tax ?? 0)}`,
            maxWidth)}${textProps.endLine}`
          ).join(', ')
        : ''}`,
      `${printOfferLines(serviceFeeOffers)}`
      ),
      '_separator_',
      `${parseCommandLine(t('TOTAL', 'Total'), parsePrice(order?.summary?.total ?? 0), maxWidth)}${textProps.endLine}`,
      '_separator_',
      ...when(
        show.payments,
        `${order?.payment_events?.length > 0 ? `${t('PAYMENTS', 'Payments')}${textProps.endLine}` : ''}`,
        ...parsePaymethods(order, maxWidth).paymethodsList
      )
    ]

    const visibleAppends = appends.filter((append: any) => (append?.text ?? append) !== '')
    const printableAppends = visibleAppends.filter((append: any, index: number) =>
      !(append === '_separator_' && visibleAppends[index - 1] === '_separator_')
    )

    commands = [
      ...commands,
      ...printableAppends.map((append: any) => (append === '_separator_'
        ? `${'-'.repeat(maxWidth ?? textProps.ticketWidthToShow)}${textProps.endLine}`
        : replaceInvalidChars(append?.text ?? append)))
    ]

    return commands.join('')
  }

  return { generateGenericCommands }
}
