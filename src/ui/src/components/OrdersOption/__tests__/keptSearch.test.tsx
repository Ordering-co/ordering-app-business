import React, { useRef, useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'
import { useConfig } from '@components'

// A controller with the one piece of state that matters here: its `filtered`, which a remount loses.
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    OrderListGroups: ({ UIComponent }: any) => {
      const [filtered, setFiltered] = React.useState(null)
      return <UIComponent filtered={filtered} onFiltered={setFiltered} supportsCustomerNameFilter />
    }
  }
})
jest.mock('@ui', () => ({ NotificationSetting: () => null }))

import { OrdersSource } from '../OrdersSource'
import { useOrdersSearch } from '../useOrdersSearch'
import { KeptSearchContext, type KeptSearch } from '../keptSearch'
import { resetOrdersView, useStoreFilter } from '../ordersView'

// Two screens that read the search as the phone's list and the board do.
const Screen = (name: string) => (props: any) => {
  const state = useOrdersSearch(props)
  const { store } = useStoreFilter()
  return (
    <View testID={name}>
      <Text testID={`${name}-store`}>{store?.id ?? 'all'}</Text>
      <Text testID={`${name}-form-store`}>{String(state.search.business || 'all')}</Text>
      <Text testID={`${name}-notice`}>{state.hasFilters ? (state.storeOnly ? `only:${state.storeName}` : 'filters') : 'none'}</Text>
      <Pressable testID={`${name}-pick`} onPress={() => { state.setSearch({ ...state.search, business: '42', businessName: 'Luna' }) }} />
      <Text testID={`${name}-filtered`}>{JSON.stringify(props.filtered)}</Text>
      <Text testID={`${name}-summary`}>{state.summary.join('|')}</Text>
      <Text testID={`${name}-form`}>{state.search.types.join(',')}</Text>
      <Pressable testID={`${name}-apply`} onPress={() => { state.setSearch({ ...state.search, types: [2] }) }} />
      <Pressable testID={`${name}-go`} onPress={state.apply} />
      <Pressable testID={`${name}-clear`} onPress={state.clear} />
    </View>
  )
}
const List = Screen('list')
const Board = Screen('board')

let flip: () => void = () => {}
let box: React.MutableRefObject<KeptSearch | null>
const Page = ({ provide = true }: { provide?: boolean }) => {
  const [board, setBoard] = useState(false)
  const kept = useRef<KeptSearch | null>(null)
  box = kept
  flip = () => setBoard((value) => !value)
  const screen = board ? <OrdersSource key='board' UIComponent={Board} /> : <OrdersSource key='list' UIComponent={List} />
  return provide ? <KeptSearchContext.Provider value={kept}>{screen}</KeptSearchContext.Provider> : screen
}

const applyPickup = (view: any, name: string) => {
  fireEvent.press(view.getByTestId(`${name}-apply`))
  fireEvent.press(view.getByTestId(`${name}-go`))
}

describe('a search survives turning the tablet (T3-C5, the iPad portrait case)', () => {
  beforeEach(() => {
    resetOrdersView()
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  it('the filter, its notice text and the form are the other layout\'s when it mounts', async () => {
    const view = render(<Page />)
    applyPickup(view, 'list')
    expect(view.getByTestId('list-summary')).toHaveTextContent('Pickup')
    expect(JSON.parse(view.getByTestId('list-filtered').props.children).delivery_type).toEqual([2])

    await act(async () => { flip() })
    expect(view.queryByTestId('list')).toBeNull()
    expect(JSON.parse(view.getByTestId('board-filtered').props.children).delivery_type).toEqual([2])
    expect(view.getByTestId('board-summary')).toHaveTextContent('Pickup')
    expect(view.getByTestId('board-form')).toHaveTextContent('2')

    // And back, with the filter changed on the board in between.
    await act(async () => { flip() })
    expect(JSON.parse(view.getByTestId('list-filtered').props.children).delivery_type).toEqual([2])
    expect(view.getByTestId('list-summary')).toHaveTextContent('Pickup')
  })

  it('Clear on the other layout clears for good: the next one starts with no filter', async () => {
    const view = render(<Page />)
    applyPickup(view, 'list')
    await act(async () => { flip() })
    fireEvent.press(view.getByTestId('board-clear'))
    expect(view.getByTestId('board-filtered')).toHaveTextContent('null')
    expect(box.current).toBeNull()
    await act(async () => { flip() })
    expect(view.getByTestId('list-filtered')).toHaveTextContent('null')
    expect(view.getByTestId('list-summary')).toHaveTextContent('')
  })

  it('with no search there is nothing to bring back, and without the page\'s box nothing is kept', async () => {
    const view = render(<Page />)
    await act(async () => { flip() })
    expect(view.getByTestId('board-filtered')).toHaveTextContent('null')
    view.unmount()

    const bare = render(<Page provide={false} />)
    applyPickup(bare, 'list')
    await act(async () => { flip() })
    expect(bare.getByTestId('board-filtered')).toHaveTextContent('null')
  })

  it('a store applied alone from the sheet is the other layout\'s too: its lists, its notice and its sheet', async () => {
    const view = render(<Page />)
    fireEvent.press(view.getByTestId('list-pick'))
    fireEvent.press(view.getByTestId('list-go'))
    expect(view.getByTestId('list-store')).toHaveTextContent('42')
    expect(view.getByTestId('list-notice')).toHaveTextContent('only:Luna')
    expect(view.getByTestId('list-filtered')).toHaveTextContent('null')

    await act(async () => { flip() })
    // The store view lives outside the screens: the board asks the controller with it and its sheet shows it.
    expect(view.getByTestId('board-store')).toHaveTextContent('42')
    expect(view.getByTestId('board-form-store')).toHaveTextContent('42')
    expect(view.getByTestId('board-notice')).toHaveTextContent('only:Luna')
    expect(view.getByTestId('board-filtered')).toHaveTextContent('null')

    // Clear on the board takes it off for the list as well.
    fireEvent.press(view.getByTestId('board-clear'))
    expect(view.getByTestId('board-notice')).toHaveTextContent('none')
    await act(async () => { flip() })
    expect(view.getByTestId('list-store')).toHaveTextContent('all')
    expect(view.getByTestId('list-form-store')).toHaveTextContent('all')
  })
})
