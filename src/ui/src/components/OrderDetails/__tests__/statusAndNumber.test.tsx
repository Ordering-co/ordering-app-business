import React from 'react'
import { StyleSheet } from 'react-native'
import { renderHook } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { StatusRow } from '../StatusRow'
import { statusLabel } from '../orderStages'
import { orderNumberText } from '../orderData'
import { useOrderNumberText } from '../useOrderNumberText'
import { buildOrderCopyText } from '../copyText'

const components = require('@components')
const catalog = require('../../../../../../i18n/translations.json')

const NOW = Date.parse('2026-11-19T12:26:00Z')

describe('statusLabel: the one name of a status', () => {
  const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]

  it('names every status id with a key of the catalog, never the bare number', () => {
    for (const id of ids) {
      const keys: string[] = []
      const label = statusLabel(id, (key: string, fallback: string) => { keys.push(key); return fallback }, undefined)
      expect(label).not.toBe(String(id))
      expect(label.length).toBeGreaterThan(0)
      expect(keys.length).toBeGreaterThan(0)
      for (const key of keys) expect(catalog[key]?.en).toBeDefined()
    }
  })

  it('reads status 4 "Ready for pickup" and a reservation still waiting "Reservation"', () => {
    const t = (_key: string, fallback: string) => fallback
    expect(statusLabel(4, t)).toBe('Ready for pickup')
    expect(statusLabel('4', t)).toBe('Ready for pickup')
    expect(statusLabel(13, t, { delivery_type: 9 })).toBe('Reservation')
    expect(statusLabel(13, t, { delivery_type: 1 })).not.toBe('Reservation')
  })
})

describe('the order number', () => {
  const t = (_key: string, fallback: string) => fallback

  it('is "Order #N" with the number the project shows', () => {
    expect(orderNumberText({ id: 1053 }, t)).toBe('Order #1053')
    expect(orderNumberText({ id: 1053, external_id: 'EXT-9' }, t, {})).toBe('Order #1053')
    expect(orderNumberText({ id: 1053, external_id: 'EXT-9' }, t, { change_order_id: { value: '1' } })).toBe('Order #EXT-9')
    expect(orderNumberText({ id: 1053 }, t, { change_order_id: { value: '1' } })).toBe('Order #1053')
  })

  it('is bound to the project\'s config by the hook', () => {
    components.useConfig.mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
    const { result } = renderHook(() => useOrderNumberText())
    expect(result.current({ id: 5, external_id: 'X-5' })).toBe('Order #X-5')
  })

  it('is the number the copied text carries', () => {
    const text = buildOrderCopyText({
      order: { id: 5, external_id: 'X-5', status: 4, products: [], summary: {}, business: {}, customer: {}, paymethod: {} },
      t,
      parsePrice: (value: number) => `$${value}`,
      hideCustomerContact: false,
      configs: { change_order_id: { value: '1' } }
    })
    expect(text).toContain('Order #X-5 is Ready for pickup')
  })
})

describe('the status row', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
    components.useUtils.mockReturnValue([{ parseDate: (value: string) => value, timeFormat: 'HH:mm' }, {}])
  })
  afterEach(() => { jest.useRealTimers() })

  const toneOf = (screen: any) => StyleSheet.flatten(screen.getByText(/Waiting/).props.style).color

  it('wraps, and keeps the clock at the end of its line, so nothing is cut at the screen edge', () => {
    const order = { status: 0, delivery_type: 2, created_at: '2026-11-19 12:00:00' }
    const screen = renderWithProviders(<StatusRow order={order} />)
    expect(StyleSheet.flatten(screen.getByTestId('status-row').props.style).flexWrap).toBe('wrap')
    expect(StyleSheet.flatten(screen.getByTestId('status-clock').props.style).marginLeft).toBe('auto')
    // The status chip may shrink to the row (a long status name ends with an ellipsis).
    let node: any = screen.getByTestId('status-chip').parent
    let shrinks = false
    while (node && node.props.testID !== 'status-row') {
      if (StyleSheet.flatten(node.props.style)?.flexShrink === 1) shrinks = true
      node = node.parent
    }
    expect(shrinks).toBe(true)
  })

  it('says a long duration as the orders list does, and a short one in minutes', () => {
    const done = (created: string) => ({
      status: 1,
      delivery_type: 1,
      created_at: created,
      updated_at: '2026-11-19 12:25:00',
      history: [{ type: 2, created_at: '2026-11-19 07:25:00', data: [{ attribute: 'status', old: 7, new: 1 }] }]
    })
    const days = renderWithProviders(<StatusRow order={done('2026-11-18 06:00:00')} />)
    expect(days.getByText('Took 1d 6h')).toBeTruthy()
    days.unmount()
    const hours = renderWithProviders(<StatusRow order={done('2026-11-19 10:55:00')} />)
    expect(hours.getByText('Took 1h 30m')).toBeTruthy()
    hours.unmount()
    const short = renderWithProviders(<StatusRow order={done('2026-11-19 11:57:00')} />)
    expect(short.getByText('Took 28 min')).toBeTruthy()
  })

  it('colors Waiting with the card\'s one rule (clockToneOf): a new order amber unless late, a ready one muted unless at risk or late', () => {
    const toneFor = (order: any) => {
      const screen = renderWithProviders(<StatusRow order={order} />)
      const tone = toneOf(screen)
      screen.unmount()
      return tone
    }
    const fresh = { status: 0, delivery_type: 1, created_at: '2026-11-19 12:25:18' }
    const ready = { status: 4, delivery_type: 2, updated_at: '2026-11-19 12:21:30' }
    const newTones = Object.fromEntries(['in_time', 'at_risk', 'delayed', undefined].map((state) => [String(state), toneFor({ ...fresh, time_status: state })]))
    // In time (and without a state) is amber on a new order, as on the card; late is the red one.
    expect(newTones.in_time).toBe(newTones.undefined)
    expect(newTones.at_risk).toBe(newTones.in_time)
    expect(newTones.delayed).not.toBe(newTones.in_time)
    const readyTones = Object.fromEntries(['in_time', 'at_risk', 'delayed', undefined].map((state) => [String(state), toneFor({ ...ready, time_status: state })]))
    expect(readyTones.in_time).toBe(readyTones.undefined)
    expect(new Set(Object.values(readyTones)).size).toBe(3)
    // The same state on the two stages: late is the same red, at risk is the same amber.
    expect(readyTones.delayed).toBe(newTones.delayed)
    expect(readyTones.at_risk).toBe(newTones.at_risk)
  })
})
