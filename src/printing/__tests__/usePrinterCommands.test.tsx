import '../../../jest/helpers/registerB6PrinterMocks'

import { Platform } from 'react-native'
import { renderHook } from '@testing-library/react-native'

const mockShowToast = jest.fn()
const mockPrintEpsonLan = jest.fn()
const mockPrintEpsonBluetooth = jest.fn()
const mockPrintEpsonUsb = jest.fn()
const mockDiscoverEpsonPrinters = jest.fn()
const mockPickEpsonDiscoveryIdentifier = jest.fn((printer, type) =>
  type === 2 ? printer.ipAddress : type === 3 ? printer.target : printer.bdAddress
)

jest.mock('../EpsonPrinterAdapter', () => ({
  printEpsonLan: (...args: any[]) => mockPrintEpsonLan(...args),
  printEpsonBluetooth: (...args: any[]) => mockPrintEpsonBluetooth(...args),
  printEpsonUsb: (...args: any[]) => mockPrintEpsonUsb(...args),
  discoverEpsonPrinters: (...args: any[]) => mockDiscoverEpsonPrinters(...args),
  pickEpsonDiscoveryIdentifier: (...args: any[]) => mockPickEpsonDiscoveryIdentifier(...args)
}))

const mockPrintGenericBle = jest.fn()
const mockDiscoverGenericBlePrinters = jest.fn()

jest.mock('../GenericBlePrinterAdapter', () => ({
  printGenericBle: (...args: any[]) => mockPrintGenericBle(...args),
  discoverGenericBlePrinters: (...args: any[]) => mockDiscoverGenericBlePrinters(...args)
}))

jest.mock('@components', () => {
  const mockOrdering = require('../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useToast: () => [null, { showToast: mockShowToast }],
    useUtils: jest.fn(() => [{
      parsePrice: (v: any) => `$${Number(v ?? 0).toFixed(2)}`,
      parseNumber: (v: any) => Number(v ?? 0),
      parseDate: (v: any) => String(v ?? '')
    }, {}])
  }
})

import { usePrinterCommands } from '../usePrinterCommands'

