import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { themeSpace } from '@/theme/helpers'
import OBottomPopup from '../shared/OBottomPopup'
import ChoiceRow from '../shared/ChoiceRow'
import OInput from '../shared/OInput'
import OText from '../shared/OText'
import OBadge from '../shared/OBadge'
import { NotFoundSource } from '../NotFoundSource'

interface Props {
  open: boolean
  onClose: () => void
  /** The groups the search leaves (`filteredExtras` of the controller). */
  groups: any[]
  /** Ids of the groups the product has. */
  attached: Array<number | string>
  /** Ids of the groups being saved. */
  updating: Array<number | string>
  search: string
  onSearch: (value: string) => void
  onToggle: (groupId: number | string, attach: boolean) => void
}

/**
 * The option groups of the business, with a check on those the product uses: tapping one attaches or detaches it
 * (`handleChangeProductExtra`). The field filters them by name (`handleChangeExtraSearch`). A group is shared by
 * every product that uses it; this only decides whether this product does.
 */
export const OptionGroupsSheet = ({ open, onClose, groups, attached, updating, search, onSearch, onToggle }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    body: { gap: themeSpace(theme, 'md') },
    grow: { flex: 1, gap: themeSpace(theme, 'xxs') },
    state: { alignSelf: 'flex-start' },
  }), [theme])
  return (
    <OBottomPopup open={open} onClose={onClose} title={t('OPTION_GROUPS', 'Option groups')} closeIcon padded keyboardAware testID='option-groups-sheet'>
      <View style={styles.body}>
        <OInput
          inline
          accessibilityLabel={t('SEARCH_OPTION_GROUP', 'Search option group')}
          placeholder={t('SEARCH_OPTION_GROUP', 'Search option group')}
          vertorIcon='magnify'
          value={search}
          isValueSync
          onChange={onSearch}
          autoCorrect={false}
          testID='option-groups-search'
        />
        <View>
          {groups.length === 0
            ? <NotFoundSource icon='search-outline' content={t('NO_RESULTS_FOUND', 'Sorry, no results found')} testID='option-groups-empty' />
            : groups.map((group, index) => {
              const isAttached = attached.includes(group.id)
              return (
                <ChoiceRow
                  key={group.id}
                  kind='check'
                  selected={isAttached}
                  dimmed={updating.includes(group.id)}
                  disabled={updating.includes(group.id)}
                  onPress={() => onToggle(group.id, !isAttached)}
                  last={index === groups.length - 1}
                  accessibilityLabel={group.name}
                  testID={`option-group-${group.id}`}
                >
                  <View style={styles.grow}>
                    <OText preset='label' numberOfLines={1}>{group.name}</OText>
                    {group.enabled === false && <OBadge variant='neutral' style={styles.state} testID={`option-group-${group.id}-disabled`}>{t('DISABLED', 'Disabled')}</OBadge>}
                  </View>
                </ChoiceRow>
              )
            })}
        </View>
      </View>
    </OBottomPopup>
  )
}

export default OptionGroupsSheet
