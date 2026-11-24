import React from 'react'
import { Text } from 'react-native'
import { act, render } from '@testing-library/react-native'

import { useNow } from '../useNow'

const Probe = ({ active }: { active: boolean }) => <Text testID='now'>{String(useNow(active))}</Text>

describe('useNow', () => {
  beforeEach(() => { jest.useFakeTimers({ now: 1_000_000 }) })
  afterEach(() => { jest.useRealTimers() })

  it('follows the clock every second while something counts', () => {
    const { getByTestId } = render(<Probe active />)
    expect(getByTestId('now').props.children).toBe('1000000')
    act(() => { jest.advanceTimersByTime(3000) })
    expect(getByTestId('now').props.children).toBe('1003000')
  })

  it('does not tick when nothing counts', () => {
    const { getByTestId } = render(<Probe active={false} />)
    act(() => { jest.advanceTimersByTime(5000) })
    expect(getByTestId('now').props.children).toBe('1000000')
  })

  it('stops ticking when the screen leaves', () => {
    const view = render(<Probe active />)
    view.unmount()
    expect(jest.getTimerCount()).toBe(0)
  })
})
