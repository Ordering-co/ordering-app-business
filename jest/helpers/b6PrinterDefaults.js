/**
 * Defaults for B6 printer UI smoke tests.
 */
/* eslint-env jest */

const navigationDefaults = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true)
}

const samplePrinterBt = {
  model: 'mPOP',
  driver: 'star',
  emulation: 'StarPRNT',
  printMode: 'append',
  type: 1,
  nickname: 'Kitchen printer',
  ip: '',
  portName1: '00:11:62:06:CA:4D',
  bt: '00:11:62:06:CA:4D',
  portName: '00:11:62:06:CA:4D'
}

const samplePrinterLan = {
  model: 'TSP100',
  driver: 'star',
  emulation: 'StarGraphic',
  printMode: 'appendBitmapText',
  type: 2,
  nickname: 'Front counter',
  ip: '192.168.1.50',
  portName1: '',
  bt: '',
  portName: '192.168.1.50'
}

const samplePrinterEpsonLan = {
  model: 'TM-T20III',
  driver: 'epson',
  printMode: 'append',
  type: 2,
  nickname: 'Epson kitchen',
  ip: '192.168.1.80',
  portName1: '',
  bt: '',
  portName: '192.168.1.80'
}

const samplePrinterEpsonBt = {
  model: 'TM-m30II',
  driver: 'epson',
  printMode: 'append',
  type: 1,
  nickname: 'Epson BT',
  ip: '',
  portName1: '00:22:15:7D:70:9C',
  bt: '00:22:15:7D:70:9C',
  portName: '00:22:15:7D:70:9C'
}

const printersListDefaults = {
  list: [samplePrinterBt]
}

const printerSettingsDefaults = {
  navigation: navigationDefaults,
  onClose: jest.fn()
}

const printerEditionAddDefaults = {
  printer: null,
  printersList: { list: [] },
  handleChangePrinter: jest.fn(),
  onClose: jest.fn()
}

const printerEditionEditDefaults = {
  printer: { ...samplePrinterBt, index: 0 },
  printersList: printersListDefaults,
  handleChangePrinter: jest.fn(),
  onClose: jest.fn()
}

const sampleTicketOrder = {
  id: 42,
  orderStatus: 'ACCEPTED',
  delivery_type: 1,
  delivery_datetime: '2026-01-01T12:00:00Z',
  delivery_datetime_utc: '2026-01-01T12:00:00Z',
  comment: null,
  currency: 'USD',
  tax_type: 1,
  tax: 0,
  discount: 0,
  offer_type: null,
  offer_rate: 0,
  cash: 0,
  driver_tip: 0,
  totalDriverTip: 0,
  taxes: [],
  fees: [],
  offers: [],
  payment_events: [
    {
      event: 'payment',
      amount: 15.5,
      paymethod: { gateway: 'cash', name: 'Cash' }
    }
  ],
  summary: {
    subtotal: 12,
    tax: 0,
    discount: 0,
    service_fee: 0,
    delivery_price: 2.5,
    driver_tip: 1,
    total: 15.5
  },
  customer: {
    name: 'Jane',
    middle_name: '',
    lastname: 'Doe',
    second_lastname: '',
    email: 'jane@example.com',
    cellphone: '5551112222',
    phone: null,
    address: '456 Customer Ave',
    internal_number: '2B',
    address_notes: '',
    zipcode: '10002'
  },
  business: {
    name: 'Store A',
    email: 'store@example.com',
    cellphone: '5550001111',
    phone: null,
    address: '123 Main St',
    address_notes: ''
  },
  products: [
    {
      quantity: 1,
      name: 'Cheeseburger',
      total: 12,
      ingredients: [],
      options: [],
      comment: null
    }
  ],
  delivery_option: null,
  paymethod: { gateway: 'cash', name: 'Cash' }
}

const ticketPreviewDefaults = {
  navigation: navigationDefaults,
  order: sampleTicketOrder,
  printerSettings: [
    {
      portName: samplePrinterBt.portName,
      type: 1,
      driver: samplePrinterBt.driver,
      model: samplePrinterBt.model,
      ip: samplePrinterBt.ip,
      printMode: 'append'
    }
  ]
}

const usePrinterCommandsMockApi = {
  generateCommands: jest.fn((order) =>
    order ? `Order No. ${order.id}\nACCEPTED\n` : '\n'
  ),
  createBitmapFromText: jest.fn(async () => 'dGVzdA=='),
  printButton: jest.fn(async () => true),
  discoveryPrinterPort: jest.fn(async () => [
    {
      connectionSettings: {
        identifier: '00:11:62:06:CA:4D'
      }
    }
  ])
}

module.exports = {
  navigationDefaults,
  samplePrinterBt,
  samplePrinterLan,
  samplePrinterEpsonLan,
  samplePrinterEpsonBt,
  printersListDefaults,
  printerSettingsDefaults,
  printerEditionAddDefaults,
  printerEditionEditDefaults,
  sampleTicketOrder,
  ticketPreviewDefaults,
  usePrinterCommandsMockApi
}
