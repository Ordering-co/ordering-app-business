/**
 * Native mocks for B6 printer UI tests.
 * Import as the first line in each B6 test file.
 */
/* eslint-env jest */

jest.mock('react-native-vector-icons/SimpleLineIcons', () => 'Icon')
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')
jest.mock('react-native-vector-icons/Feather', () => 'Icon')
jest.mock('react-native-vector-icons/FontAwesome', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props) =>
    React.createElement(
      Pressable,
      { testID: `fa-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return ({ data, defaultButtonText, onSelect, buttonTextAfterSelection }) =>
    React.createElement(
      View,
      { testID: 'select-dropdown' },
      React.createElement(Text, { testID: 'select-dropdown-label' }, defaultButtonText),
      (data || []).map((item, index) =>
        React.createElement(
          TouchableOpacity,
          {
            key: String(index),
            testID: `select-option-${index}`,
            onPress: () => onSelect?.(item, index)
          },
          React.createElement(
            Text,
            null,
            buttonTextAfterSelection?.(item) ?? item?.model ?? String(item)
          )
        )
      )
    )
})

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
