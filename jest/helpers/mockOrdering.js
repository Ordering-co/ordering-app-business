/**
 * Stable @components hook mocks for page/UI tests.
 */
const t = (_key, fallback) => fallback ?? _key

const languageState = { loading: false, dictionary: {} }
const configState = { loading: false, configs: {} }
const sessionState = { auth: false, user: null, token: null }
const orderState = { loading: false, carts: [], options: {} }
const toastFns = { showToast: jest.fn(), hideToast: jest.fn() }
// The app's event bus: what is emitted reaches what was registered with `on`, as the real emitter does.
const eventHandlers = {}
const eventFns = {
  emit: jest.fn((name, ...data) => { (eventHandlers[name] || []).slice().forEach((handler) => handler(...data)) }),
  on: jest.fn((name, handler) => { (eventHandlers[name] = eventHandlers[name] || []).push(handler) }),
  off: jest.fn((name, handler) => { eventHandlers[name] = (eventHandlers[name] || []).filter((item) => item !== handler) })
}
const offlineFns = { addOfflineAction: jest.fn(), syncOfflineActions: jest.fn() }

const mockOrdering = {
  ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
  OrderingProvider: ({ children }) => children,
  useLanguage: jest.fn(() => [languageState, t]),
  useConfig: jest.fn(() => [configState]),
  useSession: jest.fn(() => [sessionState, { login: jest.fn(), logout: jest.fn() }]),
  useOrder: jest.fn(() => [orderState, {}]),
  useApi: jest.fn(() => [{}, {}]),
  useEvent: jest.fn(() => [eventFns]),
  useToast: jest.fn(() => [, toastFns]),
  useUtils: jest.fn(() => [{
    optimizeImage: (url) => url,
    timeFormat: 'HH:mm',
    is12Hours: false,
    preorderDateFormat: 'MM/DD',
    getMaxPreorderDays: () => 7,
    isWalletEnabled: () => true
  }, {}]),
  useWebsocket: jest.fn(() => [{ socket: null }]),
  useBusiness: jest.fn(() => [{}, {}]),
  useCustomer: jest.fn(() => [{}, {}]),
  useValidationFields: jest.fn(() => [{}, {}]),
  CODES: [{ phoneCode: 1, countryCode: 'US' }]
}

module.exports = mockOrdering