describe('usePrinterCommands printButton routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrintEpsonLan.mockResolvedValue({ ok: true })
    mockPrintEpsonBluetooth.mockResolvedValue({ ok: true })
    mockPrintEpsonUsb.mockResolvedValue({ ok: true })
    mockDiscoverEpsonPrinters.mockResolvedValue({ ok: true, printers: [] })
  })

  it('routes epson LAN (type 2) to printEpsonLan', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 2,
      portName: '192.168.1.80',
      ip: '192.168.1.80',
      deviceName: 'TM-T20III',
      commandsText: 'Order No. 1\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintEpsonLan).toHaveBeenCalledWith({
      ip: '192.168.1.80',
      deviceName: 'TM-T20III',
      text: 'Order No. 1\n'
    })
    expect(mockPrintEpsonBluetooth).not.toHaveBeenCalled()
  })

  it('routes epson Bluetooth (type 1) to printEpsonBluetooth', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 1,
      portName: '00:22:15:7D:70:9C',
      deviceName: 'TM-m30II',
      commandsText: 'Order No. 2\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintEpsonBluetooth).toHaveBeenCalledWith({
      address: '00:22:15:7D:70:9C',
      deviceName: 'TM-m30II',
      text: 'Order No. 2\n'
    })
  })

  it('routes epson USB (type 3) to printEpsonUsb on Android', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'android'
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 3,
      portName: 'USB:000000000000000000',
      deviceName: 'TM-T20III',
      commandsText: 'USB ticket\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintEpsonUsb).toHaveBeenCalledWith({
      target: 'USB:000000000000000000',
      deviceName: 'TM-T20III',
      text: 'USB ticket\n'
    })
    Platform.OS = originalOs
  })

  it('blocks epson USB on iOS', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'ios'
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 3,
      portName: 'USB',
      commandsText: 'x',
      showAlert: true
    })

    expect(ok).toBe(false)
    expect(mockPrintEpsonUsb).not.toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'USB printing is available on Android only.',
      3000
    )
    Platform.OS = originalOs
  })

  it('does not call epson adapter for star printers', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    await result.current.printButton({
      driver: 'star',
      type: 2,
      portName: '192.168.1.50',
      commandsText: 'Order\n',
      showAlert: false
    })

    expect(mockPrintEpsonLan).not.toHaveBeenCalled()
    expect(mockPrintEpsonBluetooth).not.toHaveBeenCalled()
    expect(mockPrintEpsonUsb).not.toHaveBeenCalled()
  })

  it('passes the configured paper width to Star bitmap printing', async () => {
    const { StarXpandCommand } = require('react-native-star-io10')
    const OriginalImageParameter = StarXpandCommand.Printer.ImageParameter
    const ImageParameter = jest.fn().mockImplementation((image, width) => ({ image, width }))
    StarXpandCommand.Printer.ImageParameter = ImageParameter
    const { result } = renderHook(() => usePrinterCommands())

    await result.current.printButton({
      driver: 'star',
      type: 2,
      portName: '192.168.1.50',
      image: 'dGVzdA==',
      commandsText: null,
      ticketWidth: 384,
      showAlert: false
    })

    expect(ImageParameter).toHaveBeenCalledWith('dGVzdA==', 384)
    StarXpandCommand.Printer.ImageParameter = OriginalImageParameter
  })

  it('maps epson discovery permission errors', async () => {
    mockDiscoverEpsonPrinters.mockResolvedValue({
      ok: false,
      printers: [],
      errorKey: 'PRINTER_PERMISSION_DENIED'
    })
    const { result } = renderHook(() => usePrinterCommands())

    const discovery = await result.current.discoveryPrinterPort(1, 'epson')
    expect(discovery).toBe('Bluetooth permission is required to find printers.')
  })

  it('always toasts epson errors even when showAlert is false', async () => {
    mockPrintEpsonLan.mockResolvedValue({
      ok: false,
      errorKey: 'PRINTER_NO_PAPER'
    })
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 2,
      portName: '192.168.1.80',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Printer is out of paper.',
      3000
    )
  })

  it('toasts epson USB iOS errors even when showAlert is false', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'ios'
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 3,
      portName: 'USB',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'USB printing is available on Android only.',
      3000
    )
    Platform.OS = originalOs
  })

  it('toasts star bluetooth permission deny even when showAlert is false', async () => {
    const { PermissionsAndroid } = require('react-native')
    const originalOs = Platform.OS
    const originalVersion = Platform.Version
    Platform.OS = 'android'
    Object.defineProperty(Platform, 'Version', { configurable: true, value: 31 })
    const checkSpy = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false)
    const requestSpy = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('denied')

    const { result } = renderHook(() => usePrinterCommands())
    const ok = await result.current.printButton({
      driver: 'star',
      type: 1,
      portName: '00:11:62:06:CA:4D',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Bluetooth permission is required to find printers.',
      3000
    )

    checkSpy.mockRestore()
    requestSpy.mockRestore()
    Platform.OS = originalOs
    Object.defineProperty(Platform, 'Version', { configurable: true, value: originalVersion })
  })
})

