import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { OBadge } from '../OBadge'
import { ODivider } from '../ODivider'
import { OCard } from '../OCard'
import { OListRow } from '../OListRow'
import { OAvatar } from '../OAvatar'
import { OStepper } from '../OStepper'
import { OOtpInput } from '../OOtpInput'
import { OSwitch } from '../OSwitch'
import { Tabs } from '../Tabs'
import { FilterChip } from '../FilterChip'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('themed primitives', () => {
  const theme = defaultAppTheme()
  const components = theme.native.components

  it('OBadge paints its variant, and follows a theme that changes it', () => {
    const { getByTestId, getByText } = renderWithProviders(<OBadge variant='success' testID='badge'>Done</OBadge>)
    expect(flat(getByTestId('badge')).backgroundColor).toBe(components.badge.variants.success.background)
    expect(flat(getByText('Done')).color).toBe(components.badge.variants.success.color)
    const custom = themeWith({ tokens: { color: { success: '#123456' } } })
    const again = renderWithProviders(<OBadge variant='success' testID='badge2'>Done</OBadge>, { themeOverrides: custom })
    expect(flat(again.getByTestId('badge2')).backgroundColor).toBe(custom.native.components.badge.variants.success.background)
  })

  it('ODivider is the variant\'s line and spacing', () => {
    const { toJSON } = renderWithProviders(<ODivider variant='section' />)
    const style = flat(toJSON())
    expect(style.height).toBe(components.divider.variants.section.line.borderWidth)
    expect(style.marginVertical).toBe(components.divider.variants.section.spacing)
  })

  it('OCard is a box of the theme, pressable as a whole when it opens something', () => {
    const onPress = jest.fn()
    const { getByTestId } = renderWithProviders(<OCard testID='card' onPress={onPress}><Text>in</Text></OCard>)
    fireEvent.press(getByTestId('card'))
    expect(onPress).toHaveBeenCalled()
    const still = renderWithProviders(<OCard testID='still'><Text>in</Text></OCard>)
    const style = flat(still.getByTestId('still'))
    expect(style.borderRadius).toBe(components.card.base.radius)
    expect(style.padding).toBe(components.card.base.padding)
    expect(style.backgroundColor).toBe(components.card.base.background)
  })

  it('OListRow shows its title and opens with a 44 pt target', () => {
    const onPress = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(<OListRow title='Sessions' subtitle='2 devices' onPress={onPress} testID='row' />)
    expect(getByText('2 devices')).toBeTruthy()
    fireEvent.press(getByText('Sessions'))
    expect(onPress).toHaveBeenCalled()
    expect(flat(getByTestId('row')).minHeight).toBeGreaterThanOrEqual(44)
  })

  it('OListRow paints the list\'s fill, or the one it is given, over its whole box', () => {
    const plain = renderWithProviders(<OListRow title='Plain' testID='plain' />)
    expect(flat(plain.getByTestId('plain')).backgroundColor).toBe(components.list_row.base.background)
    const tinted = renderWithProviders(<OListRow title='Tinted' background={theme.native.tokens.color.primary_subtle} testID='tinted' />)
    expect(flat(tinted.getByTestId('tinted')).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
    // A pressable row paints it too.
    const pressable = renderWithProviders(<OListRow title='Press' background={theme.native.tokens.color.primary_subtle} onPress={jest.fn()} testID='press' />)
    expect(flat(pressable.getByTestId('press')).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
  })

  it('OListRow paints a danger row in the danger text color, and an action row has no chevron', () => {
    const { getByText, UNSAFE_queryAllByProps } = renderWithProviders(<OListRow title='Log out' danger chevron={false} onPress={jest.fn()} />)
    expect(flat(getByText('Log out')).color).toBe(theme.native.tokens.color.danger_text)
    expect(UNSAFE_queryAllByProps({ name: 'chevron-forward' })).toHaveLength(0)
  })

  it('OAvatar asks a served picture at twice its box, and leaves another host\'s URL as it is', () => {
    const { Image, PixelRatio } = require('react-native')
    const box = components.avatar.sizes.lg.size
    const pixels = Math.ceil((box * 2 * PixelRatio.get()) / 50) * 50
    const cdn = renderWithProviders(
      <OAvatar kind='business' size='lg' source='https://cloud-assets.orderingplus.com/image/upload/dev/logo.png' />
    )
    expect(cdn.UNSAFE_getByType(Image).props.source.uri).toContain(`/upload/f_webp,c_limit,h_${pixels}`)
    const other = renderWithProviders(<OAvatar source='https://example.com/photo.jpg' />)
    expect(other.UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://example.com/photo.jpg', cache: 'force-cache' })
  })

  it('OAvatar takes the size\'s box and the theme image when a store has no logo', () => {
    const { getByTestId } = renderWithProviders(<OAvatar kind='business' size='lg' testID='logo' />)
    expect(flat(getByTestId('logo')).width).toBe(components.avatar.sizes.lg.size)
    const person = renderWithProviders(<OAvatar testID='person' />)
    expect(flat(person.getByTestId('person')).backgroundColor).toBe(components.avatar.base.background)
  })

  it('OStepper stays inside its range', () => {
    const onChange = jest.fn()
    const { getByLabelText } = renderWithProviders(<OStepper value={1} min={1} max={2} onChange={onChange} />)
    fireEvent.press(getByLabelText('Decrease'))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.press(getByLabelText('Increase'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('OOtpInput draws one cell per digit and completes once', () => {
    const onChange = jest.fn()
    const onComplete = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(<OOtpInput length={4} value='12' onChange={onChange} onComplete={onComplete} testID='otp' />)
    expect(getByText('1')).toBeTruthy()
    fireEvent.changeText(getByTestId('otp-field'), '12a34999')
    expect(onChange).toHaveBeenCalledWith('1234')
    expect(onComplete).toHaveBeenCalledWith('1234')
  })

  it('OSwitch is drawn from the theme: its track, its thumb and its 52 x 44 touch box', () => {
    const onChange = jest.fn()
    const sw = components.switch.base
    const { getByTestId, getByRole, rerender } = renderWithProviders(<OSwitch value={false} onChange={onChange} testID='switch' accessibilityLabel='Available' />)
    expect(getByRole('switch').props.accessibilityState).toMatchObject({ checked: false })
    const hit = flat(getByTestId('switch'))
    expect(hit).toMatchObject({ width: sw.hit_width, height: theme.native.tokens.size.md })
    const track = flat(getByTestId('switch').children[0] as any)
    expect(track).toMatchObject({ width: sw.track_width, height: sw.track_height, backgroundColor: sw.off })
    fireEvent.press(getByTestId('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<OSwitch value onChange={onChange} testID='switch' accessibilityLabel='Available' />)
    expect(flat(getByTestId('switch').children[0] as any).backgroundColor).toBe(sw.on)
  })

  it('OSwitch with a label names itself by it and does not answer when disabled', () => {
    const onChange = jest.fn()
    const { getByText, getByRole } = renderWithProviders(<OSwitch value onChange={onChange} label='Accepting orders' disabled />)
    expect(getByText('Accepting orders')).toBeTruthy()
    expect(getByRole('switch').props.accessibilityLabel).toBe('Accepting orders')
    fireEvent.press(getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Tabs mark the selected tab and report the pressed one', () => {
    const onChange = jest.fn()
    const { getByText, getAllByRole } = renderWithProviders(
      <Tabs tabs={[{ key: 'a', text: 'Pending' }, { key: 'b', text: 'Done' }]} selected='a' onChange={onChange} />
    )
    expect(getAllByRole('tab')[0].props.accessibilityState.selected).toBe(true)
    fireEvent.press(getByText('Done'))
    expect(onChange).toHaveBeenCalledWith('b', expect.objectContaining({ key: 'b' }))
  })

  it('FilterChip keeps its size when selected', () => {
    const { getByRole, rerender } = renderWithProviders(<FilterChip text='Today' />)
    const before = flat({ props: { style: getByRole('button').props.style } })
    expect(before).toBeTruthy()
    rerender(<FilterChip text='Today' selected />)
    expect(getByRole('button').props.accessibilityState.selected).toBe(true)
  })

  it('OModal draws a dialog in the modal\'s box, its title inside it', () => {
    const { OModal } = require('../index')
    const { getByTestId, getByText } = renderWithProviders(
      <OModal open box title='Requirements' testID='dialog'><Text>content</Text></OModal>
    )
    const box = flat(getByTestId('dialog'))
    expect(box.backgroundColor).toBe(components.modal.base.background)
    expect(box.borderRadius).toBe(components.modal.base.radius)
    expect(box.padding).toBe(components.modal.base.padding)
    expect(flat(getByText('Requirements')).color).toBe(theme.native.tokens.color.text)
    expect(getByText('content')).toBeTruthy()
  })

  it('OOtpInput can be focused from outside and its cells shrink to the row', () => {
    const ref = React.createRef<any>()
    const { UNSAFE_getAllByType } = renderWithProviders(<OOtpInput ref={ref} length={8} value='' onChange={jest.fn()} testID='pin' />)
    expect(typeof ref.current.focus).toBe('function')
    const { View } = require('react-native')
    const cell = UNSAFE_getAllByType(View).map((node: any) => StyleSheet.flatten(node.props.style)).find((style: any) => style?.flexBasis !== undefined)
    expect(cell.flexShrink).toBe(1)
    expect(cell.maxWidth).toBe(components.input.sizes.code.width)
  })

  it('OInput carries its label above the box (the theme\'s `field.label_position`), and inside only when the theme says so', () => {
    const { OInput } = require('../index')
    const above = renderWithProviders(<OInput placeholder='Name' onChange={jest.fn()} />)
    expect(above.getByText('Name')).toBeTruthy()
    expect(above.queryByPlaceholderText('Name')).toBeNull()
    expect(above.getByLabelText('Name')).toBeTruthy()
    above.unmount()
    // A label of its own leaves the placeholder inside the box as a hint.
    const hinted = renderWithProviders(<OInput label='Name' placeholder='Ana' onChange={jest.fn()} />)
    expect(hinted.getByText('Name')).toBeTruthy()
    expect(hinted.getByPlaceholderText('Ana')).toBeTruthy()
    hinted.unmount()
    // A theme that puts the labels inside makes the placeholder the label again.
    const custom = themeWith({ components: { field: { base: { label_position: 'placeholder' } } } })
    const inside = renderWithProviders(<OInput placeholder='Name' onChange={jest.fn()} />, { themeOverrides: custom })
    expect(inside.getByPlaceholderText('Name')).toBeTruthy()
    expect(inside.queryByText('Name')).toBeNull()
  })
})
