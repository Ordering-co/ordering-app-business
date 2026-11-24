const t = (_key: string, fallback: string) => fallback

describe('dashboardUrl', () => {
  afterEach(() => { jest.resetModules() })

  it('takes dashboard_url of the app config', () => {
    jest.doMock('@/config.json', () => ({ __esModule: true, default: { dashboard_url: ' https://dashboard.example.com ' } }))
    const { dashboardUrl } = require('../dashboardUrl')
    expect(dashboardUrl(t)).toBe('https://dashboard.example.com')
  })

  it('falls back to the translation key when it is empty or missing', () => {
    jest.doMock('@/config.json', () => ({ __esModule: true, default: { dashboard_url: '  ' } }))
    expect(require('../dashboardUrl').dashboardUrl(t)).toBe('https://dashboard.orderingplus.com')
    jest.resetModules()
    jest.doMock('@/config.json', () => ({ __esModule: true, default: {} }))
    expect(require('../dashboardUrl').dashboardUrl((key: string) => (key === 'LINK_MORE_SETTINGS_GO_TO' ? 'https://dash.translated.example' : ''))).toBe('https://dash.translated.example')
  })
})
