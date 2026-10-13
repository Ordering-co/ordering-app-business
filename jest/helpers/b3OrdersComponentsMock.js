/**
 * @components mock factory for B3 orders wired exports.
 */
/* eslint-env jest */

const { renderUiController } = require('./b1ShellDefaults')
const mockOrdering = require('./mockOrdering')
const b3 = require('./b3OrdersDefaults')

const eventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const getMock = (overrides = {}) => ({
  ...mockOrdering,
  useUtils: jest.fn(() => [{
    optimizeImage: (url) => url,
    parsePrice: (v) => `$${v}`,
    parseNumber: (v) => v,
    parseDate: (v) => v,
    parseDistance: (v) => `${v} mi`,
    parseTime: (v) => v,
    timeFormat: 'HH:mm',
    is12Hours: false,
    preorderDateFormat: 'MM/DD',
    getMaxPreorderDays: () => 7,
    isWalletEnabled: () => true
  }, {}]),
  useEvent: jest.fn(() => [eventEmitter]),
  useConfig: jest.fn(() => [{
    loading: false,
    configs: {
      combine_pending_and_progress_orders: { value: '0' },
      allow_save_changes_offline: { value: '0' }
    }
  }]),
  useSession: jest.fn(() => [{ auth: true, user: { id: 1 }, token: 'token' }, {}]),
  useApi: jest.fn(() => [{ ordering: { root: 'https://api.test' } }, {}]),
  OrderListGroups: renderUiController({
    ...b3.orderListGroupsDefaults,
    ordersGroup: clone(b3.ordersGroup),
    loadOrders: jest.fn(),
    loadMoreOrders: jest.fn(),
    setCurrentTabSelected: jest.fn(),
    setCurrentFilters: jest.fn(),
    onFiltered: jest.fn()
  }),
  BusinessList: renderUiController(b3.businessListDefaults),
  MainSearch: renderUiController(b3.mainSearchDefaults),
  DriverList: renderUiController(b3.driverListDefaults),
  PaymethodList: renderUiController(b3.paymethodListDefaults),
  NewOrderNotification: renderUiController(b3.newOrderNotificationDefaults),
  ...overrides
})

module.exports = { getMock, eventEmitter }
