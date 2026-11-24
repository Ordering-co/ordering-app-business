import React, { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { useFormats } from '@/hooks/useFormats'
import { parseSearchDay, SEARCH_DAY_FORMAT } from '@/utils/dayjs'
import dayjs from '@/utils/dayjs'
import { themeGutter, themeSpace } from '@/theme/helpers'
import { Icon, FilterChip, KeyboardScreen, KeyboardScrollView, OBottomBar, OBottomPopup, OButton, OCalendar, OInput, OModal, SectionTitle } from '../shared'
import { timeStateOf } from '../shared/orderStates'
import { OrdersOptionBusiness } from '../OrdersOptionBusiness'
import { OrdersOptionDriver } from '../OrdersOptionDriver'
import { OrdersOptionPaymethod } from '../OrdersOptionPaymethod'
import { OrdersOptionCity } from '../OrdersOptionCity'
import { ChipRow } from './ChipRow'
import { type OrdersSearchState, type SearchValues } from './useOrdersSearch'

/** The five order types of the filter (`delivery_type`); the controller takes the list. */
const ORDER_TYPES = [1, 2, 3, 4, 5]
/** The time states the SLA filter picks (`order.time_status`). */
const SLA_STATES: Array<SearchValues['timeStatus']> = ['in_time', 'at_risk', 'delayed']

interface Props {
  searchState: OrdersSearchState
  /** The SLA filter exists on the enterprise plan only. */
  showSla?: boolean
}

/**
 * The orders search (OrdersSearch mockup), a full-screen page: the one field ("Order number, customer or phone"), the
 * filters as chips (date, order type, status) and rows that open a sheet (store, driver, payment method, city), and
 * under them, pinned, "Clear" and "Show orders". The text is classified when it is sent (`classifySearch`).
 */
export const OrdersSearchModal = ({ searchState, showSla = false }: Props) => {
  const { search, setSearch, open, setOpen, apply, clear, supportsName } = searchState
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const { date: dateOf } = useFormats()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [range, setRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null })
  const styles = useMemo(() => StyleSheet.create({
    page: { flex: 1 },
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg'), gap: themeSpace(theme, 'md') },
    section: { gap: themeSpace(theme, 'sm') }
  }), [theme])

  const update = (patch: Partial<SearchValues>) => setSearch({ ...search, ...patch })
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  const typeNames: Record<number, string> = {
    1: t('DELIVERY', 'Delivery'),
    2: t('PICKUP', 'Pickup'),
    3: t('EAT_IN', 'Eat in'),
    4: t('CURBSIDE', 'Curbside'),
    5: t('DRIVE_THRU', 'Drive thru')
  }
  const stateNames: Array<[string, string]> = [
    ['pending', t('PENDING', 'Pending')],
    ['progress', t('ORDERS_TAB_IN_PROGRESS', 'In progress')],
    ['completed', t('COMPLETED', 'Completed')],
    ['cancelled', t('CANCELLED', 'Cancelled')]
  ]
  const slaNames: Record<string, string> = { in_time: t('OK', 'Ok'), at_risk: t('SLA_AT_RISK', 'At risk'), delayed: t('DELAYED', 'Delayed') }
  const presets: Array<[SearchValues['date']['type'], string]> = [
    ['today', t('TODAY', 'Today')],
    ['yesterday', t('YESTERDAY', 'Yesterday')],
    ['last_7days', t('LAST_7_DAYS', 'Last 7 days')]
  ]

  const shown = (value: string) => value ? dateOf(parseSearchDay(value)) : ''
  const customText = search.date.type === 'custom' && search.date.from
    ? [shown(search.date.from), shown(search.date.to)].filter(Boolean).join(' – ')
    : t('CUSTOM_DATES', 'Custom dates')

  const pickRange = ({ start, end }: { start: Date | null, end: Date | null }) => {
    setRange({ start, end })
    if (start && end) {
      update({ date: { type: 'custom', from: dayjs(start).format(SEARCH_DAY_FORMAT), to: dayjs(end).format(SEARCH_DAY_FORMAT) } })
      setCalendarOpen(false)
    }
  }
  const openCalendar = () => {
    setRange({ start: parseSearchDay(search.date.from) ?? null, end: parseSearchDay(search.date.to) ?? null })
    setCalendarOpen(true)
  }

  const clearText = (
    <OButton
      iconOnly
      size='sm'
      color='neutral'
      appearance='ghost'
      icon={<Icon name='close' size='sm' />}
      onClick={() => update({ text: '' })}
      accessibilityLabel={t('CLEAR', 'Clear')}
      testID='orders-search-text-clear'
    />
  )

  if (!open) return null
  return (
    <OModal open={open} entireModal hideIcons title={t('SEARCH_ORDERS', 'Search orders')} onClose={() => setOpen(false)} testID='orders-search-modal'>
      <KeyboardScreen style={styles.page} behavior='padding' testID='orders-search-form'>
        <KeyboardScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <OInput
            value={search.text}
            isValueSync
            onChange={(text: string) => update({ text })}
            placeholder={supportsName ? t('SEARCH_ORDERS_PLACEHOLDER', 'Order number, customer or phone') : t('SEARCH_ORDERS_PLACEHOLDER_NO_NAME', 'Order number or phone')}
            inline
            vertorIcon='magnify'
            autoCorrect={false}
            autoCapitalize='none'
            returnKeyType='search'
            onSubmitEditing={apply}
            iconCustomRight={search.text ? clearText : undefined}
            testID='orders-search-text'
          />

          <View style={styles.section}>
            <SectionTitle>{t('DATE', 'Date')}</SectionTitle>
            <ChipRow testID='orders-search-date'>
              {presets.map(([type, text]) => (
                <FilterChip
                  key={type}
                  size='sm'
                  text={text}
                  selected={search.date.type === type}
                  onPress={() => update({ date: search.date.type === type ? { type: '', from: '', to: '' } : { type, from: '', to: '' } })}
                  testID={`orders-search-date-${type}`}
                />
              ))}
              <FilterChip
                size='sm'
                text={customText}
                selected={search.date.type === 'custom'}
                onPress={openCalendar}
                testID='orders-search-date-custom'
              />
            </ChipRow>
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('ORDER_TYPE', 'Order Type')}</SectionTitle>
            <ChipRow testID='orders-search-types'>
              {ORDER_TYPES.map((type) => (
                <FilterChip
                  key={type}
                  size='sm'
                  text={typeNames[type]}
                  selected={search.types.includes(type)}
                  onPress={() => update({ types: toggle(search.types, type) })}
                  testID={`orders-search-type-${type}`}
                />
              ))}
            </ChipRow>
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('STATUS', 'Status')}</SectionTitle>
            <ChipRow testID='orders-search-states'>
              {stateNames.map(([state, text]) => (
                <FilterChip
                  key={state}
                  size='sm'
                  text={text}
                  selected={search.states.includes(state)}
                  onPress={() => update({ states: toggle(search.states, state) })}
                  testID={`orders-search-state-${state}`}
                />
              ))}
            </ChipRow>
          </View>

          {showSla && (
            <View style={styles.section}>
              <SectionTitle>{t('SLA_SECTION_TITLE', 'SLA')}</SectionTitle>
              <ChipRow testID='orders-search-sla'>
                {SLA_STATES.map((state) => (
                  <FilterChip
                    key={state}
                    size='sm'
                    text={slaNames[state]}
                    dot={timeStateOf(state) ?? undefined}
                    selected={search.timeStatus === state}
                    onPress={() => update({ timeStatus: search.timeStatus === state ? '' : state })}
                    testID={`orders-search-sla-${state}`}
                  />
                ))}
              </ChipRow>
            </View>
          )}

          <View>
            <OrdersOptionBusiness search={search} onSearch={setSearch} />
            <OrdersOptionDriver search={search} onSearch={setSearch} />
            <OrdersOptionPaymethod search={search} onSearch={setSearch} />
            <OrdersOptionCity search={search} onSearch={setSearch} />
          </View>
        </KeyboardScrollView>
        <OBottomBar
          actions={[
            { slot: 'secondary', text: t('CLEAR', 'Clear'), onClick: clear, testID: 'orders-search-clear' },
            { slot: 'button', text: t('SHOW_ORDERS', 'Show orders'), onClick: apply, testID: 'orders-search-apply' }
          ]}
        />
      </KeyboardScreen>

      <OBottomPopup open={calendarOpen} onClose={() => setCalendarOpen(false)} title={t('CUSTOM_DATES', 'Custom dates')} closeIcon animationType='slide' padded>
        <OCalendar
          mode='range'
          startDate={range.start}
          endDate={range.end}
          onRangeChange={pickRange}
          testID='orders-search-calendar'
        />
      </OBottomPopup>
    </OModal>
  )
}
