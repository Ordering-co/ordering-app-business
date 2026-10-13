import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Dimensions, Platform, StyleSheet, View } from 'react-native'
import SelectDropdown from 'react-native-select-dropdown'
import { useTheme } from 'styled-components/native'
import { useForm, Controller } from 'react-hook-form'
import FAIcons from 'react-native-vector-icons/FontAwesome'
import MCIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import FeatherIcon from 'react-native-vector-icons/Feather'

import {
  getPrintersByDriver,
  normalizePrinterDriver,
  type PrinterDriver
} from './printerList'
import {
  PAPER_WIDTH_OPTIONS,
  resolvePaperWidth
} from './paperWidth'
import { MessageAlert } from './MessageAlert'
import { savePrinter } from './savePrinter'

import {
  ContainerEdition,
  WrapperIcons,
  WrapperIcon
} from './styles'

import { OText, OInput, OButton, ONavbar } from '@ui'
import { useLanguage } from '@components'

import { usePrinterCommands } from '../TicketPreview/usePrinterCommands'

const CONNECTION = {
  BLUETOOTH: 1,
  LAN: 2,
  USB: 3
} as const

const buildPrinterDefaults = (printer: any) => ({
  ...printer,
  driver: normalizePrinterDriver(printer),
  paperWidthMm: resolvePaperWidth(printer?.paperWidthMm).paperWidthMm,
  ip: printer?.ip ?? '',
  type: printer?.type ?? CONNECTION.BLUETOOTH,
  nickname: printer?.nickname ?? printer?.model,
  portName1: printer?.portName1 ?? '',
  bt: printer?.bt ?? ''
})

