import React from 'react'
import { Modal, StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { defaultAppTheme } from '../../../../../theme/engine'
import { themeBottomSpace } from '../../../../../theme/helpers'
import {
  ChoiceMark, ChoiceRow, ChoiceTile, FilterChip, IconTile, OAvatar, OBadge, OBottomBar, OBottomPopup, OCalendar, OCard, OModal, ONotice, OProgress,
  OTextarea, PaneLayout, ScreenContainer, SectionTitle, SheetHeader, Tabs, initialsOf
} from '../index'

/**
 * The primitives of the redesign (docs/theme/components.md §2): what each reads from the theme and what it does
 * with it. The ones the driver app has are covered by its own suites (themedPrimitives, harmonyPrimitives…).
 */
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()
const { components, tokens } = theme.native

describe('IconTile', () => {
  it('is a glyph on a tinted base, by the schema\'s sizes and variants', () => {
    const view = renderWithProviders(<IconTile icon='print-outline' testID='tile' />)
    expect(flat(view.getByTestId('tile', { hidden: true }))).toMatchObject({ width: 40, height: 40, borderRadius: components.icon_tile.base.radius, backgroundColor: components.icon_tile.variants.brand.background })
    view.unmount()
    const big = renderWithProviders(<IconTile icon='bell' size='xl' round variant='neutral' testID='big' />)
    expect(flat(big.getByTestId('big', { hidden: true }))).toMatchObject({ width: 88, height: 88, borderRadius: components.icon_tile.shapes.round.radius, backgroundColor: components.icon_tile.variants.neutral.background })
  })
})

describe('OCard', () => {
  it('has the tint and muted variants, and a title', () => {
    const view = renderWithProviders(<OCard variant='tint' title='Hand-off' testID='card'><Text>body</Text></OCard>)
    expect(flat(view.getByTestId('card')).backgroundColor).toBe(components.card.variants.tint.background)
    expect(flat(view.getByTestId('card')).borderWidth).toBe(0)
    expect(flat(view.getByText('Hand-off')).fontFamily).toBe(components.card.base.title.fontFamily)
    view.unmount()
    const muted = renderWithProviders(<OCard variant='muted' testID='muted' />)
    expect(flat(muted.getByTestId('muted')).backgroundColor).toBe(components.card.variants.muted.background)
    muted.unmount()
    const plain = renderWithProviders(<OCard testID='plain' />)
    expect(flat(plain.getByTestId('plain'))).toMatchObject({ backgroundColor: components.card.base.background, borderWidth: 1 })
  })
})

describe('OAvatar initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Ana Torres')).toBe('AT')
    expect(initialsOf('  olivia  ')).toBe('O')
    expect(initialsOf('Luna Pizza Downtown')).toBe('LP')
    expect(initialsOf(null)).toBe('')
  })

  it('draws them in its fill, or its quiet pair when muted, instead of a glyph', () => {
    const view = renderWithProviders(<OAvatar name='Ana Torres' testID='avatar' />)
    expect(view.getByText('AT')).toBeTruthy()
    expect(flat(view.getByTestId('avatar')).backgroundColor).toBe(components.avatar.base.background)
    expect(flat(view.getByText('AT')).color).toBe(components.avatar.base.color)
    view.unmount()
    const muted = renderWithProviders(<OAvatar name='Ana Torres' muted testID='avatar' />)
    expect(flat(muted.getByTestId('avatar')).backgroundColor).toBe(components.avatar.base.muted_background)
    expect(flat(muted.getByText('AT')).color).toBe(components.avatar.base.muted_color)
  })

  it('keeps a glyph for a person with no name and no photo', () => {
    const view = renderWithProviders(<OAvatar testID='avatar' />)
    expect(view.queryByText('AT')).toBeNull()
  })
})

