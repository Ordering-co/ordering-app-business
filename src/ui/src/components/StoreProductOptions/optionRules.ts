type Translate = (key: string, fallback: string) => string

/**
 * What an option asks of the customer, from its `min` and `max`: "Choose 1" (one, required), "Up to 3" (optional,
 * several), "Choose 2" (exactly), "Choose 1-3" (a range). Nothing when it asks nothing (no maximum).
 */
export const optionRule = (option: { min?: number | string | null, max?: number | string | null } | null | undefined, t: Translate): string | null => {
  const min = Number(option?.min ?? 0) || 0
  const max = Number(option?.max ?? 0) || 0
  if (max <= 0) return min > 0 ? t('OPTION_CHOOSE_AT_LEAST', 'Choose at least _min_').replace('_min_', String(min)) : null
  if (min === 1 && max === 1) return t('OPTION_CHOOSE_ONE', 'Choose 1')
  if (min <= 0) return t('OPTION_CHOOSE_UP_TO', 'Up to _max_').replace('_max_', String(max))
  if (min === max) return t('OPTION_CHOOSE_N', 'Choose _count_').replace('_count_', String(max))
  return t('OPTION_CHOOSE_RANGE', 'Choose _min_-_max_').replace('_min_', String(min)).replace('_max_', String(max))
}