describe('usePrinterCommands generic ESC/POS routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrintGenericBle.mockResolvedValue({ ok: true })
    mockDiscoverGenericBlePrinters.mockResolvedValue({ ok: false, devices: [], errorKey: 'NO_PRINTERS_FOUND' })
  })

  it('prints generic bluetooth printers through printGenericBle', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'generic',
      type: 1,
      portName: 'dev-1',
      commandsText: 'Order No. 3\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintGenericBle).toHaveBeenCalledWith({ deviceId: 'dev-1', text: 'Order No. 3\n' })
    expect(mockPrintEpsonBluetooth).not.toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith('info', 'Order printed', 3000)
  })

  it('tells the generic adapter how many columns the paper holds', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    await result.current.printButton({
      driver: 'generic',
      type: 1,
      portName: 'dev-1',
      commandsText: 'x',
      ticketWidth: 384,
      showAlert: false
    })

    expect(mockPrintGenericBle).toHaveBeenCalledWith({ deviceId: 'dev-1', text: 'x', columns: 32 })
  })

  it('toasts the bluetooth-off message and returns false', async () => {
    mockPrintGenericBle.mockResolvedValue({ ok: false, errorKey: 'PRINTER_BLUETOOTH_OFF' })
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'generic',
      type: 1,
      portName: 'dev-1',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Bluetooth is off. Turn it on and try again.',
      3000
    )
  })

  it('toasts the not-writable message when the device does not accept data', async () => {
    mockPrintGenericBle.mockResolvedValue({ ok: false, errorKey: 'PRINTER_NOT_WRITABLE' })
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'generic',
      type: 1,
      portName: 'dev-1',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'This device does not accept print data. Choose another printer.',
      3000
    )
  })

  it('rejects non-bluetooth generic printers without calling the adapter', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'generic',
      type: 2,
      ip: '192.168.1.80',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockPrintGenericBle).not.toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith('error', 'Order not printed, connection failed', 3000)
  })

  it('maps discovered generic devices to identifier, name and signal', async () => {
    mockDiscoverGenericBlePrinters.mockResolvedValue({
      ok: true,
      devices: [{ id: 'dev-1', name: 'MPT-II', rssi: -60 }]
    })
    const { result } = renderHook(() => usePrinterCommands())

    const printers = await result.current.discoveryPrinterPort(1, 'generic')

    expect(printers).toEqual([
      { connectionSettings: { identifier: 'dev-1' }, deviceName: 'MPT-II', rssi: -60 }
    ])
  })

  it('returns the translated reason when generic discovery fails', async () => {
    mockDiscoverGenericBlePrinters.mockResolvedValue({ ok: false, devices: [], errorKey: 'PRINTER_BLUETOOTH_OFF' })
    const { result } = renderHook(() => usePrinterCommands())

    const printers = await result.current.discoveryPrinterPort(1, 'generic')

    expect(printers).toBe('Bluetooth is off. Turn it on and try again.')
  })
})

describe('usePrinterCommands generic ticket empty values', () => {
  const baseOrder = {
    id: 265,
    orderStatus: 'Preparation completed',
    products: [],
    payment_events: [
      { event: 'payment', amount: 185, paymethod: { gateway: 'cash', name: 'Cash' } }
    ],
    taxes: [],
    fees: [],
    delivery_type: 1,
    customer: { name: 'Axel', address: 'Hermanos Flores Magon 17' },
    business: { name: 'Taqueria San Francisco', email: 'store@example.com' },
    summary: { subtotal: 160, total: 185, delivery_price: 25 }
  }

  it('never prints null or undefined for missing customer and business data', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateGenericCommands({
      ...baseOrder,
      customer: {
        name: 'Axel',
        email: null,
        cellphone: '',
        phone: 'null',
        address: 'Hermanos Flores Magon 17',
        internal_number: null,
        address_notes: '   ',
        zipcode: undefined
      },
      business: {
        name: 'Taqueria San Francisco',
        email: null,
        cellphone: null,
        phone: 'undefined',
        address: null,
        address_notes: null
      }
    })

    expect(ticket).not.toMatch(/null|undefined/i)
    expect(ticket).not.toContain('Email:')
    expect(ticket).not.toContain('Mobile Phone:')
    expect(ticket).not.toContain('Business Phone:')
    expect(ticket).not.toContain('Zipcode:')
    expect(ticket).toContain('Full Name: Axel')
    expect(ticket).toContain('Taqueria San Francisco')
  })

  it('skips the full name line when the customer has no name', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateGenericCommands({
      ...baseOrder,
      customer: { email: 'axel@example.com' }
    })

    expect(ticket).not.toContain('Full Name:')
    expect(ticket).toContain('Email: axel@example.com')
  })

  it('skips the business name and email lines when they are missing', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateGenericCommands({
      ...baseOrder,
      business: {}
    })

    expect(ticket).not.toMatch(/null|undefined/i)
    expect(ticket).toContain('Business details')
  })

  it('skips order status, order type and payment method when missing', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateGenericCommands({
      ...baseOrder,
      orderStatus: undefined,
      delivery_type: 99,
      payment_events: []
    })

    expect(ticket).not.toMatch(/null|undefined/i)
    expect(ticket).not.toContain('Order Type:')
    expect(ticket).not.toContain('Payment method:')
  })

  it('keeps the lines that have data', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateGenericCommands(baseOrder)

    expect(ticket).toContain('Preparation completed')
    expect(ticket).toContain('Order Type: Delivery')
    expect(ticket).toContain('Payment method:')
    expect(ticket).toContain('Full Address: Hermanos Flores Magon\n17\n')
    expect(ticket).toContain('Taqueria San Francisco\nstore@example.com\n')
  })
})

