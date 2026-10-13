import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StatusBar, Platform } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { useTheme } from 'styled-components/native';
import IconAntDesign from 'react-native-vector-icons/AntDesign'

import { useLanguage } from '@components';
import { DeviceOrientationMethods, StoreMethods, SafeAreaContainer } from '@ui'

const { useDeviceOrientation } = DeviceOrientationMethods
const { _setStoreData } = StoreMethods

const IntroductoryTutorial = ({ navigation, route }: any) => {
  const [, t] = useLanguage();
  const theme = useTheme();
  const [orientationState] = useDeviceOrientation();
  const [showSkipButton, setShowSkipButton] = useState(true)
  const WIDTH_SCREEN = orientationState?.dimensions?.width
  const HEIGHT_SCREEN = orientationState?.dimensions?.height
  const setTutorial = route?.params?.setTutorial;
  const data = [
    {
      title: t('RECIEVE_ORDERS', 'Receive orders'),
      text: t('RECIEVE_ORDERS_INST', 'On every incoming order, a push notification will show.'),
      image: theme.images.tutorials.slide1,
      bg: theme.colors.white,
    },
    {
      title: t('MOBILE_CHECKOUT_ORDER_DETAILS', 'Order Details'),
      text: t('ORDER_DETAILS_INST', 'See the order and manage it properly, accept or reject.'),
      image: theme.images.tutorials.slide2,
      bg: theme.colors.white,
    },
    {
      title: t('ASSIGN_DRIVER', 'Assign driver'),
      text: t('ASSIGN_DRIVER_INST', 'Choose a driver to deliver the order.'),
      image: theme.images.tutorials.slide3,
      bg: theme.colors.white,
    },
    {
      title: t('FOLLOW_UP', 'Follow up'),
      text: t('FOLLOW_UP_INST', 'Track driver on a map in real time, every order delivered in time'),
      image: theme.images.tutorials.slide4,
      bg: theme.colors.white,
    }
  ];
  type Item = typeof data[0];
  const styles = StyleSheet.create({
    slide: {
      flex: 1,
      paddingBottom: 80,
    },
    cardmedia: {
      height: HEIGHT_SCREEN * 0.6634645,
      width: WIDTH_SCREEN,
      overflow: 'hidden',
      alignSelf: 'baseline',
    },
    cardcontent: {
      flex: 1,
      paddingTop: 30,
      paddingHorizontal: 30,
    },
    image: {
      flex: 0,
      width: 'auto',
      height: '100%',
    },
    text: {
      color: '#344050',
      fontSize: 18,
      lineHeight: 28,
      top: HEIGHT_SCREEN * 0.005,
      textAlign: 'left',
      width: WIDTH_SCREEN * .85
    },
    title: {
      bottom: HEIGHT_SCREEN * 0.01,
      fontSize: 22,
      fontWeight: 'bold',
      color: '#344050',
      textAlign: 'left',
      width: WIDTH_SCREEN * .85
    },
    buttonCircle: {
      top: 3,
      width: 90,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center'
    },
    tutorialText: {
      fontSize: 16,
      fontWeight: '300',
      color: theme.colors.primary,
    },
  });

  const radio = 1369 / 1242
  const imageHeight = Math.round(WIDTH_SCREEN * radio);
  const imageWidth = WIDTH_SCREEN;

  const _renderItem = ({ item }: { item: Item }) => {
    return (
      <View
        style={{
          ...styles.slide,
          backgroundColor: item.bg,
        }}>
        <View style={styles.cardmedia}>
          <Image source={item.image} resizeMode='cover' style={{ height: imageHeight, width: imageWidth }} />
        </View>
        <View style={styles.cardcontent}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.text} numberOfLines={3}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const RenderNextButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        right: 0
      }}>
        <Text style={styles.tutorialText}>{t('TUTORIAL_NEXT', 'Next')}{' '}
          <IconAntDesign
            name='arrowright'
            color={theme.colors.primary}
            size={16}
          />
        </Text>
      </View>
    );
  };

  const RenderSkipButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        marginLeft: Platform.OS === 'ios' ? 0 : WIDTH_SCREEN * .45,
        start: Platform.OS === 'ios' ? WIDTH_SCREEN * 0.45 : 0
      }}>
        <Text style={styles.tutorialText}>
          {t('TUTORIAL_SKIP', 'Skip')}
        </Text>
      </View>
    );
  };

  const RenderPrevButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        start: WIDTH_SCREEN * 0.7
      }}>
        <Text style={styles.tutorialText}>{t('TUTORIAL_BACK', 'Back')}</Text>
      </View>
    );
  };

  const RenderDoneButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        right: 0
      }}>
        <Text style={styles.tutorialText}>{t('TUTORIAL_DONE', "Let's start!")}</Text>
      </View>
    );
  };

  const _onDone = () => {
    setTutorial(false);
    _setStoreData('isTutorial', false);
  };

  const _keyExtractor = (item: Item) => item.title;

  return (
    <SafeAreaContainer style={{ backgroundColor: theme.colors.white }}>
      <StatusBar translucent backgroundColor="transparent" />
      <AppIntroSlider
        keyExtractor={_keyExtractor}
        renderItem={_renderItem}
        data={data}
        onDone={_onDone}
        activeDotStyle={{
          backgroundColor: theme.colors.primary,
          position: 'relative',
          right: WIDTH_SCREEN * 0.29,
          width: 8.3,
          height: 8.3
        }}
        dotStyle={{
          backgroundColor: 'lightgray',
          position: 'relative',
          right: WIDTH_SCREEN * 0.29,
          width: 8,
          height: 8
        }}
        renderDoneButton={RenderDoneButton}
        renderNextButton={RenderNextButton}
        renderSkipButton={RenderSkipButton}
        showSkipButton={showSkipButton}
        onSlideChange={(index: any) => {
          index >= 1 ? setShowSkipButton(false) : setShowSkipButton(true)
        }}
      />
    </SafeAreaContainer>
  );
};
export default IntroductoryTutorial;
