import React, { useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeGutter, themeSpace } from '@/theme/helpers'
import { CONNECTION, PAPER_WIDTH_OPTIONS, type ConnectionType, type PrinterDriver } from '../../../../printing'
import { ChoiceRow, ChoiceTile, FilterChip, IconTile, KeyboardScrollView, ONotice, OText, SectionTitle } from '../shared'

/** The connections a brand offers: a generic ESC/POS printer is Bluetooth only, Star has no USB, Epson has all three. */
export const connectionsOf = (brand: PrinterDriver): ConnectionType[] =>
  brand === 'generic'
    ? [CONNECTION.BLUETOOTH]
    : brand === 'epson'
      ? [CONNECTION.LAN, CONNECTION.BLUETOOTH, CONNECTION.USB]
      : [CONNECTION.LAN, CONNECTION.BLUETOOTH]

export const defaultConnectionOf = (brand: PrinterDriver): ConnectionType => connectionsOf(brand)[0]

interface Props {
  brand: PrinterDriver
  connection: ConnectionType
  paperWidthMm: number
  onBrand: (brand: PrinterDriver) => void
  onConnection: (connection: ConnectionType) => void
  onPaperWidth: (paperWidthMm: number) => void
}

/** Step 1 of the wizard: which brand, how it is connected and how wide its paper is. */
export const PrinterAdd = ({ brand, connection, paperWidthMm, onBrand, onConnection, onPaperWidth }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const usbSupported = Platform.OS === 'android'

  const styles = useMemo(() => StyleSheet.create({
    content: { paddingHorizontal: themeGutter(theme), paddingTop: themeSpace(theme, 'md'), paddingBottom: themeSpace(theme, 'xl'), gap: themeSpace(theme, 'lg') },
    // The title (`SectionTitle`) carries the space under it.
    section: {},
    tiles: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    // Sized by their label, then sharing what is left: "Other (ESC/POS)" needs more than "Star" (a third each cut it).
    tile: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' },
    rowTexts: { flex: 1 },
    chips: { flexDirection: 'row', gap: themeSpace(theme, 'sm') }
  }), [theme])

  const brands: Array<{ id: PrinterDriver, label: string }> = [
    { id: 'star', label: 'Star' },
    { id: 'epson', label: 'Epson' },
    { id: 'generic', label: t('PRINTER_BRAND_OTHER', 'Other (ESC/POS)') }
  ]

  const ways: Record<number, { icon: string, set?: 'mci', title: string, hint: string }> = {
    [CONNECTION.LAN]: { icon: 'wifi', title: t('PRINTER_CONNECTION_WIFI_LAN', 'Wi‑Fi or LAN'), hint: t('CONNECTION_HINT_RELIABLE', 'Most reliable') },
    [CONNECTION.BLUETOOTH]: { icon: 'bluetooth', title: t('PRINTER_CONNECTION_BLUETOOTH', 'Bluetooth'), hint: t('CONNECTION_HINT_SHORT_RANGE', 'Short range, can drop') },
    [CONNECTION.USB]: { icon: 'usb', set: 'mci', title: t('PRINTER_CONNECTION_USB', 'USB'), hint: t('CONNECTION_HINT_ANDROID_ONLY', 'Android only') }
  }

  const notice = connection === CONNECTION.LAN
    ? t('PRINTER_NETWORK_HINT', 'Turn the printer on and connect it to the same network as this device.')
    : connection === CONNECTION.BLUETOOTH
      ? t('PRINTER_BLUETOOTH_CAVEAT', 'Bluetooth can be unreliable (pairing, range, interference). Prefer LAN / Wi‑Fi when possible.')
      : usbSupported
        ? t('PRINTER_USB_CAVEAT', 'Keep the device awake and charging when possible. Moving the cable may disconnect the printer.')
        : t('PRINTER_USB_IOS_UNAVAILABLE', 'USB printing is available on Android only.')

  return (
    <KeyboardScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <SectionTitle>{t('PRINTER_BRAND', 'Brand')}</SectionTitle>
        <View style={styles.tiles}>
          {brands.map(({ id, label }) => (
            <View key={id} style={styles.tile}>
              <ChoiceTile testID={`brand-${id}`} selected={brand === id} onPress={() => onBrand(id)}>{label}</ChoiceTile>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('CONNECTION', 'Connection')}</SectionTitle>
        <View>
          {connectionsOf(brand).map((type, index, all) => {
            const way = ways[type]
            const unavailable = type === CONNECTION.USB && !usbSupported
            return (
              <ChoiceRow
                key={type}
                testID={`connection-${type}`}
                selected={connection === type}
                disabled={unavailable}
                last={index === all.length - 1}
                onPress={() => onConnection(type)}
                accessibilityLabel={way.title}
              >
                <IconTile icon={way.icon} set={way.set} size='md' />
                <View style={styles.rowTexts}>
                  <OText preset='label'>{way.title}</OText>
                  <OText preset='body_sm' color='text_muted'>{way.hint}</OText>
                </View>
              </ChoiceRow>
            )
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('PAPER_WIDTH', 'Paper width')}</SectionTitle>
        <View style={styles.chips}>
          {PAPER_WIDTH_OPTIONS.map(({ paperWidthMm: width }) => (
            <FilterChip
              key={width}
              testID={`paper-${width}`}
              text={`${width} mm`}
              selected={paperWidthMm === width}
              onPress={() => onPaperWidth(width)}
            />
          ))}
        </View>
      </View>

      <ONotice variant='info' testID='printer-add-notice'>{notice}</ONotice>
      {brand === 'epson' && connection === CONNECTION.LAN && (
        <ONotice variant='warning'>
          {t('PRINTER_ETHERNET_SKU_WARNING', 'Use an Ethernet or Wi‑Fi model. USB + Serial SKUs will not work over the network.')}
        </ONotice>
      )}
    </KeyboardScrollView>
  )
}

export default PrinterAdd
