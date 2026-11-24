/**
 * Native mocks for the printing tests (canvas, Epson, BLE, the PDF and system print libraries).
 * Import as the first line in each printing test file.
 */
/* eslint-env jest */

jest.mock('react-native-canvas', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Canvas = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      width: 576,
      height: 100,
      getContext: () => ({
        clearRect: jest.fn(),
        fillText: jest.fn(),
        textAlign: 'left',
        font: '14px monospace'
      }),
      toDataURL: jest.fn(async () => 'data:image/png;base64,dGVzdA==')
    }))
    return React.createElement(View, { testID: 'rn-canvas', ...props })
  })
  return { __esModule: true, default: Canvas }
})

jest.mock('react-native-esc-pos-printer', () => {
  const instances = []
  class Printer {
    constructor ({ target, deviceName }) {
      this.target = target
      this.deviceName = deviceName
      instances.push(this)
    }

    connect = jest.fn(async () => {})
    addTextAlign = jest.fn(async () => {})
    addText = jest.fn(async () => {})
    addFeedLine = jest.fn(async () => {})
    addCut = jest.fn(async () => {})
    sendData = jest.fn(async () => {})
    disconnect = jest.fn(async () => {})
    addQueueTask = jest.fn(async (task) => task())
  }
  Printer.__instances = instances

  const discoveryListeners = {
    discovery: [],
    error: [],
    status: []
  }

  const PrintersDiscovery = {
    start: jest.fn(async () => {
      discoveryListeners.status.forEach((cb) => cb('discovering'))
      discoveryListeners.status.forEach((cb) => cb('inactive'))
    }),
    stop: jest.fn(async () => {
      discoveryListeners.status.forEach((cb) => cb('inactive'))
    }),
    pairBluetoothDevice: jest.fn(async () => {}),
    onDiscovery: jest.fn((cb) => {
      discoveryListeners.discovery.push(cb)
      return () => {
        discoveryListeners.discovery = discoveryListeners.discovery.filter((x) => x !== cb)
      }
    }),
    onError: jest.fn((cb) => {
      discoveryListeners.error.push(cb)
      return () => {
        discoveryListeners.error = discoveryListeners.error.filter((x) => x !== cb)
      }
    }),
    onStatusChange: jest.fn((cb) => {
      discoveryListeners.status.push(cb)
      return () => {
        discoveryListeners.status = discoveryListeners.status.filter((x) => x !== cb)
      }
    }),
    __listeners: discoveryListeners,
    __emitDiscovery: (printers) => {
      discoveryListeners.discovery.forEach((cb) => cb(printers))
    },
    __emitError: (error) => {
      discoveryListeners.error.forEach((cb) => cb(error))
    }
  }

  return {
    Printer,
    PrinterConstants: {
      ALIGN_LEFT: 0,
      CUT_FEED: 0,
      TRUE: 1,
      FALSE: 0
    },
    PrintersDiscovery,
    DiscoveryFilterOption: {
      PORTTYPE_ALL: 0,
      PORTTYPE_TCP: 1,
      PORTTYPE_BLUETOOTH: 2,
      PORTTYPE_USB: 3,
      PORTTYPE_BLUETOOTH_LE: 4
    }
  }
})

