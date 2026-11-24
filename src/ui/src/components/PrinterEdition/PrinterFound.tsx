import React, { useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeGutter, themeSpace } from '@/theme/helpers'
import {
  CONNECTION, getPrintersByDriver,
  type ConnectionType, type DiscoveredPrinter, type PrinterDriver
} from '../../../../printing'
import { useFormats } from '@/hooks/useFormats'
import { ChoiceRow, FieldError, Icon, IconTile, KeyboardScrollView, OButton, OLink, OCard, OInput, ONotice, OSelect, OSpinner, OText, SectionTitle } from '../shared'

export type TestState = { status: 'idle' | 'running' } | { status: 'ok', at: number } | { status: 'failed', message?: string }

interface Props {
  brand: PrinterDriver
  connection: ConnectionType
  devices: DiscoveredPrinter[]
  searching: boolean
  message?: string
  /** The search could not run: the system permission is refused (Android's "Nearby devices"). */
  permissionDenied?: boolean
  onOpenSettings?: () => void
  selectedId: string | null
  onSelect: (device: DiscoveredPrinter) => void
  onSearch: () => void
  manual: boolean
  onManual: (on: boolean) => void
  address: string
  onAddress: (address: string) => void
  addressInvalid: boolean
  /** The catalog model the printer will be saved as (derived from the found device, or picked). */
  model?: string
  /** The model must be asked: the device did not say one the catalog knows, or the address was typed. */
  askModel: boolean
  onModel: (model: string) => void
  name: string
  onName: (name: string) => void
  nameInvalid: boolean
  test: TestState
  canTest: boolean
  onTest: () => void
}

/** Step 2 of the wizard: the printers found (all of them), a name, and a test ticket. */
/**
 * The keyboard of the address field. A LAN address is digits and dots: iOS has a layout of exactly that, Android's decimal pad
 * (its IME types the locale's separator, a comma in some: the typed commas are turned into dots by the field's handler). A
 * Bluetooth address has letters and colons, so it keeps the full keyboard. (`OInput` reads `type`, not `keyboardType`.)
 */
