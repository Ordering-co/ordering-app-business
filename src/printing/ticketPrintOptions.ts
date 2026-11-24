import { _retrieveStoreData, _setStoreData } from '../ui/src/providers/StoreUtil'

export const TICKET_PRINT_OPTIONS_STORAGE_KEY = 'ticket_print_options'

export type TicketPrintOptions = {
  orderStatus: boolean
  orderType: boolean
  paymentMethod: boolean
  deliveryPreference: boolean
  deliveryDate: boolean
  customerSection: boolean
  customerName: boolean
  customerEmail: boolean
  customerPhones: boolean
  customerAddress: boolean
  customerInternalNumber: boolean
  customerAddressNotes: boolean
  customerZipcode: boolean
  businessSection: boolean
  businessName: boolean
  businessEmail: boolean
  businessPhones: boolean
  businessAddress: boolean
  businessAddressNotes: boolean
  orderComment: boolean
  productIngredients: boolean
  productOptions: boolean
  productComments: boolean
  totalsBreakdown: boolean
  payments: boolean
}

export type TicketPrintOptionKey = keyof TicketPrintOptions

export type TicketPrintOptionGroup = {
  key: 'header' | 'customer' | 'business' | 'products' | 'totals'
  title: string
  sectionOption?: TicketPrintOptionKey
  options: Array<{ key: TicketPrintOptionKey, label: string }>
}

export const DEFAULT_TICKET_PRINT_OPTIONS: TicketPrintOptions = {
  orderStatus: true,
  orderType: true,
  paymentMethod: true,
  deliveryPreference: true,
  deliveryDate: true,
  customerSection: true,
  customerName: true,
  customerEmail: true,
  customerPhones: true,
  customerAddress: true,
  customerInternalNumber: true,
  customerAddressNotes: true,
  customerZipcode: true,
  businessSection: true,
  businessName: true,
  businessEmail: true,
  businessPhones: true,
  businessAddress: true,
  businessAddressNotes: true,
  orderComment: true,
  productIngredients: true,
  productOptions: true,
  productComments: true,
  totalsBreakdown: true,
  payments: true
}

export const normalizeTicketPrintOptions = (stored: unknown): TicketPrintOptions => {
  const source = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {}
  const options = { ...DEFAULT_TICKET_PRINT_OPTIONS }
  for (const key of Object.keys(DEFAULT_TICKET_PRINT_OPTIONS) as TicketPrintOptionKey[]) {
    if (typeof source[key] === 'boolean') {
      options[key] = source[key] as boolean
    }
  }
  return options
}

export const loadTicketPrintOptions = async (): Promise<TicketPrintOptions> =>
  normalizeTicketPrintOptions(await _retrieveStoreData(TICKET_PRINT_OPTIONS_STORAGE_KEY))

export const saveTicketPrintOptions = async (options: Partial<TicketPrintOptions>): Promise<TicketPrintOptions> => {
  const next = normalizeTicketPrintOptions(options)
  await _setStoreData(TICKET_PRINT_OPTIONS_STORAGE_KEY, next)
  return next
}

export const getTicketPrintOptionGroups = (
  t: (key: string, fallback: string) => string
): TicketPrintOptionGroup[] => [
  {
    key: 'header',
    title: t('PRINT_GROUP_HEADER', 'Header'),
    options: [
      { key: 'orderStatus', label: t('STATUS', 'Status') },
      { key: 'orderType', label: t('ORDER_TYPE', 'Order Type') },
      { key: 'paymentMethod', label: t('PAYMENT_METHOD', 'Payment method') },
      { key: 'deliveryPreference', label: t('DELIVERY_PREFERENCE', 'Delivery Preference') },
      { key: 'deliveryDate', label: t('DELIVERY_DATE', 'Delivery Date') }
    ]
  },
  {
    key: 'customer',
    title: t('CUSTOMER_DETAILS', 'Customer details'),
    sectionOption: 'customerSection',
    options: [
      { key: 'customerName', label: t('FULL_NAME', 'Full Name') },
      { key: 'customerEmail', label: t('EMAIL', 'Email') },
      { key: 'customerPhones', label: t('PHONE', 'Phone') },
      { key: 'customerAddress', label: t('FULL_ADDRESS', 'Full Address') },
      { key: 'customerInternalNumber', label: t('INTERNAL_NUMBER', 'Internal Number') },
      { key: 'customerAddressNotes', label: t('NOTES', 'Notes') },
      { key: 'customerZipcode', label: t('ZIPCODE', 'Zipcode') }
    ]
  },
  {
    key: 'business',
    title: t('BUSINESS_DETAILS', 'Business details'),
    sectionOption: 'businessSection',
    options: [
      { key: 'businessName', label: t('PRINT_OPTION_BUSINESS_NAME', 'Business name') },
      { key: 'businessEmail', label: t('EMAIL', 'Email') },
      { key: 'businessPhones', label: t('BUSINESS_PHONE', 'Business Phone') },
      { key: 'businessAddress', label: t('ADDRESS', 'Address') },
      { key: 'businessAddressNotes', label: t('SPECIAL_ADDRESS', 'Special Address') }
    ]
  },
  {
    key: 'products',
    title: t('PRODUCTS', 'Products'),
    options: [
      { key: 'orderComment', label: t('ORDER_COMMENT', 'Order Comment') },
      { key: 'productIngredients', label: t('INGREDIENTS', 'Ingredients') },
      { key: 'productOptions', label: t('PRODUCT_OPTIONS', 'Product options') },
      { key: 'productComments', label: t('COMMENTS', 'Comments') }
    ]
  },
  {
    key: 'totals',
    title: t('TOTAL', 'Total'),
    options: [
      { key: 'totalsBreakdown', label: t('PRINT_OPTION_TOTALS_BREAKDOWN', 'Subtotal, discounts, taxes and fees') },
      { key: 'payments', label: t('PAYMENTS', 'Payments') }
    ]
  }
]
