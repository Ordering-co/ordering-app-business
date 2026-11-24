type ConfigValue = { value?: string } | undefined
type Configs = Record<string, ConfigValue> | null | undefined

export const HIDE_CUSTOMER_CONTACT_BUSINESS_APP = 'hide_customer_contact_business_app'

export const isCustomerContactHidden = (configs: Configs) =>
  configs?.[HIDE_CUSTOMER_CONTACT_BUSINESS_APP]?.value === '1'