export const PrinterEdition = (props: any) => {
  const { printer, onClose, navigation, handleChangePrinter: onChangePrinter } = props

  const HEIGHT_SCREEN = Dimensions.get('window').height
  const [, t] = useLanguage()
  const theme = useTheme()
  const { control, setValue, watch } = useForm()
  const isUsbSupported = Platform.OS === 'android'

  const goToBack = () => {
    if (onClose) {
      onClose()
      return
    }
    navigation?.canGoBack?.() && navigation.goBack()
  }

  const [brand, setBrand] = useState<PrinterDriver>(normalizePrinterDriver(printer))
  const [currentPrinter, setCurrentPrinter] = useState(
    printer ? buildPrinterDefaults(printer) : null
  )
  const [discoverPort, setDiscoverPort] = useState({ loading: false, msg: null })

  const { discoveryPrinterPort } = usePrinterCommands()

  const brandPrinterList = useMemo(
    () => getPrintersByDriver(brand).map((item) => buildPrinterDefaults(item)),
    [brand]
  )

  const watchIp = watch('ip')
  const watchBt = watch('bt')
  const watchNickname = watch('nickname')
  const errorIP = !/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i.test(watchIp)
  const errorBT = !/^[^\n]*$/i.test(watchBt) || !watchBt
  const isErrorInput = currentPrinter?.type === CONNECTION.LAN
    ? errorIP
    : currentPrinter?.type === CONNECTION.BLUETOOTH
      ? errorBT
      : false
  const isErrorNickname = watchNickname && !/^[^\n]*$/i.test(watchNickname)
  const driver = normalizePrinterDriver(currentPrinter)
  const isEpson = driver === 'epson'
  const connectionType = currentPrinter?.type

  const styles = StyleSheet.create({
    icons: {
      maxWidth: 40,
      height: 40,
      padding: 10,
      alignItems: 'flex-end'
    },
    optionIcons: {
      paddingRight: 10
    },
    inputStyle: {
      borderWidth: 1,
      borderRadius: 8,
      color: theme.colors.arrowColor,
      borderColor: theme.colors.inputSignup,
      backgroundColor: theme.colors.transparent,
      minHeight: 50,
      maxHeight: 50
    },
    savePrinterBtnText: {
      color: theme.colors.white,
      fontSize: 18
    },
    savePrinterBtn: {
      height: 50,
      borderRadius: 8,
      marginHorizontal: 20
    },
    helperText: {
      paddingTop: 8,
      paddingBottom: 4,
      opacity: 0.75
    },
    brandRow: {
      flexDirection: 'row',
      marginTop: 8,
      marginBottom: 4
    },
    screen: {
      flex: 1,
      marginBottom: 20
    },
    content: {
      flex: 1,
      paddingHorizontal: 20
    }
  })

  const handleChangePrinter = async (values: any) => {
    const nextPrinter = {
      ...currentPrinter,
      driver: normalizePrinterDriver(currentPrinter)
    }
    const payload = {
      ...values,
      index: currentPrinter?.index ?? null,
      type: currentPrinter?.type,
      ip: currentPrinter?.ip,
      item: nextPrinter
    }
    if (onChangePrinter) {
      await onChangePrinter(payload)
      return
    }
    await savePrinter(payload)
  }

  const portDiscovery = async (selectedPrinter?: any) => {
    const target = selectedPrinter ?? currentPrinter
    const driver = normalizePrinterDriver(target)
    const connection = target?.type ?? currentPrinter?.type ?? CONNECTION.BLUETOOTH

    if (connection === CONNECTION.USB && !isUsbSupported) {
      setDiscoverPort({
        loading: false,
        msg: t('PRINTER_USB_IOS_UNAVAILABLE', 'USB printing is available on Android only.')
      })
      return
    }

    try {
      setDiscoverPort({ ...discoverPort, loading: true, msg: null })
      const printers: any = await discoveryPrinterPort(connection, driver)

      if (Array.isArray(printers) && printers?.length) {
        const identifier = printers[0]?.connectionSettings?.identifier
        if (connection === CONNECTION.LAN) {
          setValue('ip', identifier)
          setCurrentPrinter({
            ...currentPrinter,
            ...target,
            ip: identifier,
            portName: identifier
          })
        } else if (connection === CONNECTION.USB) {
          setCurrentPrinter({
            ...currentPrinter,
            ...target,
            type: CONNECTION.USB,
            portName: identifier || 'USB'
          })
        } else {
          setValue('bt', identifier)
          setCurrentPrinter({
            ...currentPrinter,
            ...target,
            portName1: identifier,
            bt: identifier,
            portName: identifier
          })
        }
      }
      setDiscoverPort({
        ...discoverPort,
        loading: false,
        msg: !(Array.isArray(printers) && printers?.length)
          ? Array.isArray(printers) ? t('NO_PRINTERS_FOUND', 'No printers found') : printers
          : null
      })
    } catch (e) {
      if (connection === CONNECTION.LAN) {
        setValue('ip', currentPrinter?.ip || currentPrinter?.portName)
      } else {
        setValue('bt', currentPrinter?.portName)
        setCurrentPrinter({
          ...currentPrinter,
          bt: currentPrinter?.portName
        })
      }
      setDiscoverPort({ ...discoverPort, loading: false, msg: null })
    }
  }

  const onSubmit = async () => {
    await handleChangePrinter({ edit: !!printer, isAdd: !printer })
    goToBack()
  }

  const handleSelectBrand = (nextBrand: PrinterDriver) => {
    setBrand(nextBrand)
    setDiscoverPort({ loading: false, msg: null })
    if (normalizePrinterDriver(currentPrinter) !== nextBrand) {
      setCurrentPrinter(null)
      setValue('ip', '')
      setValue('bt', '')
      setValue('nickname', '')
    }
  }

  const handleSelectConnection = (type: number) => {
    // Allow selecting USB on iOS so the unavailable helper is visible; save stays disabled.
    setCurrentPrinter({
      ...currentPrinter,
      type,
      ip: type === CONNECTION.LAN ? currentPrinter?.ip ?? '' : '',
      bt: type === CONNECTION.BLUETOOTH ? currentPrinter?.bt ?? '' : '',
      portName: type === CONNECTION.USB
        ? (isUsbSupported ? (currentPrinter?.portName?.startsWith?.('USB') ? currentPrinter.portName : 'USB') : 'USB')
        : type === CONNECTION.BLUETOOTH
          ? currentPrinter?.portName1 ?? currentPrinter?.bt
          : currentPrinter?.ip
    })
  }

  const isSaveDisabled = () => {
    if (isErrorNickname || !currentPrinter?.model) return true
    if (connectionType === CONNECTION.BLUETOOTH && !currentPrinter?.bt) return true
    if (connectionType === CONNECTION.LAN && !currentPrinter?.ip) return true
    if (connectionType === CONNECTION.USB && !isUsbSupported) return true
    return false
  }

  useEffect(() => {
    currentPrinter?.ip && setValue('ip', currentPrinter?.ip)
    currentPrinter?.bt && setValue('bt', currentPrinter?.bt)
    currentPrinter?.nickname && setValue('nickname', currentPrinter?.nickname)
  }, [currentPrinter?.type])

  useEffect(() => {
    if (printer) {
      const next = buildPrinterDefaults(printer)
      setBrand(normalizePrinterDriver(next))
      setCurrentPrinter(next)
    } else {
      setCurrentPrinter(null)
    }
  }, [printer])

  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 15 }}>
        <ONavbar
          title={t('PRINTER_CONFIGURE', 'Printer Configure')}
          onBack={() => goToBack()}
        />
      </View>
      <View style={styles.content}>
        <ContainerEdition>
          <OText
            size={20}
            style={{ paddingTop: 0, marginBottom: 10 }}
          >
            {`${t('PRINTER_BRAND', 'Brand')}:`}
          </OText>
          <View style={styles.brandRow}>
            <WrapperIcon
              activeOpacity={1}
              style={{
                flex: 1,
                marginRight: 8,
                borderColor: brand === 'star' ? theme.colors.primary : theme.colors.textGray
              }}
              onPress={() => handleSelectBrand('star')}
            >
              <OText
                size={16}
                color={brand === 'star' ? theme.colors.primary : theme.colors.textGray}
                style={{ paddingTop: 0 }}
              >
                {t('PRINTER_BRAND_STAR', 'Star Micronics')}
              </OText>
            </WrapperIcon>
            <WrapperIcon
              activeOpacity={1}
              style={{
                flex: 1,
                borderColor: brand === 'epson' ? theme.colors.primary : theme.colors.textGray
              }}
              onPress={() => handleSelectBrand('epson')}
            >
              <OText
                size={16}
                color={brand === 'epson' ? theme.colors.primary : theme.colors.textGray}
                style={{ paddingTop: 0 }}
              >
                {t('PRINTER_BRAND_EPSON', 'Epson')}
              </OText>
            </WrapperIcon>
          </View>

          <SelectDropdown
            data={brandPrinterList}
            defaultValueByIndex={brandPrinterList.findIndex(p => p.model === currentPrinter?.model)}
            dropdownOverlayColor='transparent'
            defaultButtonText={t('SELECT_PRINTER', 'Select printer')}
            buttonTextAfterSelection={(item: any) => item.model}
            rowTextForSelection={(item: any) => item.model}
            renderDropdownIcon={() => dropDownIcon()}
            buttonStyle={{
              width: '100%',
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              flexDirection: 'row-reverse',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 50,
              marginTop: 12
            }}
            buttonTextStyle={{
              color: theme.colors.white,
              fontSize: 18,
              textAlign: 'left',
              marginHorizontal: 0
            }}
            dropdownStyle={{
              borderRadius: 8,
              borderColor: theme.colors.primary,
              maxHeight: HEIGHT_SCREEN * 0.3
            }}
            rowStyle={{
              borderBottomColor: theme.colors.disabled,
              backgroundColor: theme.colors.gray100,
              height: 40,
              flexDirection: 'column',
              alignItems: 'flex-start',
              paddingTop: 8,
              paddingHorizontal: 14,
              width: '100%'
            }}
            rowTextStyle={{
              marginHorizontal: 0,
              fontSize: 14
            }}
            onSelect={(item: any) => {
              const next = buildPrinterDefaults({
                ...item,
                index: currentPrinter?.index,
                nickname: currentPrinter?.nickname || item.model,
                type: currentPrinter?.type ?? CONNECTION.BLUETOOTH,
                ip: currentPrinter?.ip ?? '',
                bt: currentPrinter?.bt ?? ''
              })
              setCurrentPrinter(next)
              if (normalizePrinterDriver(next) === 'star' && next.type === CONNECTION.BLUETOOTH) {
                portDiscovery(next)
              }
            }}
          />
          {!!currentPrinter && (
            <WrapperIcons>
              <OText
                size={20}
                style={{ paddingTop: 0, marginBottom: 10 }}
              >
                {`${t('PRINTER_NICKNAME', 'Nickname')}:`}
              </OText>
              <Controller
                control={control}
                name={'nickname'}
                rules={{
                  pattern: {
                    value: /^[a-zA-Z0-9\s]+$/i,
                    message: t('INVALID_ERROR_PRINTER_NICKNAME', 'Invalid Nickname')
                  }
                }}
                defaultValue={currentPrinter?.nickname ?? ''}
                render={() => (
                  <OInput
                    placeholder={`${t('EXAMPLE_SHORT', 'Ex:')} ${t('NICKNAME_EXAMPLE_TEXT', 'Kitchen printer')}`}
                    placeholderTextColor={theme.colors.arrowColor}
                    style={{
                      ...styles.inputStyle,
                      borderColor: isErrorNickname ? theme.colors.danger500 : theme.colors.tabBar,
                      marginBottom: 10
                    }}
                    value={currentPrinter?.nickname ?? ''}
                    selectionColor={theme.colors.primary}
                    color={theme.colors.textGray}
                    onChange={(value: any) => {
                      setValue('nickname', value)
                      setCurrentPrinter({
                        ...currentPrinter,
                        nickname: value
                      })
                    }}
                  />
                )}
              />
              <OText
                size={20}
                style={{ paddingTop: 0, marginBottom: 10 }}
              >
                {`${t('PAPER_WIDTH', 'Paper width')}:`}
              </OText>
              <SelectDropdown
                data={PAPER_WIDTH_OPTIONS}
                defaultValueByIndex={PAPER_WIDTH_OPTIONS.findIndex(
                  ({ paperWidthMm }) => paperWidthMm === currentPrinter?.paperWidthMm
                )}
                dropdownOverlayColor='transparent'
                defaultButtonText={t('SELECT_PAPER_WIDTH', 'Select paper width')}
                buttonTextAfterSelection={(item: any) =>
                  item.paperWidthMm === 80
                    ? t('PAPER_WIDTH_80_DEFAULT', '80 mm (Default)')
                    : `${item.paperWidthMm} mm`
                }
                rowTextForSelection={(item: any) =>
                  item.paperWidthMm === 80
                    ? t('PAPER_WIDTH_80_DEFAULT', '80 mm (Default)')
                    : `${item.paperWidthMm} mm`
                }
                renderDropdownIcon={() => dropDownIcon()}
                buttonStyle={{
                  width: '100%',
                  backgroundColor: theme.colors.primary,
                  borderRadius: 8,
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: 50,
                  marginBottom: 20
                }}
                buttonTextStyle={{
                  color: theme.colors.white,
                  fontSize: 18,
                  textAlign: 'left',
                  marginHorizontal: 0
                }}
                dropdownStyle={{
                  borderRadius: 8,
                  borderColor: theme.colors.primary
                }}
                rowStyle={{
                  borderBottomColor: theme.colors.disabled,
                  backgroundColor: theme.colors.gray100,
                  height: 40
                }}
                rowTextStyle={{
                  fontSize: 14
                }}
                onSelect={(item: any) => {
                  setCurrentPrinter({
                    ...currentPrinter,
                    paperWidthMm: item.paperWidthMm
                  })
                }}
              />
              <OText
                size={20}
                style={{ paddingTop: 0, marginBottom: 10 }}
              >
                {`${t('CONNECTION_TYPE', 'Connection type')}:`}
              </OText>
              <WrapperIcon
                activeOpacity={1}
                style={{
                  borderColor: connectionType === CONNECTION.BLUETOOTH ? theme.colors.primary : theme.colors.textGray
                }}
                onPress={() => handleSelectConnection(CONNECTION.BLUETOOTH)}
              >
                <FAIcons
                  name='bluetooth'
                  size={22}
                  {...(connectionType === CONNECTION.BLUETOOTH ? { color: theme.colors.primary } : {})}
                  style={styles.optionIcons}
                />
                <OText
                  size={18}
                  style={{ paddingTop: 0 }}
                >
                  {t('CONNECTION_VIA_BLUETOOTH', 'Via Bluetooth')}
                </OText>
              </WrapperIcon>
              <WrapperIcon
                activeOpacity={1}
                style={{
                  borderColor: connectionType === CONNECTION.LAN ? theme.colors.primary : theme.colors.textGray
                }}
                onPress={() => handleSelectConnection(CONNECTION.LAN)}
              >
                <MCIcons
                  name='access-point-network'
                  size={22}
                  {...(connectionType === CONNECTION.LAN ? { color: theme.colors.primary } : {})}
                  style={styles.optionIcons}
                />
                <OText
                  size={18}
                  style={{ paddingTop: 0 }}
                >
                  {t('CONNECTION_VIA_LAN_WLAN', 'Via LAN / Wi‑Fi')}
                </OText>
              </WrapperIcon>
              {isEpson && (
                <WrapperIcon
                  activeOpacity={isUsbSupported ? 1 : 0.5}
                  style={{
                    opacity: isUsbSupported ? 1 : 0.45,
                    borderColor: connectionType === CONNECTION.USB ? theme.colors.primary : theme.colors.textGray
                  }}
                  onPress={() => handleSelectConnection(CONNECTION.USB)}
                >
                  <MCIcons
                    name='usb'
                    size={22}
                    {...(connectionType === CONNECTION.USB && isUsbSupported ? { color: theme.colors.primary } : {})}
                    style={styles.optionIcons}
                  />
                  <OText
                    size={18}
                    style={{ paddingTop: 0 }}
                  >
                    {t('CONNECTION_VIA_USB', 'Via USB')}
                  </OText>
                </WrapperIcon>
              )}

              {isEpson && connectionType === CONNECTION.LAN && (
                <OText size={13} color={theme.colors.textGray} style={styles.helperText}>
                  {t(
                    'PRINTER_ETHERNET_SKU_WARNING',
                    'Use an Ethernet or Wi‑Fi model. USB + Serial SKUs will not work over the network.'
                  )}
                </OText>
              )}
              {connectionType === CONNECTION.BLUETOOTH && (
                <OText size={13} color={theme.colors.textGray} style={styles.helperText}>
                  {t(
                    'PRINTER_BLUETOOTH_CAVEAT',
                    'Bluetooth can be unreliable (pairing, range, interference). Prefer LAN / Wi‑Fi when possible.'
                  )}
                </OText>
              )}
              {isEpson && connectionType === CONNECTION.USB && (
                <>
                  <OText size={13} color={theme.colors.textGray} style={styles.helperText}>
                    {isUsbSupported
                      ? t(
                        'PRINTER_USB_CAVEAT',
                        'Keep the device awake and charging when possible. Moving the cable may disconnect the printer.'
                      )
                      : t(
                        'PRINTER_USB_IOS_UNAVAILABLE',
                        'USB printing is available on Android only.'
                      )}
                  </OText>
                  {isUsbSupported && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                      <OText size={14} color={theme.colors.toastInfo} style={{ flex: 1 }}>
                        {t(
                          'SEARCH_AVAILABLE_PRINTER_MESSAGE',
                          'Use the search icon to find an available printer'
                        )}
                      </OText>
                      {!discoverPort.loading ? (
                        <FAIcons
                          name='search'
                          size={22}
                          color={theme.colors.primary}
                          style={{ marginLeft: 10 }}
                          onPress={() => portDiscovery()}
                        />
                      ) : (
                        <ActivityIndicator
                          size="small"
                          style={{ marginLeft: 10 }}
                          color={theme.colors.primary}
                        />
                      )}
                    </View>
                  )}
                  {!!discoverPort.msg && (
                    <OText size={14} color={theme.colors.tabBar} style={{ paddingTop: 5 }}>
                      <MessageAlert
                        message={discoverPort.msg}
                        resetMsg={() => setDiscoverPort({ ...discoverPort, msg: null })}
                      />
                    </OText>
                  )}
                  {isUsbSupported && currentPrinter?.portName && currentPrinter.portName !== 'USB' && (
                    <OText size={13} color={theme.colors.textGray} style={{ paddingTop: 6 }}>
                      {`${t('PRINTER_USB_TARGET', 'USB target')}: ${currentPrinter.portName}`}
                    </OText>
                  )}
                </>
              )}

              {connectionType !== CONNECTION.USB && (
                <View style={{ flexDirection: 'column', marginTop: 20 }}>
                  {connectionType === CONNECTION.BLUETOOTH && (
                    <OText
                      size={14}
                      color={theme.colors.toastInfo}
                      style={{ marginBottom: 10 }}
                    >
                      {t('SEARCH_AVAILABLE_PRINTER_MESSAGE', 'Use the search icon to find an available printer')}
                    </OText>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Controller
                      control={control}
                      name={connectionType === CONNECTION.LAN ? 'ip' : 'bt'}
                      rules={{
                        required: connectionType === CONNECTION.LAN
                          ? t('VALIDATION_ERROR_IP_ADDRESS_REQUIRED', 'Ip address is required')
                          : t('VALIDATION_ERROR_BLUETOOTH_PORN_REQUIRED', 'Bluetooth port name is required'),
                        pattern: {
                          value: connectionType === CONNECTION.LAN
                            ? /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i
                            : /^[a-zA-Z0-9:\-]+$/i,
                          message: connectionType === CONNECTION.LAN
                            ? t('INVALID_ERROR_IP_ADDRESS', 'Invalid ip address')
                            : t('INVALID_ERROR_BLUETOOTH_PORT_NAME', 'Invalid bluetooth port name')
                        }
                      }}
                      defaultValue={connectionType === CONNECTION.LAN ? currentPrinter?.ip ?? '' : currentPrinter?.bt ?? ''}
                      render={() => (
                        <OInput
                          placeholder={connectionType === CONNECTION.LAN
                            ? t('IP_ADDRESS', 'Ip address')
                            : t('BLUETOOTH_PORT', 'Bluetooth port')
                          }
                          placeholderTextColor={theme.colors.arrowColor}
                          style={{
                            ...styles.inputStyle,
                            borderColor: isErrorInput ? theme.colors.danger500 : theme.colors.tabBar
                          }}
                          value={connectionType === CONNECTION.LAN ? currentPrinter?.ip ?? '' : currentPrinter?.bt ?? ''}
                          selectionColor={theme.colors.primary}
                          color={theme.colors.textGray}
                          onChange={(value: any) => {
                            const field = connectionType === CONNECTION.LAN ? 'ip' : 'bt'
                            setValue(field, value)
                            setCurrentPrinter({
                              ...currentPrinter,
                              [field]: value
                            })
                          }}
                        />
                      )}
                    />
                    {!discoverPort.loading ? (
                      <FAIcons
                        name='search'
                        size={22}
                        color={theme.colors.primary}
                        style={{ marginLeft: 10 }}
                        onPress={() => portDiscovery()}
                      />
                    ) : (
                      <ActivityIndicator
                        size="small"
                        style={{ marginLeft: 10 }}
                        color={theme.colors.primary}
                      />
                    )}
                  </View>
                </View>
              )}
              {connectionType !== CONNECTION.USB && (
                <OText
                  size={14}
                  color={theme.colors.tabBar}
                  style={{ paddingTop: 5, paddingLeft: 10 }}
                >
                  {discoverPort.msg ? (
                    <MessageAlert
                      message={discoverPort.msg}
                      resetMsg={() => setDiscoverPort({ ...discoverPort, msg: null })}
                    />
                  ) : (
                    `${t('EXAMPLE_SHORT', 'Ex:')} ${connectionType === CONNECTION.LAN ? '8.8.8.8' : '00-11-62-06-CA-4D'}`
                  )}
                </OText>
              )}
            </WrapperIcons>
          )}
        </ContainerEdition>
      </View>
      <View>
        <OButton
          text={t('SAVE_PRINTER', 'Save Printer')}
          imgRightSrc={null}
          textStyle={styles.savePrinterBtnText}
          style={styles.savePrinterBtn}
          bgColor={theme.colors.primary}
          borderColor={theme.colors.primary}
          isDisabled={isSaveDisabled()}
          onClick={() => onSubmit()}
        />
      </View>
    </View>
  )
}

const dropDownIcon = () => {
  const theme = useTheme()

  return (
    <FeatherIcon
      name='chevron-down'
      size={20}
      color={theme.colors.white}
    />
  )
}
