/**
 * Builds the app's theme from a served version 2 theme (or none):
 *
 *   { values, native, meta }
 *
 * - `values`: the served values completed by the engine's runtime (`complete`
 *   of @orderingco/ordering-theme-engine/runtime) with src/theme.compiled.json:
 *   every key of the schema, values it does not understand replaced by the
 *   default, numbers clamped. Without a theme (first launch offline, an error)
 *   it is the build's defaults.
 * - `native`: the same values as React Native style values (`toNative` of
 *   @orderingco/ordering-theme-engine/native), built once per theme.
 * - `meta`: what the envelope says about itself, the platform the theme was
 *   resolved for and the system's reduce-motion setting.
 *
 * The theme is **resolved for a platform** (`phone` or `tablet`, the schema's
 * `platforms`): the platform's own values (`values.platforms.<p>`) are laid over
 * the components' `base`, the visibility keys and the pages, in `values` and in
 * `native`, so a reader (`themePart`, `themeVisible`, `usePageSections`) never
 * has to know about platforms. The overrides never reach the tokens (the engine's
 * rule).
 *
 * Never change the result: its objects are shared.
 */
import { complete } from '@orderingco/ordering-theme-engine/runtime'
import { toNative } from '@orderingco/ordering-theme-engine/native'
import COMPILED from '../theme.compiled.json'

export const THEME_VERSION = 2
export const THEME_PRODUCT_TYPE: string = (COMPILED as any).product_type
export const THEME_SCHEMA_VERSION: string = (COMPILED as any).version

/** The platforms of the schema (`platforms` of `product.schema.json`); `phone` is the base. */
export type PlatformName = 'phone' | 'tablet'
export const DEFAULT_PLATFORM: PlatformName = 'phone'

export interface ThemeEnvelope {
  version: 2
  values: Record<string, unknown>
  product_type?: string
  schema_version?: string
  preset?: string | null
  site_theme_id?: number | null
  updated_at?: string | null
}

export interface BuildOptions {
  platform?: PlatformName
  /** The system's reduce-motion setting: no theme motion. */
  reduceMotion?: boolean
}

const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)

/** A served version 2 theme for this app's product (another product's is ignored). */
export const isThemeEnvelope = (value: unknown): value is ThemeEnvelope =>
  isObject(value) && value.version === THEME_VERSION && isObject(value.values) &&
  (value.product_type === undefined || value.product_type === THEME_PRODUCT_TYPE)

// ── The platform layer ──────────────────────────────────────────────────

/** `component` with each section the override names (`base`) laid over it, property by property. */
const overlay = (component: any, override: any) => {
  const answer = { ...component }
  for (const [section, props] of Object.entries(override)) {
    answer[section] = isObject(props) ? { ...component?.[section], ...props } : props
  }
  return answer
}

/** An object whose keys are computed the first time they are read (as the engine's own views are). */
const lazyObject = (names: string[], compute: (name: string) => unknown) => {
  const answer: Record<string, any> = {}
  for (const name of names) {
    Object.defineProperty(answer, name, {
      enumerable: true,
      configurable: true,
      get () {
        const value = compute(name)
        Object.defineProperty(answer, name, { value, enumerable: true, writable: true, configurable: true })
        return value
      }
    })
  }
  return answer
}

/** `values` and `native` with `platform`'s own values laid over the base ones. */
const forPlatform = (values: any, native: any, platform: PlatformName) => {
  const own = values.platforms?.[platform]
  if (!own) return { values, native }
  const nativeOwn = native.platforms?.[platform]?.components ?? {}

  const components = { ...values.components }
  for (const [name, override] of Object.entries<any>(own.components ?? {})) {
    if (components[name]) components[name] = overlay(components[name], override)
  }
  const pages = { ...values.pages }
  for (const [name, override] of Object.entries<any>(own.pages ?? {})) {
    if (pages[name]) pages[name] = { ...pages[name], ...override }
  }
  const resolvedValues = {
    ...values,
    components,
    visibility: { ...values.visibility, ...own.visibility },
    pages
  }

  const resolvedNative = {
    ...native,
    components: lazyObject(Object.keys(native.components), (name) =>
      nativeOwn[name] ? overlay(native.components[name], nativeOwn[name]) : native.components[name])
  }
  return { values: resolvedValues, native: resolvedNative }
}

// ── The build ───────────────────────────────────────────────────────────

const meta = (envelope: ThemeEnvelope | null, platform: PlatformName, reduceMotion: boolean) => ({
  /** The system's reduce-motion setting (AppThemeProvider sets it): no theme motion. */
  reduceMotion,
  /** The platform this theme was resolved for. */
  platform,
  productType: envelope?.product_type ?? THEME_PRODUCT_TYPE,
  schemaVersion: envelope?.schema_version ?? THEME_SCHEMA_VERSION,
  preset: envelope?.preset ?? null,
  siteThemeId: envelope?.site_theme_id ?? null,
  updatedAt: envelope?.updated_at ?? null
})

/** What an envelope makes, before the platform: built once per envelope. */
const buildCore = (envelope: ThemeEnvelope | null) => {
  const values = complete(COMPILED as any, envelope?.values ?? null) as any
  const native = toNative(COMPILED as any, values) as any
  return { envelope, values, native }
}

const assemble = (core: ReturnType<typeof buildCore>, platform: PlatformName, reduceMotion: boolean) => {
  const resolved = forPlatform(core.values, core.native, platform)
  return { values: resolved.values, native: resolved.native, meta: meta(core.envelope, platform, reduceMotion) }
}

export type AppTheme = ReturnType<typeof assemble>

type Core = ReturnType<typeof buildCore>
const cores = new WeakMap<object, Core>()
const views = new WeakMap<Core, Map<string, AppTheme>>()
let defaultCore: Core | null = null

const viewOf = (core: Core, { platform = DEFAULT_PLATFORM, reduceMotion = false }: BuildOptions): AppTheme => {
  let map = views.get(core)
  if (!map) views.set(core, (map = new Map()))
  const key = `${platform}:${reduceMotion ? 1 : 0}`
  let theme = map.get(key)
  if (!theme) map.set(key, (theme = assemble(core, platform, reduceMotion)))
  return theme
}

/** The build's defaults: what the binary paints before a theme arrives and offline. */
export const defaultAppTheme = (options: BuildOptions = {}): AppTheme => viewOf((defaultCore ??= buildCore(null)), options)

/**
 * The app theme of an envelope for a platform, built once per envelope and platform;
 * anything it cannot read gives the defaults.
 */
export const buildAppTheme = (envelope: unknown, options: BuildOptions = {}): AppTheme => {
  if (!isThemeEnvelope(envelope)) return defaultAppTheme(options)
  let core = cores.get(envelope)
  if (!core) {
    try {
      core = buildCore(envelope)
    } catch (_) {
      return defaultAppTheme(options)
    }
    cores.set(envelope, core)
  }
  return viewOf(core, options)
}
