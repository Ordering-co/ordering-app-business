import * as React from 'react';
import { Modal, Pressable, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import { useUtils } from '@components';
import { useIsLargeScreen } from '../../hooks/DeviceOrientation';
import OIcon from './OIcon';
import OText from './OText';
import OIconButton from './OIconButton';

const CARD_MAX_WIDTH = 620;

interface Props {
  open?: boolean;
  title?: string;
  children?: any;
  onAccept?: any;
  onCancel?: any;
  onClose?: any;
  style?: any;
  acceptText?: string;
  cancelText?: string;
  isTransparent?: boolean;
  hideCloseDefault?: boolean;
  entireModal?: boolean;
  customClose?: boolean;
  titleSectionStyle?: any;
  isNotDecoration?: boolean;
  styleCloseButton?: any;
  order?: any;
  hideIcons?: boolean;
  centerOnLargeScreen?: boolean;
}

const OModal = (props: Props): React.ReactElement => {
  const {
    open,
    title,
    children,
    onAccept,
    onCancel,
    onClose,
    acceptText,
    cancelText,
    isTransparent,
    hideCloseDefault,
    entireModal,
    customClose,
    titleSectionStyle,
    isNotDecoration,
    style,
    styleCloseButton,
    order,
    hideIcons,
    centerOnLargeScreen
  } = props;

  const theme = useTheme();
  const [{ optimizeImage }] = useUtils();
  const { top } = useSafeAreaInsets();
  const isLargeScreen = useIsLargeScreen();

  const showAsCard = !!entireModal && !!centerOnLargeScreen && isLargeScreen;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    centeredView: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    cardOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    cardContent: {
      width: '100%',
      maxWidth: CARD_MAX_WIDTH,
      maxHeight: '100%',
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      overflow: 'hidden',
      paddingTop: 20,
      paddingBottom: 20,
    },
    cardCloseButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.inputDisabled,
    },
    cardTitleSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: !hideIcons ? 25 : 15,
      borderBottomWidth: !hideIcons ? 2 : 0,
      borderBottomColor: '#e6e6e6',
    },
    titleSection: {
      marginTop: top,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: !hideIcons ? 25 : 15,
      borderBottomWidth: !hideIcons ? 2 : 0,
      borderBottomColor: '#e6e6e6',
    },
    titleGroups: {
      marginTop: 15,
      alignItems: 'center',
      flexDirection: 'row',
    },
    titleIcons: {
      height: 33,
      width: 33,
      borderRadius: 7.6,
      resizeMode: 'stretch',
    },
    shadow: {
      height: 34,
      width: 34,
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginLeft: 15,
      backgroundColor: theme.colors.clear,
      paddingHorizontal: 3,
      borderRadius: 7.6,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    cancelBtn: {
      marginRight: 5,
      zIndex: 10000,
      maxWidth: 40,
      height: 25,
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
    },
    modalText: {
      marginLeft: 5,
      zIndex: 10,
      fontWeight: '700',
    },
    wrapperIcon: {
      overflow: 'hidden',
      borderRadius: 50,
      backgroundColor: '#CCCCCC80',
      width: 35,
      margin: 15,
    },
    modalView: {
      margin: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
    },
    buttonOpen: {
      backgroundColor: '#F194FF',
    },
    buttonClose: {
      backgroundColor: '#2196F3',
    },
    textStyle: {
      color: 'white',
      fontWeight: '600',
      textAlign: 'center',
    },
    btnBackArrow: {
      borderWidth: 0,
      tintColor: theme.colors.textGray,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
      width: 24,
      height: 24,
      marginRight: 10,
    },
  });

  const entireModalTitleSection = !customClose && (
    <View style={showAsCard ? styles.cardTitleSection : styles.titleSection}>
      <View style={styles.titleGroups}>
        {!showAsCard && (
          <OIconButton
            icon={theme.images.general.arrow_left}
            borderColor={theme.colors.clear}
            iconStyle={{ width: 24, height: 24 }}
            style={styles.btnBackArrow}
            onClick={() => onClose()}
          />
        )}
        <OText size={24} style={styles.modalText} adjustsFontSizeToFit>
          {title}
        </OText>
      </View>
      {!hideIcons && (
        <View style={styles.titleGroups}>
          <View style={styles.shadow}>
            {order?.business?.logo ? (
              <OIcon
                url={optimizeImage(order?.business?.logo, 'h_300,c_limit')}
                style={styles.titleIcons}
              />
            ) : (
              <OIcon
                src={theme.images.dummies.businessLogo}
                style={styles.titleIcons}
              />
            )}
          </View>

          <View style={styles.shadow}>
            <OIcon
              url={optimizeImage(
                order?.customer?.photo || theme?.images?.dummies?.customerPhoto,
                'h_300,c_limit',
              )}
              style={styles.titleIcons}
            />
          </View>

          {order?.driver && (
            <View style={styles.shadow}>
              <OIcon
                url={
                  optimizeImage(order?.driver?.photo, 'h_300,c_limit') ||
                  theme?.images?.dummies?.driverPhoto
                }
                style={styles.titleIcons}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={showAsCard ? true : isTransparent}
        visible={open}
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => {
          onClose && onClose();
        }}
        style={{
          height: '100%',
          flex: 1,
          position: 'absolute',
          ...style,
          zIndex: 9999,
        }}>
        <SafeAreaProvider>
          {!entireModal ? (
            <View style={styles.centeredView}>
              <View
                style={
                  titleSectionStyle ? titleSectionStyle : styles.titleSection
                }>
                <OText size={24} style={styles.modalText} adjustsFontSizeToFit>
                  {title}
                </OText>
              </View>

              {children}
            </View>
          ) : showAsCard ? (
            <SafeAreaView
              style={styles.cardOverlay}
              edges={['top', 'left', 'right', 'bottom']}
            >
              <Pressable
                testID="modal-backdrop"
                style={StyleSheet.absoluteFill}
                onPress={() => onClose && onClose()}
              />
              <View style={styles.cardContent}>
                <Pressable
                  testID="modal-close"
                  style={styles.cardCloseButton}
                  onPress={() => onClose && onClose()}
                >
                  <Icon name="x" size={20} color={theme.colors.textGray} />
                </Pressable>
                {entireModalTitleSection}
                {children}
              </View>
            </SafeAreaView>
          ) : (
            <>
              {entireModalTitleSection}
              {children}
            </>
          )}
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
};

export default OModal;
