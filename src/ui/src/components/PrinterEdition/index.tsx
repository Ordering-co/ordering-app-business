import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, BackHandler, Linking, Platform, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeGutter } from '@/theme/helpers'
import {
  CONNECTION, NICKNAME, buildPrinterItem, getPrintersByDriver, isValidAddress, normalizePrinterDriver, printerAddress,
  resolvePaperWidth, storePrinter, usePrinting,
  type ConnectionType, type DiscoveredPrinter, type PrinterCatalogItem, type PrinterDriver
} from '../../../../printing'
import { SafeAreaContainerLayout } from '../../layouts/SafeAreaContainer'
import { Icon, KeyboardScreen, OBottomBar, OButton, ONavbar, OProgress, ScreenContainer } from '../shared'
import { PrinterAdd, connectionsOf, defaultConnectionOf } from './PrinterAdd'
import { PrinterFound, type TestState } from './PrinterFound'

interface Props {
  /** The printer to edit (with its `index` in the saved list); none adds one. */
  printer?: any
  /** Leave the wizard (saved, or backed out of step 1). */
  onClose?: () => void
  navigation?: any
  /** Drawn inside a pane (the tablet's detail): no safe area and no column of its own. */
  embedded?: boolean
}

const catalogOf = (printer: any, brand: PrinterDriver, model?: string): PrinterCatalogItem | undefined =>
  getPrintersByDriver(brand).find((item) => item.model === (model ?? printer?.model)) ?? (printer?.model ? printer : undefined)

/**
 * The add / edit printer wizard, two steps: the brand, how it connects and its paper (step 1), then the printers
 * found (all of them), the name and a test ticket (step 2). Editing opens it on the stored values, and step 2 starts
 * with the stored printer selected (no search until asked: a Bluetooth search can open a pairing sheet). Saves the same
 * record the old form saved.
 */