describe('PrinterUtilities word wrapping for generic printers', () => {
  const { PrinterUtilities } = require('../utils')
  const words = (text: string) => text.split(/\s+/).filter(Boolean)

  it('wraps long values at whole words and keeps every line inside the paper', () => {
    const { result } = renderHook(() => PrinterUtilities({ wordWrap: true }))
    const address = 'Hermanos Flores Magon 17, San Javier, 45300 Tala, Jal., Mexico'
    const lines = `Full Address: ${result.current.parseSizeStrings(address, 'Full Address'.length, 32)}`.split('\n')

    expect(lines[0]).toBe('Full Address: Hermanos Flores')
    expect(lines.every((line: string) => line.length <= 32)).toBe(true)
    expect(words(lines.join(' ')).slice(2)).toEqual(words(address))
  })

  it('only splits a word when it is longer than a whole line', () => {
    const { result } = renderHook(() => PrinterUtilities({ wordWrap: true }))
    const lines = result.current.parseSizeStrings('A'.repeat(40), 0, 32).split('\n')

    expect(lines.every((line: string) => line.length <= 32)).toBe(true)
    expect(lines.join('')).toBe('A'.repeat(40))
  })

  it('keeps short values on one line', () => {
    const { result } = renderHook(() => PrinterUtilities({ wordWrap: true }))

    expect(result.current.parseSizeStrings('Ring the bell', 'Notes'.length, 32)).toBe('Ring the bell')
  })

  it('never glues a label to its price and never cuts the label words', () => {
    const { result } = renderHook(() => PrinterUtilities({ wordWrap: true }))
    const lines = result.current.parseCommandLine('Tarifa de entrega', '$ 35.00', 24).split('\n')
    const last = lines[lines.length - 1]

    expect(lines.every((line: string) => line.length <= 24)).toBe(true)
    expect(last.endsWith(' $ 35.00')).toBe(true)
    expect(words(lines.join(' ')).slice(0, 3)).toEqual(['Tarifa', 'de', 'entrega'])
  })

  it('keeps price lines that already fit exactly as before', () => {
    const { result } = renderHook(() => PrinterUtilities({ wordWrap: true }))

    expect(result.current.parseCommandLine('Subtotal', '$ 160.00', 32)).toBe(`Subtotal${' '.repeat(16)}$ 160.00`)
  })
})

