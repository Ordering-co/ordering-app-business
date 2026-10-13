import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, View, Dimensions, Platform } from 'react-native'
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { useTheme } from 'styled-components/native'
import ToggleSwitch from 'toggle-switch-react-native'
import { useFocusEffect } from '@react-navigation/native'

import { _setStoreData, _retrieveStoreData } from '../../providers/StoreUtil'
import { savePrinter } from '../PrinterEdition/savePrinter'
import { normalizePrintersList } from '../PrinterEdition/printerList'
import { Container, ContainerList, EnabledAutoPrint, NoPrintersContainer } from './styles'

import { useLanguage } from '@components'
import { OText, OIcon, OButton, ONavbar } from '@ui'

export const PrinterSettings = (props: any) => {
  const { navigation } = props

  const [printers, setPrinters] = useState<any>({ list: [] })
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(false)

  const WIDTH_SCREEN = Dimensions.get('window').width

  const [, t] = useLanguage()
  const theme = useTheme()

  const styles = StyleSheet.create({
    icons: {
      maxWidth: 40,
      height: 40,
      padding: 10,
      alignItems: 'flex-end'
    },
    wIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: WIDTH_SCREEN - 40 - 22 - 22 - 10, // screen - margin - icon - icon - marginIcon
    },
    wrapperContainer: {
      flexDirection: 'column',
    },
    addButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
    },
    addButton: {
      height: 50,
      marginTop: 10,
      borderRadius: 8,
      marginBottom: 10,
      alignSelf: 'flex-end',
      width: WIDTH_SCREEN - 60,
    },
  })

  const goToBack = () => navigation?.canGoBack() && navigation.goBack()

  const openPrinterConfigure = (printer: any = null) => {
    navigation?.navigate?.('PrinterConfigure', { printer })
  }

  const loadStorageData = useCallback(async () => {
    const storedPrinters = await _retrieveStoreData('printers')
    const autoPrint = await _retrieveStoreData('auto_print_after_accept_order')
    setPrinters({ list: normalizePrintersList(storedPrinters) })
    setAutoPrintEnabled(!!autoPrint)
  }, [])

  const handleDeletePrinter = async (item: any, index: number) => {
    const list = await savePrinter({ item, index })
    setPrinters({ list })
  }

  const handleAutoPrint = async () => {
    setAutoPrintEnabled(!autoPrintEnabled)
    await _setStoreData('auto_print_after_accept_order', !autoPrintEnabled)
  }

  useEffect(() => {
    loadStorageData()
  }, [loadStorageData])

  useFocusEffect(
    useCallback(() => {
      loadStorageData()
    }, [loadStorageData])
  )

  return (
    <Container>
      <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 15 }}>
        <ONavbar title={t('PRINTER_SETTINGS', 'Printer Settings')} onBack={() => goToBack()} />
      </View>
      {!!printers.list.length && (
        <EnabledAutoPrint>
          <View style={{ flex: 1 }}>
            <OText
              numberOfLines={2}
              adjustsFontSizeToFit
              color={theme.colors.textGray}
              style={{ paddingHorizontal: 0 }}>
              {t('AUTO_PRINT_AFTER_ACCEPTING_ORDER', 'Auto print after accepting order')}
            </OText>
          </View>
          <ToggleSwitch
            isOn={autoPrintEnabled}
            onColor={theme.colors.primary}
            offColor={theme.colors.offColor}
            size="small"
            onToggle={() => handleAutoPrint()}
            animationSpeed={200}
          />
        </EnabledAutoPrint>
      )}
      {!!printers.list.length && (
        <OButton
          text={t('ADD_PRINTER', 'Add printer')}
          imgRightSrc={null}
          textStyle={styles.addButtonText}
          style={styles.addButton}
          parentStyle={{ marginVertical: 10, alignSelf: 'center' }}
          bgColor={theme.colors.white}
          borderColor={theme.colors.primary}
          onClick={() => openPrinterConfigure(null)}
        />
      )}
      <View style={{ flex: 1 }}>
        {printers.list.map((item: any, i: number) => (
          <ContainerList
            key={i}
            activeOpacity={1}
          >
            <View style={styles.wrapperContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.wIconContainer}
                  onPress={() => openPrinterConfigure({ ...item, index: i })}
                >
                  <SimpleLineIcons
                    name='printer'
                    color={theme.colors.textGray}
                    size={18}
                    style={{
                      ...styles.icons,
                      color: theme.colors.primary
                    }}
                  />
                  <OText
                    size={18}
                    color={theme.colors.primary}
                  >
                    {item?.nickname ?? item.model}
                  </OText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => openPrinterConfigure({ ...item, index: i })}
                >
                  <FeatherIcon
                    name='edit'
                    size={22}
                    color={theme?.colors?.textNormal}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={1}
                  testID={`printer-delete-${i}`}
                  onPress={() => handleDeletePrinter(item, i)}
                  style={{ marginLeft: 10 }}
                >
                  <FeatherIcon
                    name='trash-2'
                    size={22}
                    color={theme.colors.danger500}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ContainerList>
        ))}
        {!printers.list.length && (
          <NoPrintersContainer>
            <View style={{ alignItems: 'center' }}>
              <OIcon src={theme.images.general.noPrinters} width={WIDTH_SCREEN} height={WIDTH_SCREEN / 2} />
              <OText
                size={20}
                color={theme.colors.textGray}
                numberOfLines={2}
                adjustsFontSizeToFit
                style={{ paddingHorizontal: 0, opacity: 0.4, textAlign: 'center' }}
              >
                {t('NO_PRINTERS_CONFIGURED', 'No printers configured')}
              </OText>
            </View>
            <OButton
              text={t('ADD_PRINTER', 'Add printer')}
              imgRightSrc={null}
              textStyle={styles.addButtonText}
              style={styles.addButton}
              bgColor={theme.colors.white}
              borderColor={theme.colors.primary}
              onClick={() => openPrinterConfigure(null)}
            />
          </NoPrintersContainer>
        )}
      </View>
    </Container>
  )
}
