import { CONNECTION, matchCatalogModel, readDiscovery } from '../discovery'

describe('matching a discovered device to the catalog', () => {
  it('maps the Star models the SDK names to the catalog entries', () => {
    expect(matchCatalogModel('star', 'TSP100IV')).toBe('TSP100IV')
    expect(matchCatalogModel('star', 'TSP100IV_SK')).toBe('TSP100IV')
    expect(matchCatalogModel('star', 'TSP100IIILAN')).toBe('TSP100')
    expect(matchCatalogModel('star', 'mC_Print3')).toBe('mC-Print3')
    expect(matchCatalogModel('star', 'SM_T300i')).toBe('SM-T300i/T300')
    expect(matchCatalogModel('star', 'mPOP')).toBe('mPOP')
  })

  it('does not guess a Star model the catalog does not have', () => {
    expect(matchCatalogModel('star', 'mC_Label3')).toBeUndefined()
    expect(matchCatalogModel('star', 'Unknown')).toBeUndefined()
    expect(matchCatalogModel('star', undefined)).toBeUndefined()
  })

  it('matches an Epson device name to its catalog model, whatever the punctuation or case', () => {
    expect(matchCatalogModel('epson', 'TM-T20III')).toBe('TM-T20III')
    expect(matchCatalogModel('epson', 'tm-m30ii')).toBe('TM-m30II')
    expect(matchCatalogModel('epson', 'TM_T88V')).toBe('TM-T88V')
    expect(matchCatalogModel('epson', 'TM-U220')).toBeUndefined()
  })

  it('has one generic model', () => {
    expect(matchCatalogModel('generic', 'POS-5802')).toBe('ESC/POS (Bluetooth)')
  })
})

describe('reading what a brand\'s discovery found', () => {
  it('returns every device, not only the first, without repeats', () => {
    const found = [
      { connectionSettings: { identifier: '192.168.1.40' }, information: { model: 'TSP100IV' } },
      { connectionSettings: { identifier: '192.168.1.52' }, information: { model: 'mC_Print3' } },
      { connectionSettings: { identifier: '192.168.1.40' }, information: { model: 'TSP100IV' } }
    ]
    expect(readDiscovery(found, 'star', CONNECTION.LAN)).toEqual([
      { id: '192.168.1.40', name: 'TSP100IV', model: 'TSP100IV', brand: 'star', connection: 2 },
      { id: '192.168.1.52', name: 'mC-Print3', model: 'mC-Print3', brand: 'star', connection: 2 }
    ])
  })

  it('reads Epson and generic entries by their device name', () => {
    expect(readDiscovery([{ connectionSettings: { identifier: 'TCP:192.168.1.60' }, deviceName: 'TM-T20III', target: 'TCP:192.168.1.60' }], 'epson', CONNECTION.LAN))
      .toEqual([{ id: 'TCP:192.168.1.60', name: 'TM-T20III', model: 'TM-T20III', brand: 'epson', connection: 2 }])
    const ble = readDiscovery([{ connectionSettings: { identifier: 'AA:BB' }, deviceName: 'POS-58', rssi: -40 }], 'generic', CONNECTION.BLUETOOTH)
    expect(ble).toEqual([{ id: 'AA:BB', name: 'POS-58', model: 'ESC/POS (Bluetooth)', brand: 'generic', connection: 1 }])
  })

  it('reads a message (a string) or nothing as no devices', () => {
    expect(readDiscovery('Bluetooth permission is required', 'star', CONNECTION.BLUETOOTH)).toEqual([])
    expect(readDiscovery(undefined, 'epson', CONNECTION.LAN)).toEqual([])
    expect(readDiscovery([{ connectionSettings: {} }], 'star', CONNECTION.LAN)).toEqual([])
  })
})
