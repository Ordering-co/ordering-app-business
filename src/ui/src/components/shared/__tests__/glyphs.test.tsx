import React from 'react'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import Icon from '../Icon'
import { GLYPH, canonicalGlyph } from '../glyphs'

// Harmony H18: one glyph per function. Two screens drew two different magnifiers, a bike and a bicycle, three messages.
describe('one glyph per function', () => {
  it('has one canonical glyph for each function the review found drawn twice', () => {
    expect(GLYPH).toMatchObject({ search: 'search-outline', message: 'chatbubble-outline', driver: 'bicycle-outline', refresh: 'refresh' })
  })

  it('brings the other glyph of a function to the canonical one', () => {
    expect(canonicalGlyph('mci', 'magnify')).toEqual({ set: 'ion', name: GLYPH.search })
    expect(canonicalGlyph('mci', 'bike')).toEqual({ set: 'ion', name: GLYPH.driver })
    expect(canonicalGlyph('ion', 'chatbubble-ellipses-outline')).toEqual({ set: 'ion', name: GLYPH.message })
    expect(canonicalGlyph('ion', 'sync-outline')).toEqual({ set: 'ion', name: GLYPH.refresh })
  })

  it('leaves every other glyph as it is', () => {
    expect(canonicalGlyph('ion', 'close')).toEqual({ set: 'ion', name: 'close' })
    expect(canonicalGlyph('mci', 'map-marker')).toEqual({ set: 'mci', name: 'map-marker' })
    // The plural chat glyph is its own function (conversations), not a second message.
    expect(canonicalGlyph('ion', 'chatbubbles-outline')).toEqual({ set: 'ion', name: 'chatbubbles-outline' })
  })

  it('Icon draws the canonical glyph whichever name the screen gave', () => {
    const drawn = (set: 'ion' | 'mci', name: string) => renderWithProviders(<Icon set={set} name={name} />).toJSON() as any
    const name = (node: any) => node?.props?.name ?? node?.children?.[0]?.props?.name
    const first = drawn('mci', 'magnify')
    const second = drawn('ion', 'search-outline')
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(name(first) ?? JSON.stringify(first)).toBeTruthy()
  })
})