export const addressKeyboard = (connection: unknown): string =>
  connection === CONNECTION.LAN ? (Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad') : 'default'

export const PrinterFound = (props: Props) => {
  const {
    brand, connection, devices, searching, message, permissionDenied, onOpenSettings, selectedId, onSelect, onSearch, manual, onManual, address, onAddress,
    addressInvalid, model, askModel, onModel, name, onName, nameInvalid, test, canTest, onTest
  } = props
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const { time } = useFormats()

  const styles = useMemo(() => StyleSheet.create({
    content: { paddingHorizontal: themeGutter(theme), paddingTop: themeSpace(theme, 'md'), paddingBottom: themeSpace(theme, 'xl'), gap: themeSpace(theme, 'lg') },
    section: { gap: themeSpace(theme, 'xs') },
    // The title shares its row with the search button: the row owns the space under it.
    headTitle: { flex: 1, marginBottom: 0 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    grow: { flex: 1 },
    rowTexts: { flex: 1 },
    searching: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeSpace(theme, 'xxxl') },
    link: { alignSelf: 'flex-start' },
    testBox: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    notices: { gap: themeSpace(theme, 'sm') }
  }), [theme])

  const modelOptions = useMemo(
    () => getPrintersByDriver(brand).map((item) => ({ value: item.model, label: item.model })),
    [brand]
  )

  const title = connection === CONNECTION.LAN
    ? t('FOUND_ON_YOUR_NETWORK', 'Found on your network')
    : t('FOUND_NEARBY', 'Found near you')
  const manualLabel = connection === CONNECTION.LAN
    ? t('ENTER_IP_INSTEAD', 'Enter the IP address instead')
    : t('ENTER_ADDRESS_INSTEAD', 'Enter the address instead')
  const searchLabel = t('SEARCH_AGAIN', 'Search again')
  const typedLabel = connection === CONNECTION.LAN ? t('PRINTER_IP_ADDRESS', 'IP address') : t('BLUETOOTH_PORT', 'Bluetooth port')
  const typedInvalid = connection === CONNECTION.LAN
    ? t('PRINTER_INVALID_IP_ADDRESS', 'Invalid IP address')
    : t('INVALID_ERROR_BLUETOOTH_PORT_NAME', 'Invalid bluetooth port name')
  const typedExample = connection === CONNECTION.LAN ? '192.168.1.40' : '00-11-62-06-CA-4D'

  return (
    <KeyboardScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {!manual && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionTitle style={styles.headTitle}>{title}</SectionTitle>
            <OButton
              iconOnly
              testID='printer-search'
              appearance='ghost'
              color='neutral'
              icon={<Icon name='refresh' />}
              accessibilityLabel={searchLabel}
              disabled={searching}
              onClick={onSearch}
            />
          </View>
          {searching && (
            <View style={styles.searching} testID='printer-searching'>
              <OSpinner size='sm' />
              <OText color='text_muted'>{t('SEARCHING_PRINTERS', 'Looking for printers...')}</OText>
            </View>
          )}
          {!searching && devices.length === 0 && !permissionDenied && (
            <OText color='text_muted' testID='printer-none-found'>{message ?? t('NO_PRINTERS_FOUND', 'No printers found')}</OText>
          )}
          {!searching && devices.length === 0 && permissionDenied && (
            <ONotice
              variant='warning'
              testID='printer-permission-denied'
              title={message}
              action={{ text: t('OPEN_SETTINGS', 'Open settings'), testID: 'printer-open-settings', onPress: () => onOpenSettings?.() }}
            >
              {t('PRINTER_PERMISSION_HELP', 'Allow "Nearby devices" for this app in the system settings, then come back: the search runs again.')}
            </ONotice>
          )}
          <View testID='printer-found-list'>
            {devices.map((device, index) => (
              <ChoiceRow
                key={device.id}
                testID={`found-${index}`}
                selected={selectedId === device.id}
                last={index === devices.length - 1}
                onPress={() => onSelect(device)}
              >
                <IconTile icon='print-outline' size='md' />
                <View style={styles.rowTexts}>
                  <OText preset='label' numberOfLines={1}>{device.model ?? (device.name || device.id)}</OText>
                  <OText preset='body_sm' color='text_muted' numberOfLines={1}>{device.id}</OText>
                </View>
              </ChoiceRow>
            ))}
          </View>
          {connection !== CONNECTION.USB && (
            <OLink testID='printer-enter-manually' PressStyle={styles.link} shorcut={manualLabel} onPress={() => onManual(true)} />
          )}
        </View>
      )}

      {manual && (
        <View style={styles.section}>
          {connection !== CONNECTION.USB && (
            <>
              <OInput
                testID='printer-address'
                label={typedLabel}
                placeholder={typedExample}
                value={address}
                hasError={addressInvalid}
                autoCapitalize='none'
                autoCorrect={false}
                type={addressKeyboard(connection)}
                onChange={(value: string) => onAddress(connection === CONNECTION.LAN ? value.replace(/,/g, '.') : value)}
              />
              {addressInvalid && <FieldError>{typedInvalid}</FieldError>}
            </>
          )}
          <OLink testID='printer-search-instead' PressStyle={styles.link} shorcut={t('SEARCH_AGAIN', 'Search again')} onPress={() => { onManual(false); onSearch() }} />
        </View>
      )}

      {askModel && (
        <View style={styles.section}>
          <SectionTitle>{t('MODEL', 'Model')}</SectionTitle>
          <OSelect
            testID='printer-model'
            title={t('CHOOSE_PRINTER_MODEL', 'Choose the printer model')}
            placeholder={t('CHOOSE_PRINTER_MODEL', 'Choose the printer model')}
            options={modelOptions}
            value={model}
            onSelect={(value) => onModel(value)}
          />
        </View>
      )}

      <View style={styles.section}>
        <OInput
          testID='printer-name'
          label={t('PRINTER_NAME', 'Name')}
          placeholder={`${t('EXAMPLE_SHORT', 'Ex:')} ${t('NICKNAME_EXAMPLE_TEXT', 'Kitchen printer')}`}
          value={name}
          hasError={nameInvalid}
          onChange={onName}
        />
        {nameInvalid
          ? <FieldError>{t('INVALID_ERROR_PRINTER_NICKNAME', 'Invalid Nickname')}</FieldError>
          : <OText preset='body_sm' color='text_muted'>{t('PRINTER_NAME_HINT', 'Shown on the print button.')}</OText>}
      </View>

      <View style={styles.notices}>
        <OCard variant='muted'>
          <View style={styles.testBox}>
            <View style={styles.rowTexts}>
              <OText preset='label'>{t('TEST_PRINT', 'Test print')}</OText>
              <OText preset='body_sm' color='text_muted'>{t('TEST_PRINT_HINT', 'Prints a short ticket to check the connection.')}</OText>
            </View>
            <OButton
              testID='printer-test'
              text={t('TEST_PRINT', 'Test print')}
              appearance='tonal'
              loading={test.status === 'running'}
              disabled={!canTest}
              onClick={onTest}
            />
          </View>
        </OCard>
        {test.status === 'ok' && (
          <ONotice variant='success' testID='printer-test-ok'>
            {t('TEST_TICKET_SENT', 'Test ticket sent at _time_.').replace('_time_', time(test.at))}
          </ONotice>
        )}
        {test.status === 'failed' && (
          <ONotice variant='danger' testID='printer-test-failed'>
            {test.message ?? t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed')}
          </ONotice>
        )}
      </View>
    </KeyboardScrollView>
  )
}

export default PrinterFound
