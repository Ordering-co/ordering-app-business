import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'

// The barrel, as a plain object the tests fill with what the areas have shipped.
jest.mock('@ui', () => ({ __esModule: true }))

import { GLOBAL_OVERLAY_NAMES, GlobalOverlays } from '../GlobalOverlays'

const mockUi: Record<string, any> = require('@ui')

const piece = (label: string) => () => <Text>{label}</Text>

describe('GlobalOverlays (the pieces over the whole signed-in app)', () => {
  beforeEach(() => { Object.keys(mockUi).forEach((key) => delete mockUi[key]) })

  it('is a no-op until the areas ship their pieces', () => {
    expect(render(<GlobalOverlays />).toJSON()).toBeNull()
  })

  it('mounts the action host, the new-order alert and the connection host from @ui by name, in order', () => {
    expect(GLOBAL_OVERLAY_NAMES).toEqual(['OrderActionsHost', 'NewOrderAlert', 'ConnectionHost'])
    mockUi.OrderActionsHost = piece('actions')
    mockUi.NewOrderAlert = piece('alert')
    mockUi.ConnectionHost = piece('connection')
    const view = render(<GlobalOverlays />)
    expect(view.toJSON()).toHaveLength(3)
    expect(view.getByText('actions')).toBeTruthy()
    expect(view.getByText('alert')).toBeTruthy()
    expect(view.getByText('connection')).toBeTruthy()
  })

  it('mounts what exists and skips what does not', () => {
    mockUi.ConnectionHost = piece('connection')
    const view = render(<GlobalOverlays />)
    expect(view.queryByText('alert')).toBeNull()
    expect(view.getByText('connection')).toBeTruthy()
  })

  it('does not mount an export that is not a component', () => {
    mockUi.NewOrderAlert = 'not a component'
    expect(render(<GlobalOverlays />).toJSON()).toBeNull()
  })

  it('takes the names to mount', () => {
    mockUi.Other = piece('other')
    mockUi.NewOrderAlert = piece('alert')
    const view = render(<GlobalOverlays names={['Other']} />)
    expect(view.getByText('other')).toBeTruthy()
    expect(view.queryByText('alert')).toBeNull()
  })
})