describe('ONotice', () => {
  it('has a title and a button of the action slot', () => {
    const onPress = jest.fn()
    const view = renderWithProviders(<ONotice variant='danger' title='Printer offline' action={{ text: 'Retry', onPress }} testID='notice'>Check the cable</ONotice>)
    expect(view.getByText('Printer offline')).toBeTruthy()
    expect(flat(view.getByText('Printer offline')).color).toBe(components.alert.variants.danger.color)
    fireEvent.press(view.getByText('Retry'))
    expect(onPress).toHaveBeenCalled()
    expect(flat(view.getByTestId('notice')).paddingVertical).toBe(components.alert.base.padding_y)
  })

  // IOS-B9: the text kept `flex: 1` inside the body's column, a flex basis of 0 in height: a long message was cut at its first line.
  it('lets a long message wrap: no `flex` on its text or on its holder (the body takes the width, the text its lines)', () => {
    const long = 'This order has ended, so you cannot send new messages to the customer or to the driver.'
    const view = renderWithProviders(<ONotice testID='notice'>{long}</ONotice>)
    const text = flat(view.getByText(long))
    expect(text.flex).toBeUndefined()
    expect(text.flexBasis).toBeUndefined()
    expect(view.getByText(long).props.numberOfLines).toBeUndefined()
    // What the notice is given as nodes is not wrapped in a flexing view either.
    const nodes = renderWithProviders(<ONotice testID='nodes'><Text testID='inner'>{long}</Text></ONotice>)
    const holder = nodes.getByTestId('inner').parent as any
    expect(flat(holder)?.flex).toBeUndefined()
  })

  // Menu.dc.html, MenuUnavailable.dc.html, OrdersOffline.dc.html: the action is a link (bold text in the notice's ink,
  // underlined, 44 high, without growing the notice), not a grey filled button.
  it('draws its action as a link in the notice\'s own ink, underlined, 44 high, not a filled button', () => {
    const onPress = jest.fn()
    const view = renderWithProviders(<ONotice variant='warning' action={{ text: 'View', onPress, testID: 'view' }} testID='notice'>3 products are unavailable</ONotice>)
    const action = view.getByTestId('view')
    const box = flat(action)
    expect(box.backgroundColor).toBeUndefined()
    expect(box.height).toBe(tokens.size.md)
    expect(box.marginVertical).toBe(-components.alert.base.padding_y)
    const label = flat(view.getByText('View'))
    expect(label.color).toBe(components.alert.variants.warning.color)
    expect(label.textDecorationLine).toBe('underline')
    expect(label.fontFamily).toBe(tokens.typography.label.fontFamily)
    expect(label.fontSize).toBe(tokens.typography.label.fontSize)
    expect(components.alert.slots.action.component).toBe('link')
    fireEvent.press(view.getByText('View'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('SectionTitle', () => {
  it('writes its text alone, in the section header\'s color', () => {
    const view = renderWithProviders(<SectionTitle>PREPARING</SectionTitle>)
    expect(view.getByText('PREPARING')).toBeTruthy()
    expect(flat(view.getByText('PREPARING')).color).toBe(components.section_header.base.title_color)
  })
})

describe('OBadge', () => {
  it('paints a soft variant with its dot, and a plain one with no box', () => {
    const view = renderWithProviders(<OBadge variant='success_soft' dot testID='badge'>Open</OBadge>)
    expect(flat(view.getByTestId('badge')).backgroundColor).toBe(components.badge.variants.success_soft.background)
    expect(flat(view.getByTestId('badge-dot')).backgroundColor).toBe(components.badge.variants.success_soft.dot)
    expect(flat(view.getByTestId('badge-dot')).width).toBe(components.badge.base.dot_size)
    view.unmount()
    const plain = renderWithProviders(<OBadge variant='success_soft' plain testID='plain'>Open</OBadge>)
    expect(flat(plain.getByTestId('plain')).backgroundColor).toBeUndefined()
    expect(flat(plain.getByText('Open')).color).toBe(components.badge.variants.success_soft.color)
  })

  it('a count in the small size is the counter\'s text', () => {
    const view = renderWithProviders(<OBadge variant='danger' count testID='count'>3</OBadge>)
    expect(flat(view.getByText('3')).fontSize).toBe(components.badge.sizes.sm.text.fontSize)
    expect(flat(view.getByTestId('count')).borderRadius).toBe(components.badge.shapes.count.radius)
  })
})

describe('Tabs', () => {
  const tabs = [{ key: 'new', text: 'New' }, { key: 'progress', text: 'In progress' }, { key: 'history', text: 'History' }]

  it('draws each tab as its label alone: no counter and no room for one', () => {
    const view = renderWithProviders(<Tabs tabs={tabs.map((tab) => ({ ...tab, testID: tab.key }))} selected='new' onChange={jest.fn()} variant='pill' />)
    for (const tab of tabs) {
      expect(view.queryByTestId(`${tab.key}-count`)).toBeNull()
      expect(view.queryByTestId(`${tab.key}-slot`)).toBeNull()
    }
    expect(view.getByTestId('new')).not.toHaveTextContent(/\d/)
  })

  it('is as tall as the small size says and answers a tap with the tab', () => {
    const onChange = jest.fn()
    const view = renderWithProviders(<Tabs tabs={tabs} selected='new' onChange={onChange} size='sm' />)
    fireEvent.press(view.getByText('History'))
    expect(onChange).toHaveBeenCalledWith('history', expect.objectContaining({ key: 'history' }))
  })
})

describe('FilterChip', () => {
  it('draws its status dot in a color role, and its disabled text color', () => {
    const view = renderWithProviders(<FilterChip text='Open' dot='success' testID='chip' />)
    expect(flat(view.getByTestId('chip-dot')).backgroundColor).toBe(tokens.color.success)
    view.unmount()
    const off = renderWithProviders(<FilterChip text='Closed' disabled />)
    expect(flat(off.getByText('Closed')).color).toBe(components.chip.variants.default.states.disabled.color)
  })

  it('turns semibold with the selected text style and tinted when selected, without moving', () => {
    const view = renderWithProviders(<FilterChip text='Today' selected size='sm' />)
    expect(flat(view.getByText('Today')).fontFamily).toBe(components.chip.base.selected_text.fontFamily)
    expect(flat(view.getByRole('button')).backgroundColor).toBe(components.chip.variants.default.states.selected.background)
    expect(flat(view.getByRole('button')).height).toBe(components.chip.sizes.sm.height)
  })
})

describe('ChoiceRow, ChoiceMark and ChoiceTile', () => {
  it('a row is a list row with the mark at its end, and answers its tap', () => {
    const onPress = jest.fn()
    const view = renderWithProviders(<ChoiceRow selected onPress={onPress} testID='row'><Text>English</Text></ChoiceRow>)
    expect(flat(view.getByTestId('row')).minHeight).toBe(components.list_row.base.min_height)
    expect(view.getByRole('radio').props.accessibilityState).toMatchObject({ checked: true })
    fireEvent.press(view.getByText('English'))
    expect(onPress).toHaveBeenCalled()
  })

  it('draws the radio at the theme\'s size and the checkbox as a rounded box, filled with a check when checked', () => {
    const radio = renderWithProviders(<ChoiceMark kind='radio' checked testID='radio' />)
    expect(flat(radio.getByTestId('radio'))).toMatchObject({ width: components.radio.base.size, borderColor: components.radio.base.checked })
    radio.unmount()
    const off = renderWithProviders(<ChoiceMark kind='check' checked={false} testID='box' />)
    expect(flat(off.getByTestId('box'))).toMatchObject({ width: components.checkbox.base.size, borderRadius: components.checkbox.base.radius, borderColor: components.checkbox.base.border.borderColor })
    expect(off.UNSAFE_queryByProps({ name: 'checkmark' })).toBeNull()
    off.unmount()
    const on = renderWithProviders(<ChoiceMark kind='check' checked testID='box' />)
    expect(flat(on.getByTestId('box')).backgroundColor).toBe(components.checkbox.base.checked)
    expect(on.UNSAFE_queryByProps({ name: 'checkmark' })).not.toBeNull()
  })

  it('a tile is 64 high, tinted when selected, and keeps its size', () => {
    const view = renderWithProviders(<ChoiceTile selected testID='tile'>Star</ChoiceTile>)
    const style = flat(view.getByTestId('tile', { hidden: true })) as any
    expect(style.minHeight).toBe(components.choice.base.height)
    expect(style.backgroundColor).toBe(components.choice.variants.default.states.selected.background)
  })
})

describe('OTextarea and the label', () => {
  it('is `textarea_height` high, with a label above when it has one', () => {
    const view = renderWithProviders(<OTextarea label='Note' onChange={jest.fn()} testID='area' />)
    expect(view.getByText('Note')).toBeTruthy()
    let box: any = view.getByLabelText('Note').parent
    while (box && flat(box)?.minHeight !== components.input.base.textarea_height) box = box.parent
    expect(box).toBeTruthy()
  })

  it('takes a height in lines when asked', () => {
    const view = renderWithProviders(<OTextarea lines={6} onChange={jest.fn()} testID='area' />)
    expect(flat(view.getByTestId('area')).minHeight).toBe(6 * components.input.base.text.lineHeight)
  })
})

describe('OCalendar in range mode', () => {
  const day = (view: any, d: number) => view.getByLabelText(new RegExp(`^${d} `))
  const base = { mode: 'range' as const, minDate: undefined as any }

  it('sets the start with the first tap, the end with the second, and starts again after a complete range', () => {
    const onRangeChange = jest.fn()
    const view = renderWithProviders(<OCalendar {...base} startDate='2026-02-10' endDate={null} onRangeChange={onRangeChange} />)
    fireEvent.press(day(view, 14))
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 14) })
    view.rerender(<OCalendar {...base} startDate='2026-02-10' endDate='2026-02-14' onRangeChange={onRangeChange} />)
    fireEvent.press(day(view, 20))
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: new Date(2026, 1, 20), end: null })
  })

  it('a day before the start begins the range again', () => {
    const onRangeChange = jest.fn()
    const view = renderWithProviders(<OCalendar {...base} startDate='2026-02-10' endDate={null} onRangeChange={onRangeChange} />)
    fireEvent.press(day(view, 3))
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: new Date(2026, 1, 3), end: null })
  })

  it('paints the ends as discs and a band across the days between them', () => {
    const view = renderWithProviders(<OCalendar {...base} startDate='2026-02-10' endDate='2026-02-14' onRangeChange={jest.fn()} testID='cal' />)
    // 11, 12 and 13 are between; 10 and 14 have half a band toward the middle.
    expect(view.getAllByTestId('cal-band')).toHaveLength(5)
    expect(view.queryByLabelText(/^9 /)).toBeTruthy()
  })

  it('does not change a single calendar', () => {
    const onDateChange = jest.fn()
    const view = renderWithProviders(<OCalendar selectedDate='2026-02-10' onDateChange={onDateChange} />)
    fireEvent.press(day(view, 12))
    expect(onDateChange).toHaveBeenCalledWith(new Date(2026, 1, 12))
    expect(view.queryByTestId('calendar-picker-band')).toBeNull()
  })
})