jest.mock('react-native-star-io10', () => {
  class StarConnectionSettings {
    constructor () {
      this.interfaceType = null
      this.identifier = null
      this.autoSwitchInterface = false
    }
  }
  class StarPrinter {
    constructor (settings) {
      this.settings = settings
      this.connectionSettings = settings
    }

    open = jest.fn(async () => {})
    print = jest.fn(async () => {})
    close = jest.fn(async () => {})
    dispose = jest.fn(async () => {})
  }
  const manager = {
    discoveryTime: 1000,
    onPrinterFound: null,
    onDiscoveryFinished: null,
    stopDiscovery: jest.fn(async () => {}),
    startDiscovery: jest.fn(async () => {})
  }
  return {
    InterfaceType: { Bluetooth: 'Bluetooth', Lan: 'Lan' },
    StarConnectionSettings,
    StarPrinter,
    StarDeviceDiscoveryManager: {},
    StarDeviceDiscoveryManagerFactory: {
      create: jest.fn(async () => manager)
    },
    StarXpandCommand: {
      StarXpandCommandBuilder: class {
        addDocument () { return this }
        async getCommands () { return [] }
      },
      DocumentBuilder: class {
        addPrinter () { return this }
      },
      PrinterBuilder: class {
        styleAlignment () { return this }
        actionPrintText () { return this }
        actionPrintImage () { return this }
        actionCut () { return this }
      },
      Printer: {
        Alignment: { Left: 'Left' },
        CutType: { Partial: 'Partial' },
        ImageParameter: class {
          constructor (image, width) {
            this.image = image
            this.width = width
          }
        }
      }
    }
  }
})

jest.mock('react-native-ble-plx', () => {
  const defaults = () => ({
    state: 'PoweredOn',
    scanResults: [],
    services: [],
    characteristics: [],
    mtu: 23,
    discoveredMtu: null,
    connectError: null,
    writeError: null,
    hangAfterWrites: null,
    writes: [],
    events: [],
    cancelledAt: []
  })
  const mock = {
    ...defaults(),
    reset () {
      Object.assign(mock, defaults())
    }
  }

  const write = (withResponse) => jest.fn(async (deviceId, serviceUUID, uuid, base64) => {
    if (mock.writeError) throw mock.writeError
    if (mock.hangAfterWrites !== null && mock.writes.length >= mock.hangAfterWrites) {
      await new Promise(() => {})
    }
    mock.writes.push({ deviceId, serviceUUID, uuid, base64, withResponse, at: Date.now() })
  })

  class BleManager {
    state = jest.fn(async () => mock.state)
    onStateChange = jest.fn((listener, emitCurrentState) => {
      if (emitCurrentState) listener(mock.state)
      return { remove: jest.fn() }
    })

    startDeviceScan = jest.fn((uuids, options, listener) => {
      mock.events.push('scan')
      mock.scanResults.forEach((device) => listener(null, device))
    })

    stopDeviceScan = jest.fn()
    connectToDevice = jest.fn(async (deviceId, options) => {
      mock.events.push(`connect:${deviceId}`)
      if (mock.connectError) throw mock.connectError
      const device = {
        id: deviceId,
        mtu: mock.mtu,
        options,
        discoverAllServicesAndCharacteristics: jest.fn(async () => ({ ...device, mtu: mock.discoveredMtu ?? device.mtu }))
      }
      return device
    })

    servicesForDevice = jest.fn(async () => mock.services)
    characteristicsForDevice = jest.fn(async (deviceId, serviceUUID) =>
      mock.characteristics.filter((characteristic) => characteristic.serviceUUID === serviceUUID)
    )

    writeCharacteristicWithoutResponseForDevice = write(false)
    writeCharacteristicWithResponseForDevice = write(true)
    cancelDeviceConnection = jest.fn(async (deviceId) => {
      mock.events.push(`cancel:${deviceId}`)
      mock.cancelledAt.push(Date.now())
    })
  }

  return {
    BleManager,
    State: {
      Unknown: 'Unknown',
      Resetting: 'Resetting',
      Unsupported: 'Unsupported',
      Unauthorized: 'Unauthorized',
      PoweredOff: 'PoweredOff',
      PoweredOn: 'PoweredOn'
    },
    __mock: mock
  }
})

// The ticket as a document (`src/printing/document.ts`): the PDF maker and the system print dialog.
jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn().mockResolvedValue({ filePath: '/tmp/order_42.pdf' })
}))

jest.mock('react-native-print', () => ({
  __esModule: true,
  default: { print: jest.fn().mockResolvedValue(undefined) }
}))
