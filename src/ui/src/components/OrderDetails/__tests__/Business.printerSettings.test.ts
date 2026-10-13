import fs from 'fs'
import path from 'path'

describe('Order Details printer settings', () => {
  it('sends accept auto-print as a Ticket Preview entry', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../Business.tsx'),
      'utf8'
    )

    expect(src).toContain('getTicketPreviewNavigationPlan')
    expect(src).toContain('TICKET_PREVIEW_ENTRY.acceptAutoPrint')
    expect(src).toMatch(/handleViewSummaryOrder\([\s\S]*acceptAutoPrint/)
  })

  it('reloads printer storage on screen focus', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../Business.tsx'),
      'utf8'
    )

    expect(src).toContain('useFocusEffect')
    expect(src).toContain('getOrderDetailsPrinterSettings')
    expect(src).toMatch(/useFocusEffect\([\s\S]*getStorageData/)
  })
})
