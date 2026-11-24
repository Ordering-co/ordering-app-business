/**
 * The mocks the action sheets' tests share: the `@components` hooks over a mutable `testState`, the printing facade and
 * the map library. No app code is imported here (a mock factory that imports the app would run itself again).
 */
import React from 'react'

export const testState: any = {
  dictionary: { ESTIMATED_PREPARATION_TIME: 'Estimated preparation time: _min_ min.' } as Record<string, string>,
  configs: {},
  mapFit: jest.fn(),
  timeFormat: 'HH:mm',
  user: { id: 1, level: 0 },
  drivers: [],
  controlsError: false,
  saveResult: { content: { error: false, result: { id: 1, driver_id: 7 } } },
  printing: { host: null, autoTargets: [], printOrder: jest.fn(async () => []) },
  reviewSent: jest.fn(),
  socketHandlers: {} as any,
  fetch: jest.fn(async () => ({ json: async () => ({}) })),
  save: jest.fn(),
  controlsGet: jest.fn()
}

export const resetTestState = () => {
  testState.configs = {}
  testState.timeFormat = 'HH:mm'
  testState.mapFit = jest.fn()
  testState.user = { id: 1, level: 0 }
  testState.drivers = []
  testState.controlsError = false
  testState.saveResult = { content: { error: false, result: { id: 1, driver_id: 7 } } }
  testState.printing = { host: null, autoTargets: [], printOrder: jest.fn(async () => []) }
  testState.reviewSent = jest.fn()
  testState.socketHandlers = {}
  testState.save = jest.fn(async () => testState.saveResult)
  testState.controlsGet = jest.fn(async () => ({ content: { error: testState.controlsError, result: testState.controlsError ? ['Controls failed'] : { drivers: testState.drivers } } }))
  testState.fetch = jest.fn(async () => ({ json: async () => ({}) }))
  ;(global as any).fetch = testState.fetch
}

/** The `@components` of the tests: the ordering hooks over `testState`. */
export const componentsMock = () => {
  const React = require('react')
  const base = require('../../../../../../jest/helpers/mockOrdering')
  const ordering = {
    root: 'https://api.test',
    appId: 'app',
    appInternalName: 'business_app',
    setAccessToken: () => ({
      controls: () => ({ get: (...args: any[]) => testState.controlsGet(...args) }),
      orders: () => ({ save: (...args: any[]) => testState.save(...args) })
    })
  }
  const socket = {
    socket: {},
    getId: () => 'socket-1',
    on: (name: string, handler: any) => { testState.socketHandlers[name] = handler },
    off: (name: string) => { delete testState.socketHandlers[name] }
  }
  return {
    ...base,
    useLanguage: () => [{ loading: false, dictionary: {} }, (key: string, fallback?: string) => testState.dictionary[key] ?? fallback ?? key],
    useConfig: () => [{ loading: false, configs: testState.configs }],
    useSession: () => [{ user: testState.user, token: 'token' }, {}],
    useApi: () => [ordering],
    useWebsocket: () => socket,
    // `parseTime` answers as the logic's does in this app (no `customParseFormat`): a bare "HH:mm" is "invalid format".
    // The sheets must not depend on it: they write times with `timeFormat`.
    useUtils: () => [{ parseTime: () => 'invalid format', timeFormat: testState.timeFormat, optimizeImage: (url: string) => url }],
    // The controller of the review: its state and the request, as the UI sees them.
    ReviewCustomer: ({ UIComponent, order, ...props }: any) => {
      const [reviewState, setReviewState] = React.useState({ qualification: 0, comment: '', order_id: order?.id, user_id: order?.customer_id })
      return React.createElement(UIComponent, {
        ...props,
        order,
        reviewState,
        setReviewState,
        actionState: { loading: false, error: null },
        handleSendCustomerReview: () => testState.reviewSent(reviewState)
      })
    }
  }
}

export const mapsMock = () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ fitToCoordinates: testState.mapFit, animateCamera: jest.fn() }))
    React.useEffect(() => { props.onMapReady?.() }, [])
    return React.createElement(View, { testID: 'map-view', ...props })
  })
  const Marker = (props: any) => React.createElement(View, { testID: 'map-marker', ...props })
  return { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE: 'google' }
}

export const printingMock = () => ({ usePrinting: () => testState.printing })