describe('usePrinterCommands generic ticket print options', () => {
  const { DEFAULT_TICKET_PRINT_OPTIONS } = require('../ticketPrintOptions')

  const order = {
    id: 166,
    orderStatus: 'Accepted by business',
    delivery_type: 1,
    delivery_datetime: '2026-10-13 23:12:00',
    comment: 'Ring the bell',
    products: [
      {
        quantity: 2,
        name: 'Taco Blando',
        total: 40,
        ingredients: [{ name: 'Onion' }],
        options: [{ name: 'Salsa', suboptions: [{ quantity: 1, name: 'Verde', position: 'whole', price: 0 }] }],
        comment: 'No cilantro'
      }
    ],
    payment_events: [
      { event: 'payment', amount: 195, paymethod: { gateway: 'cash', name: 'Cash' } }
    ],
    taxes: [],
    fees: [],
    offers: [],
    customer: {
      name: 'Axel',
      email: 'axel@example.com',
      cellphone: '3312345678',
      address: 'Hermanos Flores Magon 17',
      internal_number: '17',
      address_notes: 'Blue door',
      zipcode: '45300'
    },
    business: {
      name: 'Taqueria San Francisco',
      email: 'store@example.com',
      cellphone: '3398765432',
      address: 'Tala, Jalisco',
      address_notes: 'Corner'
    },
    summary: { subtotal: 160, total: 195, delivery_price: 35 }
  }

  const ticketWith = (options?: any) => {
    const { result } = renderHook(() => usePrinterCommands())
    return result.current.generateGenericCommands(order, 32, options)
  }

  it('prints exactly the same ticket when every option is on', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const today = result.current.generateGenericCommands(order, 32)

    expect(ticketWith(DEFAULT_TICKET_PRINT_OPTIONS)).toBe(today)
    expect(today).toContain('Payments')
    expect(today).toContain('Customer details')
  })

  it('hides the header fields that are turned off', () => {
    const ticket = ticketWith({
      ...DEFAULT_TICKET_PRINT_OPTIONS,
      orderStatus: false,
      orderType: false,
      paymentMethod: false,
      deliveryDate: false
    })

    expect(ticket).toContain('Order No. 166')
    expect(ticket).not.toContain('Accepted by business')
    expect(ticket).not.toContain('Order Type:')
    expect(ticket).not.toContain('Payment method:')
    expect(ticket).not.toContain('Delivery Date:')
    expect(ticket).not.toMatch(/-{32}\n-{32}\n/)
  })

  it('hides the whole customer section', () => {
    const ticket = ticketWith({ ...DEFAULT_TICKET_PRINT_OPTIONS, customerSection: false })

    expect(ticket).not.toContain('Customer details')
    expect(ticket).not.toContain('Axel')
    expect(ticket).not.toContain('Hermanos Flores Magon')
    expect(ticket).toContain('Business details')
    expect(ticket).not.toMatch(/-{32}\n-{32}\n/)
  })

  it('hides single customer fields and keeps the rest', () => {
    const ticket = ticketWith({
      ...DEFAULT_TICKET_PRINT_OPTIONS,
      customerEmail: false,
      customerPhones: false,
      customerInternalNumber: false,
      customerAddressNotes: false,
      customerZipcode: false
    })

    expect(ticket).toContain('Full Name: Axel')
    expect(ticket).toContain('Full Address: Hermanos')
    expect(ticket).not.toContain('axel@example.com')
    expect(ticket).not.toContain('3312345678')
    expect(ticket).not.toContain('Internal Number:')
    expect(ticket).not.toContain('Blue door')
    expect(ticket).not.toContain('Zipcode:')
  })

  it('hides the whole business section or single business fields', () => {
    const noSection = ticketWith({ ...DEFAULT_TICKET_PRINT_OPTIONS, businessSection: false })
    const someFields = ticketWith({
      ...DEFAULT_TICKET_PRINT_OPTIONS,
      businessEmail: false,
      businessPhones: false,
      businessAddressNotes: false
    })

    expect(noSection).not.toContain('Business details')
    expect(noSection).not.toContain('Taqueria San Francisco')
    expect(someFields).toContain('Taqueria San Francisco')
    expect(someFields).toContain('Address: Tala, Jalisco')
    expect(someFields).not.toContain('store@example.com')
    expect(someFields).not.toContain('3398765432')
    expect(someFields).not.toContain('Corner')
  })

  it('hides product extras but always keeps the product lines', () => {
    const ticket = ticketWith({
      ...DEFAULT_TICKET_PRINT_OPTIONS,
      orderComment: false,
      productIngredients: false,
      productOptions: false,
      productComments: false
    })

    expect(ticket).toContain('2  Taco Blando')
    expect(ticket).not.toContain('Ring the bell')
    expect(ticket).not.toContain('Ingredients')
    expect(ticket).not.toContain('Salsa')
    expect(ticket).not.toContain('No cilantro')
  })

  it('hides the totals breakdown and payments but always keeps the total', () => {
    const ticket = ticketWith({ ...DEFAULT_TICKET_PRINT_OPTIONS, totalsBreakdown: false, payments: false })

    expect(ticket).not.toContain('Subtotal')
    expect(ticket).not.toContain('Delivery Fee')
    expect(ticket).not.toContain('Payments')
    expect(ticket).toContain('Total')
    expect(ticket).toContain('$195.00')
    expect(ticket).not.toMatch(/-{32}\n-{32}\n/)
  })
})