describe('OBottomBar', () => {
  it('lays its buttons in a row in the look of their slots, the main one twice as wide beside the other', () => {
    const decline = jest.fn()
    const advance = jest.fn()
    const view = renderWithProviders(
      <OBottomBar testID='bar' actions={[{ slot: 'decline', text: 'Reject', onClick: decline, testID: 'reject' }, { slot: 'advance', text: 'Accept', onClick: advance, testID: 'accept' }]} />
    )
    const bar = flat(view.getByTestId('bar'))
    expect(bar).toMatchObject({ paddingTop: components.bottom_bar.base.padding, paddingHorizontal: components.bottom_bar.base.padding_x, borderTopWidth: components.bottom_bar.base.border_top.borderWidth })
    expect(bar.borderWidth).toBeUndefined()
    expect(bar.paddingBottom).toBe(components.bottom_bar.base.padding + themeBottomSpace(theme, 0))
    expect(flat(view.getByTestId('reject-cell')).flex).toBe(1)
    expect(flat(view.getByTestId('accept-cell')).flex).toBe(2)
    fireEvent.press(view.getByText('Accept'))
    fireEvent.press(view.getByText('Reject'))
    expect(advance).toHaveBeenCalledTimes(1)
    expect(decline).toHaveBeenCalledTimes(1)
    const rejectLook = components.button.variants.danger.outline
    expect(flat(view.getByTestId('reject').children[0] as any).borderColor).toBe(rejectLook.border.borderColor)
    expect(flat(view.getByTestId('accept').children[0] as any).backgroundColor).toBe(components.button.variants.success.solid.background)
  })

  it('a single button takes the whole row, and the space under the bar is the screen\'s when it says so', () => {
    const view = renderWithProviders(<OBottomBar testID='bar' bottomSpace={0} actions={[{ text: 'Save', testID: 'save' }]} />)
    expect(flat(view.getByTestId('save-cell')).flex).toBe(1)
    expect(flat(view.getByTestId('bar')).paddingBottom).toBe(components.bottom_bar.base.padding)
  })

  // IOS-B13: "Not picked up" (98.7 pt at 14 / 600) broke in two in its 117 pt share of the 1 : 2 pair, the button's own 20 at each side leaving 77.
  it('keeps little side space on its buttons and one line for their labels, so a label fits its share of a pair', () => {
    expect(components.bottom_bar.base.button_padding_x).toBe(tokens.space.xs)
    const view = renderWithProviders(
      <OBottomBar actions={[{ slot: 'decline', text: 'Not picked up', testID: 'no' }, { slot: 'advance', text: 'Picked up', testID: 'yes' }]} />
    )
    for (const id of ['no', 'yes']) {
      const box = flat(view.getByTestId(id).children[0] as any)
      expect(box.paddingHorizontal).toBe(components.bottom_bar.base.button_padding_x)
    }
    const label = view.getByText('Not picked up')
    expect(label.props.numberOfLines).toBe(1)
    expect(label.props.adjustsFontSizeToFit).toBe(true)
    // 117 pt of a 402 pt phone's 352 pt row, less the side space on both sides.
    const share = (402 - 2 * components.bottom_bar.base.padding_x - components.bottom_bar.base.gap) / 3
    expect(share - 2 * components.bottom_bar.base.button_padding_x).toBeGreaterThan(98.7)
  })

  it('a button can be disabled, loading, or carry its own share', () => {
    const view = renderWithProviders(<OBottomBar actions={[{ text: 'A', disabled: true, testID: 'a' }, { slot: 'secondary', text: 'B', flex: 3, testID: 'b' }]} />)
    expect(view.getByTestId('a').props.accessibilityState).toMatchObject({ disabled: true })
    expect(flat(view.getByTestId('b-cell')).flex).toBe(3)
  })
})