export const PrinterEdition = (props: Props) => {
  const { printer, onClose, navigation, embedded } = props
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const printing = usePrinting()
  const editing = !!printer
  const stored = useMemo(() => ({ address: printerAddress(printer), driver: normalizePrinterDriver(printer) }), [printer])

  const [step, setStep] = useState<1 | 2>(1)
  const [brand, setBrand] = useState<PrinterDriver>(stored.driver)
  const [connection, setConnection] = useState<ConnectionType>((printer?.type as ConnectionType) ?? defaultConnectionOf(stored.driver))
  const [paperWidthMm, setPaperWidthMm] = useState<number>(resolvePaperWidth(printer?.paperWidthMm).paperWidthMm)

  const seed: DiscoveredPrinter[] = editing && (stored.address || connection === CONNECTION.USB)
    ? [{ id: stored.address || 'USB', name: printer.nickname || printer.model, model: printer.model, brand: stored.driver, connection: printer.type }]
    : []
  const [devices, setDevices] = useState<DiscoveredPrinter[]>(seed)
  const [selectedId, setSelectedId] = useState<string | null>(seed[0]?.id ?? null)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const [permissionDenied, setPermissionDenied] = useState(false)
  const settingsOpened = useRef(false)
  const [manual, setManual] = useState(false)
  const [address, setAddress] = useState(stored.address)
  const [pickedModel, setPickedModel] = useState<string | undefined>(printer?.model)
  const [name, setName] = useState<string>(printer?.nickname ?? '')
  const [nameTouched, setNameTouched] = useState(!!printer?.nickname)
  const [test, setTest] = useState<TestState>({ status: 'idle' })
  const [saving, setSaving] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const usbSupported = Platform.OS === 'android'
  const selected = devices.find((device) => device.id === selectedId)
  // What will be saved: the typed address and picked model, or the selected device's.
  const effectiveAddress = manual ? address.trim() : (selected?.id === 'USB' ? '' : selected?.id ?? '')
  const effectiveModel = brand === 'generic'
    ? getPrintersByDriver('generic')[0].model
    : manual ? pickedModel : selected?.model ?? pickedModel
  const askModel = brand !== 'generic' && (manual || (!!selected && !selected.model) || (connection === CONNECTION.USB && !selected?.model))
  const addressInvalid = manual && connection !== CONNECTION.USB && address.trim() !== '' && !isValidAddress(connection, address)
  const addressReady = connection === CONNECTION.USB
    ? usbSupported
    : manual ? isValidAddress(connection, address) && address.trim() !== '' : !!selected
  const nameInvalid = name.trim() !== '' && !NICKNAME.test(name)
  const catalog = effectiveModel ? catalogOf(printer, brand, effectiveModel) : undefined
  const ready = !!catalog && addressReady && !nameInvalid

  const draftPrinter = () => catalog
    ? buildPrinterItem({ catalog, nickname: name || catalog.model, paperWidthMm, connection, address: effectiveAddress })
    : undefined

  const styles = useMemo(() => StyleSheet.create({
    fill: { flex: 1 },
    progress: { paddingHorizontal: themeGutter(theme) }
  }), [theme])

  const close = useCallback(() => {
    if (onClose) onClose()
    else navigation?.canGoBack?.() && navigation.goBack()
  }, [onClose, navigation])

  const back = useCallback(() => {
    if (step === 2) setStep(1)
    else close()
  }, [step, close])

  useEffect(() => {
    if (step !== 2) return undefined
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setStep(1); return true })
    return () => subscription.remove()
  }, [step])

  const search = async () => {
    setSearching(true)
    setMessage(undefined)
    setPermissionDenied(false)
    setTest({ status: 'idle' })
    const result = await printing.discover({ brand, connection })
    if (!alive.current) return
    setSearching(false)
    setMessage(result.message)
    setPermissionDenied(!!result.permissionDenied)
    // The stored printer (editing) stays in the list when the search does not find it again.
    const keep = editing && selectedId && !result.devices.some((device) => device.id === selectedId)
      ? devices.filter((device) => device.id === selectedId)
      : []
    const all = [...keep, ...result.devices]
    setDevices(all)
    if (!all.some((device) => device.id === selectedId)) {
      setSelectedId(all[0]?.id ?? null)
      if (!nameTouched && all[0]) setName(all[0].model ?? all[0].name)
    }
  }

  const changeBrand = (next: PrinterDriver) => {
    if (next === brand) return
    setBrand(next)
    setConnection(connectionsOf(next).includes(connection) ? connection : defaultConnectionOf(next))
    setDevices([]); setSelectedId(null); setManual(false); setAddress(''); setPickedModel(undefined); setMessage(undefined); setPermissionDenied(false)
    setTest({ status: 'idle' })
  }

  const changeConnection = (next: ConnectionType) => {
    if (next === connection) return
    setConnection(next)
    setDevices([]); setSelectedId(null); setManual(false); setAddress(''); setMessage(undefined); setPermissionDenied(false)
    setTest({ status: 'idle' })
  }

  // "Open settings": the permission is switched on there, and the search runs again when the app comes back.
  const openSettings = () => {
    settingsOpened.current = true
    Linking.openSettings().catch(() => { settingsOpened.current = false })
  }

  const searchRef = useRef(search)
  searchRef.current = search
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && settingsOpened.current) {
        settingsOpened.current = false
        searchRef.current()
      }
    })
    return () => subscription?.remove?.()
  }, [])

  const next = () => {
    setStep(2)
    // Adding starts a search; editing starts on the stored printer.
    if (!editing || devices.length === 0) search()
  }

  const select = (device: DiscoveredPrinter) => {
    setSelectedId(device.id)
    setTest({ status: 'idle' })
    if (!nameTouched) setName(device.model ?? device.name)
  }

  const runTest = async () => {
    const item = draftPrinter()
    if (!item) return
    setTest({ status: 'running' })
    const outcome = await printing.testPrint(item)
    if (!alive.current) return
    setTest(outcome.ok ? { status: 'ok', at: outcome.at } : { status: 'failed', message: outcome.message })
  }

  const save = async () => {
    const item = draftPrinter()
    if (!item || saving) return
    setSaving(true)
    try {
      await storePrinter({
        item: editing ? { ...printer, ...item, index: undefined } : item,
        type: item.type,
        ip: item.ip,
        index: printer?.index ?? null,
        edit: editing,
        isAdd: !editing
      })
      close()
    } finally {
      if (alive.current) setSaving(false)
    }
  }

  const title = editing ? t('EDIT_PRINTER', 'Edit printer') : t('ADD_PRINTER', 'Add printer')
  const stepText = t('STEP_OF', 'Step _step_ of _total_').replace('_step_', String(step)).replace('_total_', '2')

  const frame = (
    <KeyboardScreen enabled behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
      <ONavbar
        title={title}
        subtitle={stepText}
        onBack={embedded && step === 1 ? undefined : back}
        rightButtons={embedded}
        // A wizard that is the pane's only content (no printer yet, nothing to go back to) has no close button.
        right={embedded && !!onClose
          ? (
            <OButton
              iconOnly
              testID='printer-wizard-close'
              appearance='ghost'
              color='neutral'
              icon={<Icon name='close' size='lg' />}
              accessibilityLabel={t('CLOSE', 'Close')}
              onClick={close}
            />
          )
          : undefined}
        tight
        testID='printer-wizard-bar'
      />
      <View style={styles.progress}>
        <OProgress variant='steps' steps={2} step={step} testID='printer-wizard-progress' />
      </View>
      <View style={styles.fill}>
        {step === 1
          ? (
            <PrinterAdd
              brand={brand}
              connection={connection}
              paperWidthMm={paperWidthMm}
              onBrand={changeBrand}
              onConnection={changeConnection}
              onPaperWidth={setPaperWidthMm}
            />
          )
          : (
            <PrinterFound
              brand={brand}
              connection={connection}
              devices={devices}
              searching={searching}
              message={message}
              permissionDenied={permissionDenied}
              onOpenSettings={openSettings}
              selectedId={selectedId}
              onSelect={select}
              onSearch={search}
              manual={manual}
              onManual={(on) => { setManual(on); setTest({ status: 'idle' }) }}
              address={address}
              onAddress={(value) => { setAddress(value); setTest({ status: 'idle' }) }}
              addressInvalid={addressInvalid}
              model={effectiveModel}
              askModel={askModel}
              onModel={setPickedModel}
              name={name}
              onName={(value) => { setName(value); setNameTouched(true) }}
              nameInvalid={nameInvalid}
              test={test}
              canTest={ready}
              onTest={runTest}
            />
          )}
      </View>
      <OBottomBar
        testID='printer-wizard-bar-actions'
        actions={step === 1
          ? [{
            testID: 'printer-next',
            text: editing ? t('CONTINUE', 'Continue') : t('FIND_PRINTERS', 'Find printers'),
            disabled: connection === CONNECTION.USB && !usbSupported,
            onClick: next
          }]
          : [{
            testID: 'printer-save',
            text: t('SAVE_PRINTER_BUTTON', 'Save printer'),
            disabled: !ready,
            loading: saving,
            onClick: save
          }]}
      />
    </KeyboardScreen>
  )

  return embedded
    ? <View style={styles.fill}>{frame}{printing.host}</View>
    : (
      <SafeAreaContainerLayout>
        <ScreenContainer testID='printer-wizard'>{frame}</ScreenContainer>
        {printing.host}
      </SafeAreaContainerLayout>
    )
}

export default PrinterEdition
