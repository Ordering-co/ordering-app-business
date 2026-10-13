import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps'
import Icon from 'react-native-vector-icons/FontAwesome5';
import FastImage from 'react-native-fast-image';
import { useTheme } from 'styled-components/native';

import { useLanguage } from '@components';
import { OButton, OText } from '@ui'
import { RenderMarkerParams } from '../../types'
import { showLocation } from 'react-native-map-link';

const styles = StyleSheet.create({
  image: {
    borderRadius: 50,
    width: 25,
    height: 25
  },
  view: {
    width: 25,
    position: 'absolute',
    top: 6,
    left: 6,
    bottom: 0,
    right: 0,
  },
});

export const RenderMarker = (props: RenderMarkerParams) => {
  const {
    marker,
    mapRef,
    userLocation,
    location
  } = props
  const theme = useTheme()
  const [, t] = useLanguage()

  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <Marker
      coordinate={location}
      onPress={() => {
        mapRef.current?.animateCamera({
          center: { latitude: location?.latitude, longitude: location?.longitude },
        })
      }}
      tracksViewChanges={!imageLoaded}
    >
      <Icon
        name="map-marker"
        size={50}
        color={theme.colors.primary}
      />
      <View style={styles.view}>
        <FastImage
            style={styles.image}
            source={marker?.icon?.includes?.('https') ? {
              uri: marker?.icon,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable
            } : marker?.icon}
            resizeMode={FastImage.resizeMode.cover}
            onLoadEnd={() => setImageLoaded(true)}
          />
      </View>
      <Callout
        onPress={() => {
          showLocation({
            latitude: location?.latitude,
            longitude: location?.longitude,
            sourceLatitude: userLocation?.latitude,
            sourceLongitude: userLocation.longitude,
            naverCallerName: 'com.businessapp',
            dialogTitle: t('SHOW_IN_OTHER_MAPS', 'Show in other maps'),
            dialogMessage: t('WHAT_APP_WOULD_YOU_USE', 'What app would you like to use?'),
            cancelText: t('CANCEL', 'Cancel'),
          })
        }}
      >
        <View style={{ flex: 1, width: 250, paddingRight: 10, paddingLeft: 10, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginBottom: 20 }}>
            <OText size={16} weight={'bold'} style={{ paddingTop: 10, marginBottom: 10 }}>{marker?.title}</OText>
            {marker?.address && (
              <>
                <OText size={16} >{marker?.address.addressName}</OText>
                <OText size={16} >{marker?.address.zipcode}</OText>
              </>
            )}
          </View>
          <OButton
            text={t('GO_TO_THIS_LOCATION', 'Go to this location')}
            imgRightSrc={null}
            textStyle={{
              color: theme.colors.white,
              fontStyle: 'normal',
              fontWeight: 'normal',
              fontSize: 16
            }}
            style={{
              alignContent: 'center',
              borderRadius: 10,
              height: 35,
              bottom: 10
            }}
            bgColor={theme.colors.primary}
            borderColor={theme.colors.primary}
          />
        </View>
      </Callout>
    </Marker>
  )
}
