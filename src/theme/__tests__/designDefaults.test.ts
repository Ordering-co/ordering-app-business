import { resolve } from '@orderingco/ordering-theme-engine'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../engine'
import SCHEMA from '../../../product.schema.json'

/**
 * The look the schema's defaults draw: the approved mockups' (flat, with lines; a corner of 8 on buttons and
 * fields, 10 on cards and badges, 15 on dialogs and sheets), and how Identity still moves it.
 */
const schema: any = SCHEMA
/** A theme as the API serves it: what the author set, resolved with the schema (Identity reaches the components). */
const themed = (values: Record<string, unknown>) => {
  const resolved: any = resolve(schema, values)
  return buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: resolved.values ?? resolved })
}
/** A shadow that paints nothing (the engine's `none` is an object of zeros). */
const isFlat = (shadow: any) => !shadow || (shadow.shadowOpacity === 0 && shadow.elevation === 0)

describe('the defaults draw the mockups', () => {
  const { components, tokens } = defaultAppTheme().native

  it('are flat: no shadow anywhere Identity reaches, and the lines instead', () => {
    for (const box of [components.card.base, components.order_card.base, components.input.base, components.choice.base, components.alert.base, components.toast.base, components.modal.base, components.sheet.base, components.bottom_nav.base, components.bottom_bar.base, components.chat_bubble.base]) {
      expect(isFlat(box.shadow)).toBe(true)
    }
    expect(isFlat(components.button.variants.primary.solid.shadow)).toBe(true)
    expect(components.card.base.border).toMatchObject({ borderWidth: 1, borderColor: tokens.color.border })
    expect(components.input.base.border).toMatchObject({ borderWidth: 1, borderColor: tokens.color.border_strong })
    expect(components.chip.base.border).toMatchObject({ borderWidth: 1, borderColor: tokens.color.border })
    expect(components.tabs.variants.pill.border).toEqual({ borderWidth: 0 })
    expect(components.avatar.base.border).toEqual({ borderWidth: 0 })
  })

  it('round buttons and fields to 8, cards, badges and notices to 10, dialogs and sheets to 15', () => {
    expect(components.button.base.radius).toBe(8)
    expect(components.input.base.radius).toBe(8)
    expect(components.card.base.radius).toBe(10)
    expect(components.order_card.base.radius).toBe(10)
    expect(components.badge.base.radius).toBe(10)
    expect(components.alert.base.radius).toBe(10)
    expect(components.modal.base.radius).toBe(15)
    expect(components.sheet.base.radius).toBe(15)
    expect(components.button.shapes.round.radius).toBe(tokens.radius.full)
    expect(components.tabs.variants.pill.radius).toBe(tokens.radius.full)
  })

  it('size the pieces as the mockups do', () => {
    expect(components.input.sizes.md.height).toBe(50)
    expect(components.input.base.textarea_height).toBe(90)
    expect(components.bottom_nav.base.height).toBe(64)
    expect(components.bottom_nav.base.rail_width).toBe(80)
    expect(components.header.base.height).toBe(56)
    expect(components.list_row.base.min_height).toBe(56)
    // A pill of 50 (5 inside) holding 40 tabs (the mockups' 46 / 36, raised by the owner on 2026-11-23).
    expect(components.tabs.sizes.sm.height).toBe(50)
    expect(components.tabs.variants.pill.inset).toBe(5)
    expect(components.chip.sizes.sm.height).toBe(36)
    expect(components.switch.base).toMatchObject({ track_width: 44, track_height: 24, thumb_size: 20, hit_width: 52 })
    expect(components.checkbox.base.size).toBe(24)
    expect(components.modal.sizes.sm.width).toBe(330)
    expect(components.sheet.base).toMatchObject({ handle_width: 40, handle_height: 4 })
    expect(components.icon_tile.sizes).toMatchObject({ md: { size: 40 }, lg: { size: 44 }, xl: { size: 88 } })
    expect(components.progress.base.height).toBe(5)
  })

  it('draw the bottom bar\'s buttons as the kit does: main, outline, accept green, reject outline red, destructive solid red', () => {
    const slots = components.bottom_bar.slots
    expect(slots.button).toMatchObject({ size: 'lg', appearance: 'solid', color: 'primary' })
    expect(slots.secondary).toMatchObject({ appearance: 'outline', color: 'neutral' })
    expect(slots.advance).toMatchObject({ appearance: 'solid', color: 'success' })
    expect(slots.decline).toMatchObject({ appearance: 'outline', color: 'danger' })
    expect(slots.reject).toMatchObject({ appearance: 'solid', color: 'danger' })
    expect(components.button.sizes.lg.height).toBe(50)
  })

  it('paint a disabled solid button grey, as the kit does', () => {
    const off = components.button.variants.primary.solid.states.disabled
    expect(off.background).toBe(tokens.color.border)
    expect(off.color).toBe(tokens.color.text_disabled)
  })
})

describe('Identity still moves the defaults', () => {
  const radius = (level: string) => themed({ tokens: { border_style: { radius: level } } }).native.components

  it('square takes every corner to 0 and pill to the round one', () => {
    for (const level of ['none', 'full']) {
      const c = radius(level)
      const expected = level === 'none' ? 0 : c.button.shapes.round.radius
      for (const value of [c.button.base.radius, c.input.base.radius, c.card.base.radius, c.badge.base.radius, c.modal.base.radius, c.sheet.base.radius]) {
        expect(value).toBe(expected)
      }
    }
  })

  it('a theme that wants shadows gets them on the boxes', () => {
    const c = themed({ tokens: { shadow_style: { size: 'md' } } }).native.components
    expect(c.card.base.shadow.shadowOpacity).toBeGreaterThan(0)
    expect(c.sheet.base.shadow.shadowOpacity).toBeGreaterThan(0)
    expect(c.bottom_bar.base.shadow.shadowOpacity).toBeGreaterThan(0)
  })

  it('a theme without lines takes them off the fields, the chips and the cards', () => {
    const c = themed({ tokens: { border_style: { width: 'none' } } }).native.components
    expect(c.input.base.border).toEqual({ borderWidth: 0 })
    expect(c.chip.base.border).toEqual({ borderWidth: 0 })
    expect(c.card.base.border).toEqual({ borderWidth: 0 })
  })
})

describe('the schema', () => {
  it('has the Identity defaults of the mockups', () => {
    expect(schema.tokens.shadow_style.size.$value).toBe('none')
    expect(schema.tokens.border_style.width.$value).toBe('thin')
    expect(schema.tokens.border_style.radius.$value).toBe('md')
  })

  it('declares the platforms the app has, and the tablet\'s overrides', () => {
    expect(schema.platforms).toEqual(['phone', 'tablet'])
    expect(schema.components.screen.platforms.tablet.max_width.$value).toBe(600)
    expect(schema.components.sheet.platforms.tablet.presentation.$value).toBe('centered')
    expect(schema.components.bottom_nav.platforms.tablet.placement.$value).toBe('rail')
  })
})
