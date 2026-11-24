import React, { useMemo } from 'react'

import { MainSearch as MainSearchController, useLanguage } from '@components'
import { SearchSelectRow } from '../OrdersOption/SearchSelectRow'

/** The city filter of the orders search: a row that opens the cities (of every country) in a searchable sheet. */
export const OrdersOptionCityUI = (props: any) => {
  const { search, onSearch, allListValues } = props
  const [, t] = useLanguage()
  const options = useMemo(() => {
    const cities: Array<{ value: any, label: string }> = []
    for (const country of allListValues?.countries ?? []) {
      for (const city of country?.cities ?? []) cities.push({ value: city.id, label: city.name })
    }
    return cities
  }, [allListValues?.countries])
  return (
    <SearchSelectRow
      title={t('CITY', 'City')}
      anyLabel={t('ANY', 'Any')}
      sheetTitle={t('SELECT_CITY', 'Select City')}
      options={options}
      value={search?.city}
      searchable
      onSelect={(value, label) => onSearch({ ...search, city: value, cityName: label })}
      testID='orders-search-city'
    />
  )
}

export const OrdersOptionCity = (props: any) => {
  const ordersOptionCityProps = {
    ...props,
    UIComponent: OrdersOptionCityUI
  }
  return <MainSearchController {...ordersOptionCityProps} />
}
