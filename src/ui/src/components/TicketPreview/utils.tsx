import { PermissionsAndroid, Platform } from 'react-native';
import { useConfig, useLanguage, useUtils } from '@components'

import { verifyDecimals, getProductPrice } from '../../utils'
import { resolvePaperWidth } from '../PrinterEdition/paperWidth'

export const PrinterUtilities = () => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [{ parsePrice, parseNumber, parseDate }] = useUtils()

  const textProps = {
    fontSize: 14,
    endLine: '\n',
    ...resolvePaperWidth()
  }

  const deliveryStatus: any = {
    1: t('DELIVERY', 'Delivery'),
    2: t('PICK_UP', 'Pick up'),
    3: t('EAT_IN', 'Eat In'),
    4: t('CURBSIDE', 'Curbside'),
    5: t('DRIVER_THRU', 'Driver thru'),
  };

  const walletName: any = {
    cash: {
      name: t('CASH_WALLET', 'Cash Wallet')
    },
    credit_point: {
      name: t('POINTS_WALLET', 'Points Wallet')
    }
  }

  const parseCommandLine = (str1: string, str2: string, maxWidth?: number) => {
    const error = 0
    const currentLength = str1.length + str2.length
    const calc = (maxWidth ?? textProps.ticketWidthToShow) - currentLength - error
    const whiteSpaces = ' '.repeat(calc < 0 ? 0 : calc)
    return str1 + whiteSpaces + str2
  }

  const confirmBluetoothPermission = async () => {
    let hasPermission = false
    try {
      hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)

      if (!hasPermission) {
        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
        hasPermission = status === PermissionsAndroid.RESULTS.GRANTED
      }
    } catch (err) {
      console.warn(err)
    }

    return hasPermission
  }

  const parsePercentTip = (order: any) =>
    parseInt(configs?.driver_tip_type?.value, 10) === 2 &&
    !parseInt(configs?.driver_tip_use_custom?.value, 10) &&
    verifyDecimals(order?.summary?.driver_tip, parseNumber)

  const replaceInvalidChars = (string: string) => {
    const accents: any = {
      'á': 'a',
      'é': 'e',
      'í': 'i',
      'ó': 'o',
      'ú': 'u',
      'Á': 'A',
      'É': 'E',
      'Í': 'I',
      'Ó': 'O',
      'Ú': 'U',
      'ü': 'u',
      'Ü': 'U',
      'ñ': 'n',
      'Ñ': 'N',
      "'": '',
      "’": '',
      "`": '',
    };
    return string.replace(/[áéíóúÁÉÍÓÚüÜñÑ'’`]/g, (match: any) => accents[match])
  }

  const parseCustomerName = (order: any) => `${order?.customer?.name ?? ''} ${order?.customer?.middle_name ?? ''} ${order?.customer?.lastname ?? ''} ${order?.customer?.second_lastname ?? ''}`?.replace('  ', ' ')?.trim() ?? ''

  const parseDeliveryDate = (order: any) => {
    const dateString = order?.delivery_datetime_utc ?? order?.delivery_datetime
    const currentDate = new Date();
    const receivedDate: any = new Date(order?.delivery_datetime);

    const formattedDate = receivedDate <= currentDate
      ? `${t('ASAP_ABBREVIATION', 'ASAP')}(${parseDate(dateString, { utc: !!order?.delivery_datetime_utc })})`
      : parseDate(dateString, { utc: !!order?.delivery_datetime_utc })
    return formattedDate
  }

  const parseOrderProducts = (order: any, maxWidth?: number) => {
    const list: any = []

    if (order?.products.length) {
      order?.products.map((product: any) => {
        list.push(`${parseCommandLine(`${product?.quantity}  ${product?.name}`, parsePrice(product.total ?? getProductPrice(product)), maxWidth)}${textProps.endLine}`)

        if (product?.ingredients?.length) {
          list.push({ text: `  ${t('INGREDIENTS', 'Ingredients')}:${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 10 : 18 } })
          product?.ingredients?.map((ingredient: any) => {
            list.push({ text: `  ${t('NO', 'No')} ${ingredient.name}${textProps.endLine}`, fontSize: Platform.OS === 'ios' ? 10 : 18 })
          })
        }

        product.options?.map((option: any) => {
          list.push({ text: `  ${parseSizeStrings(option.name, 2, maxWidth)}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 10 : 18 } })

          option.suboptions?.map((suboption: any) => {
            const { quantity, name, position, price } = suboption
            const pos = position && position !== 'whole' ? `(${t(position.toUpperCase(), position)})` : ''
            const string = name !== 'No'
              ? pos
                ? `${quantity} x ${name} ${pos} +${parsePrice(price)}`
                : `${quantity} x ${name} +${parsePrice(price)}`
              : 'No'

            list.push({ text: `   ${string}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 10 : 18 } })
          })
        })

        if (product.comment) {
          list.push({ text: `  ${t('COMMENT', 'Comment')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 10 : 18 } })
          list.push({ text: `   ${parseSizeStrings(product.comment, 3, maxWidth)}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 10 : 18 } })
        }

        list.push('_separator_')
      })
    }

    return list
  }

  const parsePaymethods = (order: any, maxWidth?: number) => {
    const _paymethodsList = order?.payment_events?.filter((item: any) => item.event === 'payment')
    const paymethodsList: any = []
    const paymethodsText = _paymethodsList.map((paymethod: any) => {
      return paymethod?.wallet_event
        ? walletName[paymethod?.wallet_event?.wallet?.type]?.name
        : paymethod?.paymethod?.gateway && paymethod?.paymethod?.gateway === 'cash' && order?.cash > 0
          ? `${t(paymethod?.paymethod?.gateway?.toUpperCase(), paymethod?.paymethod?.name)} (${t('CASH_CHANGE_OF', 'Change of :amount:').replace(':amount:', parsePrice(order?.cash))})`
          : paymethod?.paymethod?.gateway
            ? t(paymethod?.paymethod?.gateway?.toUpperCase(), paymethod?.paymethod?.name)
            : t(order?.paymethod?.gateway?.toUpperCase(), order?.paymethod?.name)
    }).join(', ')

    if (order?.payment_events?.length > 0) {
      order?.payment_events.map((event: any) => {
        const payment = event?.wallet_event
          ? walletName[event?.wallet_event?.wallet?.type]?.name
          : event?.paymethod?.gateway && event?.paymethod?.gateway === 'cash' && order?.cash > 0
            ? `${t(event?.paymethod?.gateway?.toUpperCase(), event?.paymethod?.name)} (${t('CASH_CHANGE_OF', 'Change of :amount:').replace(':amount:', parsePrice(order?.cash))})`
            : event?.paymethod?.gateway
              ? t(event?.paymethod?.gateway?.toUpperCase(), event?.paymethod?.name)
              : t(order?.paymethod?.gateway?.toUpperCase(), order?.paymethod?.name)

        const amount = (event?.paymethod?.gateway === 'cash' && order?.cash)
          ? parsePrice(order?.cash)
          : `-${parsePrice(event?.amount)}`

        paymethodsList.push(`${parseCommandLine(payment, amount, maxWidth)}${textProps.endLine}`)
      })
    }

    return {
      paymethodsLength: _paymethodsList?.length ?? 0,
      paymethodsText,
      paymethodsList
    }
  }

  const parseSizeStrings = (str: string, error: number = 0, maxWidth?: number) => {
    const baseWidth = maxWidth ?? textProps.ticketWidthToShow
    const lineWidth = Math.max(1, baseWidth - (error + 1))
    const regex = new RegExp(`(.{1,${lineWidth}})`, 'g')
    const lines = str?.match?.(regex) || [str]

    if (lines.length > 2) {
      const _regex = new RegExp(`(.{1,${baseWidth}})`, 'g')
      const firstLine = lines[0]
      const string = str.slice(firstLine.length)
      const _lines = string.match(_regex) || [string]

      const remainingLines = _lines.join('')
      const remainingLinesSplit = remainingLines.match(_regex)?.join('\n') || remainingLines;
      return `${firstLine}\n${remainingLinesSplit}`
    }

    return lines.join('\n')
  }

  return {
    deliveryStatus,
    walletName,
    textProps,
    confirmBluetoothPermission,
    parsePaymethods,
    parsePercentTip,
    parseCustomerName,
    parseDeliveryDate,
    parseCommandLine,
    replaceInvalidChars,
    parseOrderProducts,
    parseSizeStrings,
  }
}
