import { useCallback } from 'react'

import { orderNumberText } from './orderData'

import { useConfig, useLanguage } from '@components'

/** `orderNumberText` bound to the project's config and the language: `const numberText = useOrderNumberText(); numberText(order)`. */
export const useOrderNumberText = () => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  return useCallback((order: any) => orderNumberText(order, t, configs), [t, configs])
}
