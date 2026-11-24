import React from 'react'
import { Text } from 'react-native'
import { act, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { CHECKLIST_KEY, MAX_AGE, pruneChecklists, useChecklist } from '../useChecklist'

let api: ReturnType<typeof useChecklist>
const Probe = ({ id, enabled = true }: { id?: number, enabled?: boolean }) => {
  api = useChecklist(id, enabled)
  return <Text testID='done'>{api.done.join(',')}</Text>
}

beforeEach(async () => { await AsyncStorage.clear() })

/** Renders the probe and lets the saved list come. */
const mount = async (id: number) => {
  const view = render(<Probe id={id} />)
  await act(async () => {})
  return view
}

describe('useChecklist', () => {
  it('keeps what was checked, per order, on the device', async () => {
    const first = await mount(7)
    await act(async () => { await api.toggle(11) })
    await act(async () => { await api.toggle(12) })
    expect(first.getByTestId('done').props.children).toBe('11,12')
    first.unmount()

    const again = await mount(7)
    await waitFor(() => expect(again.getByTestId('done').props.children).toBe('11,12'))
    again.unmount()

    const other = await mount(8)
    expect(other.getByTestId('done').props.children).toBe('')
  })

  it('unchecks a line', async () => {
    const view = await mount(7)
    await act(async () => { await api.toggle(11) })
    await act(async () => { await api.toggle(11) })
    expect(view.getByTestId('done').props.children).toBe('')
    const stored = JSON.parse((await AsyncStorage.getItem(CHECKLIST_KEY)) as string)
    expect(stored['7'].done).toEqual([])
  })

  it('drops the lists nobody touched for days when it writes', async () => {
    const now = Date.now()
    await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify({ 1: { done: [1], at: now - MAX_AGE - 1000 }, 2: { done: [2], at: now } }))
    await mount(9)
    await act(async () => { await api.toggle(5) })
    const stored = JSON.parse((await AsyncStorage.getItem(CHECKLIST_KEY)) as string)
    expect(Object.keys(stored).sort()).toEqual(['2', '9'])
  })

  it('prunes by age', () => {
    expect(Object.keys(pruneChecklists({ a: { done: [], at: 0 }, b: { done: [], at: 100 } }, MAX_AGE + 50))).toEqual(['b'])
  })
})
