import { fieldsToSort, sortInputFields } from '../../utils'

/** The account's own details, drawn whatever the project's checkout validation fields say: the name and the e-mail are required. */
export const ACCOUNT_FIELDS = [
  { code: 'name', labelKey: 'NAME', fallback: 'Name', required: true },
  { code: 'lastname', labelKey: 'LASTNAME', fallback: 'Last name', required: false },
  { code: 'email', labelKey: 'EMAIL', fallback: 'Email', required: true },
]
export const ACCOUNT_FIELD_CODES = ACCOUNT_FIELDS.map(({ code }) => code)

/**
 * The fields of the user's personal information, in the sort's own order (name, middle name, last name, second last
 * name, e-mail): the account's three are always there, whatever the project's checkout fields list; the project's other
 * ones follow as it lists them. `showField` (the controller's) decides which of the project's others are shown. The
 * edit screen and the profile's read-only rows are drawn from this one list, so they show the same fields.
 */
export const accountFieldList = (
  validationFields: any,
  t: (key: string, fallback?: string) => string,
  showField?: (code: string) => boolean
): any[] => {
  const checkoutFields: any[] = !validationFields?.loading
    ? sortInputFields({ values: validationFields?.fields?.checkout })
    : []
  return fieldsToSort.flatMap((code: string) => {
    const listed = checkoutFields.find((field) => field.code === code)
    const account = ACCOUNT_FIELDS.find((item) => item.code === code)
    if (account) return [listed ?? { id: code, code, name: t(account.labelKey, account.fallback), enabled: true, required: account.required }]
    return listed && (!showField || showField(code)) ? [listed] : []
  })
}
