import { Platform } from 'react-native'
import {
  InterfaceType,
  StarConnectionSettings,
  StarXpandCommand,
  StarPrinter,
  StarDeviceDiscoveryManager,
  StarDeviceDiscoveryManagerFactory
} from 'react-native-star-io10'

import { verifyDecimals } from '../../utils'
import { PrinterUtilities } from './utils'
import { TICKET_OFFER_TARGET, getTicketOffersByTarget } from './getTicketOffersByTarget'
import { useUtils, useLanguage, useToast, ToastType } from '@components'
import {
  printEpsonLan,
  printEpsonBluetooth,
  printEpsonUsb,
  discoverEpsonPrinters,
  pickEpsonDiscoveryIdentifier
} from './EpsonPrinterAdapter'
import { normalizePrinterDriver } from '../PrinterEdition/printerList'

/**
 * Hook to create receipt commands and print via Star (star-io10) or Epson (ePOS) drivers.
 */

export const usePrinterCommands = () => {
  const [, t] = useLanguage()
  const [{ parsePrice, parseNumber }] = useUtils()
  const [, { showToast }] = useToast()
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
    confirmBluetoothPermission,
    parseSizeStrings
  } = PrinterUtilities()

  const discoveryEpsonPrinterPort = async (type: number) => {
    const result = await discoverEpsonPrinters({ type })

    if (result.errorKey === 'PRINTER_PERMISSION_DENIED') {
      return t('PRINTER_PERMISSION_DENIED', 'Bluetooth permission is required to find printers.')
    }
    if (result.errorKey === 'PRINTER_BLUETOOTH_PAIR_CANCELLED') {
      return t('PRINTER_BLUETOOTH_PAIR_CANCELLED', 'Bluetooth pairing was cancelled.')
    }
    if (!result.printers?.length) {
      return result.errorMessage
        ? t(result.errorMessage.toUpperCase().replace(/ /g, '_'), result.errorMessage)
        : t('NO_PRINTERS_FOUND', 'No printers found')
    }

    return result.printers.map((printer) => ({
      connectionSettings: {
        identifier: pickEpsonDiscoveryIdentifier(printer, type)
      },
      deviceName: printer.deviceName,
      target: printer.target
    }))
  }

  const discoveryPrinterPort = async (
    type: number,
    driver?: string
  ): Promise<string | Array<StarPrinter> | any[] | undefined> => {
    if (normalizePrinterDriver({ driver }) === 'epson') {
      return discoveryEpsonPrinterPort(type)
    }

    const settings = new StarConnectionSettings()
    const interfaceType = type === 1 ? InterfaceType.Bluetooth : InterfaceType.Lan
    let manager: StarDeviceDiscoveryManager = await StarDeviceDiscoveryManagerFactory.create([interfaceType])
    let printers: Array<StarPrinter> = []

    if (Platform.OS == 'android' && 31 <= Platform.Version) {
      if (interfaceType == InterfaceType.Bluetooth || settings.autoSwitchInterface == true) {
        const hasPermission = await confirmBluetoothPermission()

        if (!hasPermission) {
          return t('PRINTER_PERMISSION_DENIED', 'Bluetooth permission is required to find printers.')
        }
      }
    }
    try {
      await manager.stopDiscovery()

      manager = await StarDeviceDiscoveryManagerFactory.create([interfaceType])
      manager.discoveryTime = 1000

      manager.onPrinterFound = (printer: StarPrinter) => {
        printers.push(printer)
      }

      manager.onDiscoveryFinished = () => {
        printers = printers.length ? printers : t('NO_PRINTERS_FOUND', 'No printers found')
      }

      await manager.startDiscovery()
      await performTimeConsumingTask(printers)
      return printers
    } catch (error: any) {
      return error?.message ? t(error?.message?.toUpperCase().replace(/ /g, '_'), error?.message) : t('NO_PRINTERS_FOUND', 'No printers found')
    }
  }

  const performTimeConsumingTask = async (printers: any) => {
    return new Promise((resolve) =>
      setTimeout(
        () => { resolve(printers) },
        1000
      )
    );
  }

  const generateCommands = (order: any, maxWidth?: number) => {
    if (!order) return ''

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
      `${order.orderStatus}${textProps.endLine}`,
      { text: `${t('ORDER_TYPE', 'Order Type')}: ${deliveryStatus[order?.delivery_type]}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 22 } },
      { text: `${t(`PAYMENT_METHOD${parsePaymethods(order).paymethodsLength > 1 ? 'S' : ''}`, `Payment method${parsePaymethods(order).paymethodsLength > 1 ? 's' : ''}`)}: ${parsePaymethods(order).paymethodsText}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 22 } },
      `${!!order?.delivery_option?.id ? `${t('DELIVERY_PREFERENCE', 'Delivery Preference')}: ${parseSizeStrings(t(order?.delivery_option?.name?.toUpperCase()?.replace(/ /g, '_'), order?.delivery_option?.name), t('DELIVERY_PREFERENCE', 'Delivery Preference')?.length, maxWidth)}${textProps.endLine}` : ''}`,
      { text: `${t('DELIVERY_DATE', 'Delivery Date')}: ${parseSizeStrings(parseDeliveryDate(order), t('DELIVERY_DATE', 'Delivery Date')?.length, maxWidth)}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 22 } },
      '_separator_',
      { text: `${t('CUSTOMER_DETAILS', 'Customer details')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 24 } },
      textProps.endLine,
      `${t('FULL_NAME', 'Full Name')}: ${parseCustomerName(order)}${textProps.endLine}`,
      `${t('EMAIL', 'Email')}: ${order?.customer?.email}${textProps.endLine}`,
      `${!!order?.customer?.cellphone ? `${t('MOBILE_PHONE', 'Mobile Phone')}: ${order?.customer?.cellphone}${textProps.endLine}` : ''}`,
      `${!!order?.customer?.phone ? `${t('MOBILE_PHONE', 'Mobile Phone')}: ${order?.customer?.phone}${textProps.endLine}` : ''}`,
      `${order?.customer?.address ? `${t('FULL_ADDRESS', 'Full Address')}: ${parseSizeStrings(order?.customer?.address, t('FULL_ADDRESS', 'Full Address')?.length, maxWidth)}${textProps.endLine}` : ''}`,
      `${!!order?.customer?.internal_number ? `${t('INTERNAL_NUMBER', 'Internal Number')}: ${order?.customer?.internal_number}${textProps.endLine}` : ''}`,
      `${!!order?.customer?.address_notes ? `${t('NOTES', 'Notes')}: ${parseSizeStrings(order?.customer?.address_notes, t('NOTES', 'Notes')?.length, maxWidth)}${textProps.endLine}` : ''}`,
      `${!!order?.customer?.zipcode ? `${t('ZIPCODE', 'Zipcode')}: ${order?.customer?.zipcode}${textProps.endLine}` : ''}`,
      '_separator_',
      { text: `${t('BUSINESS_DETAILS', 'Business details')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 24 } },
      textProps.endLine,
      `${order?.business?.name}${order?.business?.name && textProps.endLine}`,
      `${order?.business?.email}${order?.business?.email && textProps.endLine}`,
      `${!!order?.business?.cellphone ? `${t('BUSINESS_PHONE', 'Business Phone')}: ${order?.business?.cellphone}${textProps.endLine}` : ''}`,
      `${!!order?.business?.phone ? `${t('BUSINESS_PHONE', 'Business Phone')}: ${order?.business?.phone}${textProps.endLine}` : ''}`,
      `${order?.business?.address ? `${t('ADDRESS', 'Address')}: ${parseSizeStrings(order?.business?.address, t('ADDRESS', 'Address')?.length, maxWidth)}${textProps.endLine}` : ''}`,
      `${!!order?.business?.address_notes ? `${t('SPECIAL_ADDRESS', 'Special Address')}: ${parseSizeStrings(order?.business?.address_notes, t('SPECIAL_ADDRESS', 'Special Address')?.length, maxWidth)}${textProps.endLine}` : ''}`,
      '_separator_',
      { text: `${t('ORDER_DETAILS', 'Order Details')}${textProps.endLine}`, props: { fontSize: Platform.OS === 'ios' ? 14 : 24 } },
      textProps.endLine,
      `${!!order?.comment ? `${t('ORDER_COMMENT', 'Order Comment')}: ${parseSizeStrings(order?.comment, t('ORDER_COMMENT', 'Order Comment')?.length, maxWidth)}${textProps.endLine}${textProps.endLine}` : ''}`,
      ...parseOrderProducts(order, maxWidth),
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
      `${printOfferLines(serviceFeeOffers)}`,
      '_separator_',
      `${parseCommandLine(t('TOTAL', 'Total'), parsePrice(order?.summary?.total ?? 0), maxWidth)}${textProps.endLine}`,
      '_separator_',
      `${order?.payment_events?.length > 0 ? `${t('PAYMENTS', 'Payments')}${textProps.endLine}` : ''}`,
      ...parsePaymethods(order, maxWidth).paymethodsList
    ]

    commands = [
      ...commands,
      ...appends.map((append: any) => (append === '_separator_'
        ? `${'-'.repeat(maxWidth ?? textProps.ticketWidthToShow)}${textProps.endLine}`
        : replaceInvalidChars(append?.text ?? append)))
    ]

    return commands.join('')
  }

  const printButton = async ({
    portName,
    image,
    type,
    showAlert,
    commandsText,
    driver,
    deviceName,
    ip,
    ticketWidth
  }: any): Promise<boolean> => {
    if (normalizePrinterDriver({ driver }) === 'epson') {
      // E3–E5: Bluetooth (1) + LAN (2) + USB Android (3)
      if (type !== 1 && type !== 2 && type !== 3) {
        showToast(
          ToastType.Error,
          t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed'),
          3000
        )
        return false
      }

      if (type === 3 && Platform.OS !== 'android') {
        showToast(
          ToastType.Error,
          t('PRINTER_USB_IOS_UNAVAILABLE', 'USB printing is available on Android only.'),
          3000
        )
        return false
      }

      if (type === 1 && Platform.OS === 'android' && 31 <= Platform.Version) {
        const hasPermission = await confirmBluetoothPermission()
        if (!hasPermission) {
          showToast(
            ToastType.Error,
            t('PRINTER_PERMISSION_DENIED', 'Bluetooth permission is required to find printers.'),
            3000
          )
          return false
        }
      }

      const result = type === 1
        ? await printEpsonBluetooth({
          address: portName || ip,
          deviceName: deviceName || 'TM-T20III',
          text: commandsText || ''
        })
        : type === 3
          ? await printEpsonUsb({
            target: portName,
            deviceName: deviceName || 'TM-T20III',
            text: commandsText || ''
          })
          : await printEpsonLan({
            ip: ip || portName,
            deviceName: deviceName || 'TM-T20III',
            text: commandsText || ''
          })

      if (result.ok) {
        showAlert && showToast(ToastType.Info, t('ORDER_PRINTED_SUCCESS', 'Order printed'), 3000)
        return true
      }

      const message =
        result.errorKey === 'PRINTER_TIMEOUT'
          ? t('PRINTER_TIMEOUT', 'Printer timed out. Check the network and try again.')
          : result.errorKey === 'PRINTER_PERMISSION_DENIED'
            ? t('PRINTER_PERMISSION_DENIED', 'Bluetooth permission is required to find printers.')
            : result.errorKey === 'PRINTER_NO_PAPER'
              ? t('PRINTER_NO_PAPER', 'Printer is out of paper.')
              : result.errorKey === 'PRINTER_COVER_OPEN'
                ? t('PRINTER_COVER_OPEN', 'Printer cover is open.')
                : result.errorKey === 'PRINTER_OFFLINE'
                  ? t('PRINTER_OFFLINE', 'Printer is offline. Check power and connection.')
                  : result.errorKey === 'PRINTER_UNREACHABLE'
                    ? t('PRINTER_UNREACHABLE', 'Printer unreachable. Check the connection and try again.')
                    : t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed')

      // Always surface errors in a multi-printer run. Success is decided by TicketPreview.
      showToast(ToastType.Error, message, 3000)
      return false
    }

    const settings = new StarConnectionSettings()

    const interfaceType = type === 1 ? InterfaceType.Bluetooth : InterfaceType.Lan
    const identifier = portName

    settings.interfaceType = interfaceType
    settings.identifier = identifier

    if (Platform.OS == 'android' && 31 <= Platform.Version) {
      if (interfaceType == InterfaceType.Bluetooth || settings.autoSwitchInterface == true) {
        const hasPermission = await confirmBluetoothPermission()

        if (!hasPermission) {
          showToast(
            ToastType.Error,
            t('PRINTER_PERMISSION_DENIED', 'Bluetooth permission is required to find printers.'),
            3000
          )
          return false
        }
      }
    }

    return createReceipt(settings, image, commandsText, showAlert, ticketWidth)
  }

  const createReceipt = async (
    settings: any,
    image: any,
    commandsText: any,
    showAlert: boolean,
    ticketWidth?: number
  ) => {
    const printer = new StarPrinter(settings)
    let success = false

    try {
      const builder = new StarXpandCommand.StarXpandCommandBuilder()
      builder.addDocument(new StarXpandCommand.DocumentBuilder()
        .addPrinter(new StarXpandCommand.PrinterBuilder()
          .styleAlignment(StarXpandCommand.Printer.Alignment.Left)
        [commandsText ? 'actionPrintText' : 'actionPrintImage'](commandsText ?? new StarXpandCommand.Printer.ImageParameter(image, ticketWidth ?? textProps.ticketWidth))
          .actionCut(StarXpandCommand.Printer.CutType.Partial)
        )
      )

      const commands = await builder.getCommands()

      await printer.open()
      await printer.print(commands)

      showAlert && showToast(ToastType.Info, t('ORDER_PRINTED_SUCCESS', 'Order printed'), 3000)
      success = true
    } catch (error) {
      // Always surface errors in a multi-printer run. Success is decided by TicketPreview.
      showToast(ToastType.Error, t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed'), 3000)
    } finally {
      await printer.close()
      await printer.dispose()
    }

    return success
  }

  const createBitmapFromText = async (
    text: string,
    canvas: any,
    ctx: any,
    fontSize?: number,
    ticketWidth?: number
  ): Promise<string> => {
    if (!text || !canvas || !ctx) return ''

    const lines = text.split("\n")
    const printHeight = (fontSize ?? textProps.fontSize) * (lines.length - 1) * 1.5

    if (canvas.current) {
      canvas.current.width = ticketWidth ?? textProps.ticketWidth
      canvas.current.height = printHeight
    }

    ctx.current.clearRect(0, 0, ticketWidth ?? textProps.ticketWidth, printHeight)
    let y = (fontSize ?? textProps.fontSize)

    ctx.current.textAlign = "left";
    ctx.current.font = (fontSize ?? textProps.fontSize) + "px monospace";

    for (let i = 0; i < lines.length; i++) {
      ctx.current.fillText(lines[i], 0, y)
      y += (fontSize ?? textProps.fontSize) * 1.5
    }

    let imageBase64 = ""

    if (canvas.current) {
      const imageDataURL: string = await canvas.current.toDataURL('image/png')
      imageBase64 = imageDataURL.substring(imageDataURL.indexOf(",") + 1, imageDataURL.length - 1)
    }

    return imageBase64
  }

  return { generateCommands, printButton, createBitmapFromText, discoveryPrinterPort }
}
