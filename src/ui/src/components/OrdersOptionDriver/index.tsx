import React, { useMemo } from 'react'

import { useLanguage, DriverList as DriverListController } from '@components'
import { SearchSelectRow } from '../OrdersOption/SearchSelectRow'

/** The driver filter of the orders search: a row that opens the drivers in a sheet. */
export const OrdersOptionDriverUI = (props: any) => {
  const { search, onSearch, driverList } = props
  const [, t] = useLanguage()
  const options = useMemo(
    () => (driverList?.drivers ?? []).map((driver: any) => ({ value: driver.id, label: [driver.name, driver.lastname].filter(Boolean).join(' ') })),
    [driverList?.drivers]
  )
  return (
    <SearchSelectRow
      title={t('DRIVER', 'Driver')}
      anyLabel={t('ANY', 'Any')}
      sheetTitle={t('SELECT_DRIVER', 'Select Driver')}
      options={options}
      value={search?.driver}
      searchable
      onSelect={(value, label) => onSearch({ ...search, driver: value, driverName: label })}
      testID='orders-search-driver'
    />
  )
}

export const OrdersOptionDriver = (props: any) => {
  const ordersOptionDriverProps = {
    ...props,
    propsToFetch: ['id', 'name', 'lastname'],
    UIComponent: OrdersOptionDriverUI
  }
  return <DriverListController {...ordersOptionDriverProps} />
}
