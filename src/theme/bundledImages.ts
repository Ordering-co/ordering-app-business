/**
 * The images bundled in the binary (`BUNDLED_IMAGES.<group>.<name>`).
 * A theme image (`themeImage`) falls back to one of them while the theme sets
 * no URL (IMAGE_FALLBACKS below). The app's icons are glyphs (shared/Icon), not images.
 */
export const BUNDLED_IMAGES: any = {}

/**
 * Theme image key → the bundled image painted while the theme sets no URL
 * (`group.name` in BUNDLED_IMAGES). `logotype` has none: without a theme image the login
 * draws the store's glyph tile instead of a logo.
 */
export const IMAGE_FALLBACKS: Record<string, string> = {}
