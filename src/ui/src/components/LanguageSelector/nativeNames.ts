/**
 * Each language in its own name ("Español", "Português"), as the Language sheet of the mockup shows them. The API's language
 * object carries `name` (in English), `code`, `rtl`, `default`, `enabled` and nothing else, so the native names are the app's:
 * a language the project serves is looked up by its code. The list itself stays what the server gives (its order, its
 * entries); a code that is not here keeps the server's name.
 */
const NATIVE_NAMES: Record<string, string> = {
  af: 'Afrikaans',
  ar: 'العربية',
  bg: 'Български',
  bn: 'বাংলা',
  ca: 'Català',
  cs: 'Čeština',
  da: 'Dansk',
  de: 'Deutsch',
  el: 'Ελληνικά',
  en: 'English',
  es: 'Español',
  et: 'Eesti',
  eu: 'Euskara',
  fa: 'فارسی',
  fi: 'Suomi',
  fil: 'Filipino',
  fr: 'Français',
  gl: 'Galego',
  gu: 'ગુજરાતી',
  he: 'עברית',
  hi: 'हिन्दी',
  hr: 'Hrvatski',
  hu: 'Magyar',
  id: 'Bahasa Indonesia',
  is: 'Íslenska',
  it: 'Italiano',
  ja: '日本語',
  kn: 'ಕನ್ನಡ',
  km: 'ខ្មែរ',
  ko: '한국어',
  lt: 'Lietuvių',
  lv: 'Latviešu',
  ml: 'മലയാളം',
  mr: 'मराठी',
  ms: 'Bahasa Melayu',
  nb: 'Norsk bokmål',
  nl: 'Nederlands',
  no: 'Norsk',
  pa: 'ਪੰਜਾਬੀ',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  ru: 'Русский',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  sr: 'Српски',
  sv: 'Svenska',
  sw: 'Kiswahili',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  th: 'ไทย',
  tl: 'Tagalog',
  tr: 'Türkçe',
  uk: 'Українська',
  ur: 'اردو',
  vi: 'Tiếng Việt',
  zh: '中文',
  'zh-cn': '简体中文',
  'zh-hans': '简体中文',
  'zh-hk': '繁體中文',
  'zh-hant': '繁體中文',
  'zh-tw': '繁體中文',
}

/** The part of a server name in parentheses ("Spanish (Mexico)" -> "Mexico"): what tells two variants of one language apart. */
const qualifierOf = (name: string): string => /\(([^)]+)\)\s*$/.exec(name)?.[1]?.trim() ?? ''

/**
 * The language's own name for its code, or `null` when the app does not know it. A code with a region or a variant
 * ("es-419-1") is the base language's name followed by the server's qualifier ("Español (Mexico)"), so the variants of one
 * language stay apart; a code the table holds whole ("zh-CN") is its own entry.
 */
export const nativeLanguageName = (language: { code?: string, name?: string } | null | undefined): string | null => {
  const code = String(language?.code ?? '').trim().toLowerCase()
  if (!code) return null
  if (NATIVE_NAMES[code]) return NATIVE_NAMES[code]
  const base = NATIVE_NAMES[code.split(/[-_]/)[0]]
  if (!base) return null
  const qualifier = qualifierOf(String(language?.name ?? ''))
  return qualifier ? `${base} (${qualifier})` : base
}

/** What the app writes for a language: its own name when known, else the server's. */
export const languageLabel = (language: { code?: string, name?: string } | null | undefined): string =>
  nativeLanguageName(language) ?? String(language?.name ?? language?.code ?? '')

/**
 * What a screen reader says: the language's own name and, after it, the server's English name when they differ
 * ("Español, Spanish").
 */
export const languageSpoken = (language: { code?: string, name?: string } | null | undefined): string => {
  const label = languageLabel(language)
  const english = String(language?.name ?? '')
  return english && english !== label ? `${label}, ${english}` : label
}