describe('usePrinterCommands generateCommands offer targets', () => {
  const baseOrder = {
    id: 101,
    products: [],
    payment_events: [],
    taxes: [],
    fees: [],
    delivery_type: 1,
    customer: {},
    business: {},
    summary: {
      subtotal: 20,
      total: 15,
      delivery_price: 3
    }
  }

  it('prints delivery-target discount amounts instead of product offers', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateCommands({
      ...baseOrder,
      offers: [
        {
          name: 'Product Promo',
          target: 1,
          rate_type: 2,
          summary: { discount: 2 }
        },
        {
          name: 'Free Delivery',
          target: 3,
          rate_type: 2,
          summary: { discount: 5 }
        }
      ]
    })

    expect(ticket).toContain('Free Delivery')
    expect(ticket).toContain('- $5.00')
    expect(ticket).toContain('Product Promo')
    expect(ticket).toContain('- $2.00')
    expect(ticket.split('Product Promo')).toHaveLength(2)
  })

  it('prints a delivery-only offer when no product offers exist', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateCommands({
      ...baseOrder,
      offers: [
        {
          name: 'Free Delivery',
          target: 3,
          rate_type: 2,
          summary: { discount: 5 }
        }
      ]
    })

    expect(ticket).toContain('Free Delivery')
    expect(ticket).toContain('- $5.00')
    expect(ticket).not.toContain('Product Promo')
  })
})

describe('PrinterUtilities breaks a long value at whole words on every printer (Star and Epson too)', () => {
  const { PrinterUtilities } = require('../utils')

  it('never cuts a word in two nor leaves a letter alone on a line (an address, the delivery date)', () => {
    const { result } = renderHook(() => PrinterUtilities())
    const address = 'Cra. 64 # 64-95, Nte. Centro Historico, Barranquilla, Atlantico, Colombia'
    const lines = `Full Address: ${result.current.parseSizeStrings(address, 'Full Address'.length, 38)}`.split('\n')
    expect(lines.every((line: string) => line.length <= 38)).toBe(true)
    expect(lines.join(' ')).toBe(`Full Address: ${address}`)

    const date = 'ASAP(01/09/2026 02:01 PM)'
    const dateLines = `Delivery Date: ${result.current.parseSizeStrings(date, 'Delivery Date'.length, 38)}`.split('\n')
    expect(dateLines).toEqual(['Delivery Date: ASAP(01/09/2026 02:01', 'PM)'])
    expect(dateLines.every((line: string) => line.length <= 38)).toBe(true)
  })

  it('keeps a value that fits on its line', () => {
    const { result } = renderHook(() => PrinterUtilities())
    expect(result.current.parseSizeStrings('Ring the bell', 'Notes'.length, 38)).toBe('Ring the bell')
  })
})
