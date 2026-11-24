import { createContext, type MutableRefObject } from 'react'
import type { SearchValues } from './useOrdersSearch'

/**
 * The search a tablet turned round keeps. The phone list and the landscape board are two screens with a controller each
 * (`OrdersSource`), so a rotation mounts the other one and the controller's filter, which lives in its state, is lost. The
 * Orders page (it stays mounted across the rotation) holds this box and gives it through `KeptSearchContext`: the filters the
 * controller was asked for, and the form's values with what was applied (the notice's text), so the other layout starts where
 * the first left off. Without a provider nothing is kept.
 */
export interface KeptSearch {
  filters: Record<string, any> | null
  search: SearchValues | null
  applied: SearchValues | null
}

export type KeptSearchBox = MutableRefObject<KeptSearch | null>

export const emptyKeptSearch = (): KeptSearch => ({ filters: null, search: null, applied: null })

export const KeptSearchContext = createContext<KeptSearchBox | null>(null)
