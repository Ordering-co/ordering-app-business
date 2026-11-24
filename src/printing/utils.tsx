import { PermissionsAndroid, Platform } from 'react-native';
import { useConfig, useLanguage, useUtils } from '@components'

import { verifyDecimals, getProductPrice } from '../ui/src/utils'
import { resolvePaperWidth } from './paperWidth'

const wrapWords = (text: string, firstWidth: number, width: number): string[] => {
  const fullWidth = Math.max(1, width)
  const lines: string[] = []
  let limit = Math.max(1, Math.min(firstWidth, fullWidth))
  let current = ''

  const breakLine = () => {
    lines.push(current)
    current = ''
    limit = fullWidth
  }

  for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    if (current && current.length + 1 + word.length > limit) breakLine()
    if (!current && word.length > limit && word.length <= fullWidth) breakLine()
    let rest = word
    while (rest.length > limit) {
      current = rest.slice(0, limit)
      rest = rest.slice(limit)
      breakLine()
    }
    if (rest) current = current ? `${current} ${rest}` : rest
  }

  if (current || !lines.length) lines.push(current)
  return lines
}

export const PrinterUtilities = ({ wordWrap = false }: { wordWrap?: boolean } = {}) => {
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
    if (!wordWrap) {
      const error = 0
      const currentLength = str1.length + str2.length
      const calc = (maxWidth ?? textProps.ticketWidthToShow) - currentLength - error
      const whiteSpaces = ' '.repeat(calc < 0 ? 0 : calc)
      return str1 + whiteSpaces + str2
    }

    const width = maxWidth ?? textProps.ticketWidthToShow
    const fits = str1.length + str2.length < width
    if (fits || str1.includes('\n') || str2.length >= width - 1) {
      const calc = width - str1.length - str2.length
      return str1 + ' '.repeat(calc < 0 ? 0 : calc) + str2
    }
    const labelWidth = width - str2.length - 1
    const lines = wrapWords(str1, labelWidth, labelWidth)
    const last = lines.pop() ?? ''
    return [...lines, last + ' '.repeat(Math.max(1, width - last.length - str2.length)) + str2].join('\n')
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

  const parseOrderProducts = (
    order: any,
    maxWidth?: number,
    options: { productIngredients?: boolean, productOptions?: boolean, productComments?: boolean } = {}
  ) => {
    const list: any = []
    const showIngredients = options.productIngredients !== false
    const showOptions = options.productOptions !== false
    const showComments = options.productComments !== false

    if (order?.products.length) {
      order?.products.map((product: any) => {
        list.push(`${parseCommandLine(`${product?.quantity}  ${product?.name}`, parsePrice(product.total ?? getProductPrice(product)), maxWidth)}${textProps.endLine}`)

        if (showIngredients && product?.ingredients?.length) {
          list.push({ text: `  ${t('INGREDIENTS', 'Ingredients')}:${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 10 : 18 } })
          product?.ingredients?.map((ingredient: any) => {
            list.push({ text: `  ${t('NO', 'No')} ${ingredient.name}${textProps.endLine}`, fontSize: Platform.OS === 'ios' ? 10 : 18 })
          })
        }

        showOptions && product.options?.map((option: any) => {
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

        if (showComments && product.comment) {
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

  /**
   * A long value (an address, a note, the delivery date) after its label: broken at whole words, the first line in the
   * room the label and its ": " leave, the others the paper's whole width. A word is only split when it is longer than a
   * line. (It was cut every N characters, one character past the paper on the first line: "Nte. C / e / ntro".)
   */
  const parseSizeStrings = (str: string, error: number = 0, maxWidth?: number) => {
    const baseWidth = maxWidth ?? textProps.ticketWidthToShow
    return wrapWords(str, baseWidth - (error + 2), baseWidth).join('\n')
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
