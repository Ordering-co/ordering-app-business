import settings from '@/config.json'

/**
 * The address of the dashboard: `dashboard_url` of the app's config (a project points to its own), else the
 * translation key `LINK_MORE_SETTINGS_GO_TO` (today's address, kept as the fallback).
 */
export const dashboardUrl = (t: (key: string, fallback: string) => string): string => {
  const configured = (settings as any)?.dashboard_url
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()
  return t('LINK_MORE_SETTINGS_GO_TO', 'https://dashboard.orderingplus.com')
}
