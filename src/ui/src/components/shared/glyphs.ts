import type { IconSet } from './Icon'

/**
 * One glyph per function (harmony H18; the kit's icon table has one drawing for each): the app's UI glyphs are
 * Ionicons, and a function is always drawn with the same one. A screen names the function (`<Icon name={GLYPH.search} />`);
 * `Icon` also brings a call site that still names another glyph of the same function (Material's `magnify`, `bike`,
 * Ionicons' `chatbubble-ellipses-outline`) to the canonical one, so two screens can never draw two magnifiers.
 */
export const GLYPH = {
  /** The magnifier: search fields, the search button, "no results". */
  search: 'search-outline',
  /** A message to one person: the message buttons, the tab, the chat's quick sheet, the support row. */
  message: 'chatbubble-outline',
  /** Several conversations: the Messages empty state. */
  conversations: 'chatbubbles-outline',
  /** The driver: the order card's line, the details' driver card, the assign sheet. */
  driver: 'bicycle-outline',
  /** Reload / search again / pending sync. */
  refresh: 'refresh',
} as const

export type GlyphFunction = keyof typeof GLYPH

interface Glyph { set: IconSet, name: string }

/** Another glyph for a function the app already has one for: `<set>:<name>` -> the canonical glyph. */
const ALIASES: Record<string, Glyph> = {
  'mci:magnify': { set: 'ion', name: GLYPH.search },
  'ion:search': { set: 'ion', name: GLYPH.search },
  'mci:bike': { set: 'ion', name: GLYPH.driver },
  'ion:bicycle': { set: 'ion', name: GLYPH.driver },
  'ion:bicycle-outline': { set: 'ion', name: GLYPH.driver },
  'ion:chatbubble-ellipses-outline': { set: 'ion', name: GLYPH.message },
  'ion:sync-outline': { set: 'ion', name: GLYPH.refresh },
  'mci:refresh': { set: 'ion', name: GLYPH.refresh },
}

/** The glyph a name stands for: its own, or the canonical one of its function. */
export const canonicalGlyph = (set: IconSet, name: string): Glyph => ALIASES[`${set}:${name}`] ?? { set, name }
