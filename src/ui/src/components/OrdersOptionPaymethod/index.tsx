import React, { useMemo } from 'react'

import { useLanguage, PaymethodList as PaymethodListController } from '@components'
import { SearchSelectRow } from '../OrdersOption/SearchSelectRow'

/** The payment method filter of the orders search: a row that opens the methods in a sheet. */
export const OrdersOptionPaymethodUI = (props: any) => {
  const { search, onSearch, paymethodList } = props
  const [, t] = useLanguage()
  const options = useMemo(
    () => (paymethodList?.paymethods ?? []).map((paymethod: any) => ({ value: paymethod.id, label: paymethod.name })),
    [paymethodList?.paymethods]
  )
  return (
    <SearchSelectRow
      title={t('PAYMENT_METHOD', 'Payment method')}
      anyLabel={t('ANY', 'Any')}
      sheetTitle={t('SELECT_PAYMETHOD', 'Select Paymethod')}
      options={options}
      value={search?.paymethod}
      onSelect={(value, label) => onSearch({ ...search, paymethod: value, paymethodName: label })}
      testID='orders-search-paymethod'
    />
  )
}

export const OrdersOptionPaymethod = (props: any) => {
  const ordersOptionPaymethodProps = {
    ...props,
    UIComponent: OrdersOptionPaymethodUI
  }
  return <PaymethodListController {...ordersOptionPaymethodProps} />
}