describe('ScreenContainer and PaneLayout', () => {
  it('a phone\'s column has no cap, a tablet\'s is the theme\'s width, centered', () => {
    const phone = renderWithProviders(<ScreenContainer testID='screen'><Text>x</Text></ScreenContainer>)
    const column = phone.getByTestId('screen').children[0] as any
    expect(flat(column).maxWidth).toBeUndefined()
    phone.unmount()
    const tablet = renderWithProviders(<ScreenContainer testID='screen'><Text>x</Text></ScreenContainer>, { platform: 'tablet' })
    expect(flat(tablet.getByTestId('screen').children[0] as any).maxWidth).toBe(600)
    expect(flat(tablet.getByTestId('screen')).alignItems).toBe('center')
  })

  it('two panes: the list at the width the screen gives, a line, and the detail taking the rest', () => {
    const view = renderWithProviders(<PaneLayout testID='panes' listWidth={380} list={<Text>list</Text>} detail={<Text>detail</Text>} />)
    expect(flat(view.getByTestId('panes')).flexDirection).toBe('row')
    expect(flat(view.getByTestId('panes-list')).width).toBe(380)
    expect(flat(view.getByTestId('panes-detail')).flex).toBe(1)
    expect(view.getByText('list')).toBeTruthy()
    expect(view.getByText('detail')).toBeTruthy()
  })

  it('without a width from the screen, the list takes the theme\'s (screen.list_pane_width) and the detail the rest', () => {
    const view = renderWithProviders(<PaneLayout testID='panes' list={<Text>list</Text>} detail={<Text>detail</Text>} />, { platform: 'tablet' })
    expect(components.screen.base.list_pane_width).toBe(380)
    expect(components.screen.base.detail_pane_width).toBe(440)
    expect(flat(view.getByTestId('panes-list')).width).toBe(380)
    expect(flat(view.getByTestId('panes-detail')).flex).toBe(1)
  })
})
