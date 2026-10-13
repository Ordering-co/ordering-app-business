import fs from 'fs'
import path from 'path'

describe('Android Epson USB device_filter', () => {
  const filterPath = path.join(
    __dirname,
    '../../../../../../android/app/src/main/res/xml/device_filter.xml'
  )

  it('includes Epson vendor 1208 (0x04B8) and TM-T20 product id', () => {
    const xml = fs.readFileSync(filterPath, 'utf8')
    expect(xml).toContain('vendor-id="1208"')
    expect(xml).toContain('product-id="3587"')
    expect(xml).toContain('vendor-id="1305"')
  })
})
