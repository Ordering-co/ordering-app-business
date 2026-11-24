import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themeSpace } from '@/theme/helpers'
import { Icon, OListRow, OSelect, OText } from '../shared'
import type { SelectOption } from '../shared/OSelect'

export interface SearchSelectOption {
  value: string | number
  label: string
  /** Something before the label (a store's logo). */
  leading?: React.ReactNode
  data?: any
}

interface Props {
  /** The row's title ("Store"). */
  title: string
  /** What the row says while nothing is chosen ("All stores", "Any"). */
  anyLabel: string
  /** The sheet's title. */
  sheetTitle?: string
  options: SearchSelectOption[]
  value: string | number | undefined
  onSelect: (value: string | number, label: string, option?: SelectOption) => void
  searchable?: boolean
  /** `options` already start with the "any" choice (a list that is read by pages builds its own). */
  includesAny?: boolean
  /** The chosen option's text while the options loaded so far do not hold it (the next page has it). */
  valueLabel?: string
  /** A list read by pages: the server's search and the next page (see `OSelect`). */
  paging?: { onSearchChange?: (text: string) => void, onEndReached?: () => void, loadingMore?: boolean }
  testID?: string
}

/**
 * A filter of the orders search that opens a sheet of choices: a row of the list (`list_row`, the title at its start,
 * the choice and a chevron at its end) over the app's select. The first choice of the sheet is "any", which clears it.
 */
export const SearchSelectRow = ({ title, anyLabel, sheetTitle, options, value, onSelect, searchable = false, includesAny = false, valueLabel, paging, testID }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({ end: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs'), flexShrink: 1 } }), [theme])
  const all = useMemo(() => (includesAny ? options : [{ value: '', label: anyLabel }, ...options]), [options, anyLabel, includesAny])
  return (
    <OSelect
      title={sheetTitle ?? title}
      options={all}
      value={value ?? ''}
      searchable={searchable && (options.length > 8 || !!paging)}
      {...paging}
      onSelect={(next: any, option: any) => onSelect(next, next === '' ? '' : option?.label ?? '', option)}
      testID={testID}
      renderTrigger={({ open, selected }) => (
        <OListRow
          title={title}
          onPress={open}
          testID={testID}
          trailing={(
            <View style={styles.end}>
              <OText preset='body' color='text_muted' numberOfLines={1}>{selected && selected.value !== '' ? selected.label : value !== '' && value !== undefined && valueLabel ? valueLabel : anyLabel}</OText>
              <Icon name='chevron-forward' color='text_muted' />
            </View>
          )}
        />
      )}
    />
  )
}
