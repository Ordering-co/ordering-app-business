import React, { useState, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Region } from 'react-native-maps';
import Geocoder from 'react-native-geocoding';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import { GoogleMapsParams } from '../../types';

import LocationIndicator from './LocationIndicator';

import { useLanguage, useConfig } from '@components';
import {
  useLocation,
  FloatingButton,
  OIconButton, OText, OAlertOriginal as Alert
} from '@ui'
import { RenderMarker } from './RenderMarker'
export const GoogleMap = (props: GoogleMapsParams) => {
  const {
    location,
    handleChangeAddressMap,
    maxLimitLocation,
    readOnly,
    handleViewActionOrder,
    markerTitle,
    showAcceptOrReject,
    driverLocation,
    saveLocation,
    handleOpenMapView,
    setSaveLocation,
    handleToggleMap,
    locations,
    isSetInputs,
    navigation,
    order,
    logisticOrderStatus,
    getOrderStatus,
    colors
  } = props;

  const {
    userLocation,
  } = useLocation();

  const { top } = useSafeAreaInsets();
  const theme = useTheme();
  const [, t] = useLanguage();
  const [configState] = useConfig();
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const [isMapReady, setIsMapReady] = useState(false);
  const [markerPosition, setMarkerPosition] = useState({
    latitude: locations
      ? typeof locations[locations.length - 1].lat === 'string' ? parseFloat(locations[locations.length - 1].lat) || 0 : locations[locations.length - 1].lat || 0
      : typeof location?.lat === 'string' ? parseFloat(location?.lat) || 0 : location?.lat || 0,
    longitude: locations
      ? typeof locations[locations.length - 1].lng === 'string' ? parseFloat(locations[locations.length - 1].lng) || 0 : locations[locations.length - 1].lng || 0
      : typeof location?.lng === 'string' ? parseFloat(location?.lng) || 0 : location?.lng || 0,
  });
  const [region, setRegion] = useState({
    latitude: typeof location?.lat === 'string' ? parseFloat(location?.lat) || 0 : location?.lat || 0,
    longitude: typeof location?.lng === 'string' ? parseFloat(location?.lng) || 0 : location?.lng || 0,
    latitudeDelta: 0.001,
    longitudeDelta: 0.001 * ASPECT_RATIO,
  });
  let mapRef = useRef<any>(null);
  const googleMapsApiKey = configState?.configs?.google_maps_api_key?.value;
  const showExternalId = configState?.configs?.change_order_id?.value === '1'

  const center = { lat: location?.lat, lng: location?.lng };

  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });

  const mapErrors: any = {
    ERROR_NOT_FOUND_ADDRESS: "Sorry, we couldn't find an address",
    ERROR_MAX_LIMIT_LOCATION_TO: 'Sorry, You can only set the position to',
  };

  let MARKERS =
    locations &&
    locations.map((location: { lat: number; lng: number; level: number }) => {
      return location.level === 4 && driverLocation?.lat && driverLocation?.lng
        ? {
          latitude: typeof driverLocation?.lat === 'string' ? parseFloat(driverLocation?.lat) || 0 : driverLocation?.lat,
          longitude: typeof driverLocation?.lng === 'string' ? parseFloat(driverLocation?.lng) || 0 : driverLocation?.lng,
        }
        : {
          latitude: typeof location?.lat === 'string' ? parseFloat(location?.lat) || 0 : location?.lat,
          longitude: typeof location?.lng === 'string' ? parseFloat(location?.lng) || 0 : location?.lng
        };
    });

  const handleArrowBack: any = () => {
    handleOpenMapView && handleOpenMapView();
  };

  const geocodePosition = (pos: { latitude: number; longitude: number }) => {
    Geocoder.from({
      latitude: pos.latitude,
      longitude: pos.longitude,
    })
      .then(({ results }) => {
        let zipcode = null;
        if (results && results.length > 0) {
          for (const component of results[0].address_components) {
            const addressType = component.types[0];
            if (addressType === 'postal_code') {
              zipcode = component.short_name;
              break;
            }
          }
          let data = null;
          const details = {
            geometry: { location: { lat: pos?.latitude, lng: pos?.longitude } },
          };
          if (isSetInputs) {
            data = {
              address: results[0]?.formatted_address,
              location: results[0]?.geometry?.location,
              zipcode,
              place_id: results[0]?.place_id,
            };
          }
          handleChangeAddressMap && handleChangeAddressMap(data, details);
          setSaveLocation && setSaveLocation(false);
          handleToggleMap && handleToggleMap();
        } else {
          setMapErrors && setMapErrors('ERROR_NOT_FOUND_ADDRESS');
        }
      })
      .catch(err => {
        setMapErrors && setMapErrors(err.message);
      });
  };

  const validateResult = (curPos: { latitude: number; longitude: number }) => {
    const loc1 = center;
    const loc2 = curPos;
    const distance = calculateDistance(loc1, loc2);

    if (!maxLimitLocation) {
      geocodePosition(curPos);
      setMarkerPosition(curPos);
      setRegion({
        ...region,
        longitude: curPos.longitude,
        latitude: curPos.latitude,
      });
      return;
    }

    if (distance <= maxLimitLocation) {
      setMarkerPosition(curPos);
      setRegion({
        ...region,
        longitude: curPos.longitude,
        latitude: curPos.latitude,
      });
    } else {
      setMapErrors && setMapErrors('ERROR_MAX_LIMIT_LOCATION');
      setMarkerPosition({ latitude: center.lat, longitude: center.lng });
    }
  };

  const calculateDistance = (
    pointA: { lat: number; lng: number },
    pointB: { latitude: number; longitude: number },
  ) => {
    const lat1 = pointA.lat;
    const lon1 = pointA.lng;

    const lat2 = pointB?.latitude;
    const lon2 = pointB?.longitude;

    const R = 6371e3;
    const φ1 = lat1 * (Math.PI / 180);
    const φ2 = lat2 * (Math.PI / 180);
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * (Math.sin(Δλ / 2) * Math.sin(Δλ / 2));

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
  };

  const handleChangeRegion = (coordinates: Region) => {
    validateResult(coordinates);
  };

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: [],
    });
  };

  const setMapErrors = (errKey: string) => {
    setAlertState({
      open: true,
      content: !(errKey === 'ERROR_MAX_LIMIT_LOCATION_TO')
        ? [t(errKey, mapErrors[errKey])]
        : [
          `${t(errKey, mapErrors[errKey])} ${maxLimitLocation} ${t(
            'METTERS',
            'meters',
          )}`,
        ],
      key: errKey,
    });
  };

  const fitAllMarkers = () => {
    mapRef.current.fitToCoordinates(MARKERS, {
      edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
      animated: true,
    });
  };

  useEffect(() => {
    Geocoder.init(googleMapsApiKey);
  }, []);

  useEffect(() => {
    if (saveLocation) {
      geocodePosition(markerPosition);
    }
  }, [saveLocation]);

  useEffect(() => {
    if (mapRef.current && locations && isMapReady) {
      fitAllMarkers();
    }
  }, [isMapReady]);
  useEffect(() => {
    if (!locations) return
    MARKERS = locations.map((location: { lat: number; lng: number; level: number }) => {
      return location.level === 4 && driverLocation?.lat
        ? {
          latitude: driverLocation?.lat,
          longitude: driverLocation?.lng,
        }
        : { latitude: location.lat, longitude: location.lng };
    })
    fitAllMarkers();
  }, [driverLocation])

  const styles = StyleSheet.create({
    map: {
      flex: 1,
      ...StyleSheet.absoluteFillObject,
    },
    buttonBack: {
      borderRadius: 7.6,
      borderWidth: 0,
      paddingLeft: 0,
    },
    buttonContainer: {
      position: 'absolute',
      top: 10,
      right: 0,
      marginTop: top,
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {Boolean(order) && (
        <View style={{ padding: 15 }}>
          <OText numberOfLines={2} size={16} weight="600" style={{ marginBottom: 15, maxWidth: '80%' }}>
            <>
              {`${t('INVOICE_ORDER_NO', 'Order No.')} ${showExternalId ? order?.external_id || order?.id : order?.id} `}
              {!order?.isLogistic && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status)) && (
                <>
                  {t('IS', 'is')}{' '}
                  <OText
                    size={16}
                    weight="700"
                    color={colors?.[order?.status] || theme.colors.primary}>
                    {getOrderStatus(order?.status, t)?.value}
                  </OText>
                </>
              )}
            </>
          </OText>
          <LocationIndicator title={order?.business?.name} address={order?.customer?.address} />
        </View>
      )}
      <View style={{ flex: 1, position: 'relative' }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          style={{ flex: 1 }}
          onRegionChangeComplete={
            !readOnly
              ? coordinates => handleChangeRegion(coordinates)
              : () => { }
          }
          zoomTapEnabled
          zoomEnabled
          zoomControlEnabled
          moveOnMarkerPress
          ref={mapRef}
          onMapReady={() => setIsMapReady(true)}>
          {locations ? (
            <>
              {MARKERS &&
                MARKERS.map(
                  (
                    location: { latitude: number; longitude: number },
                    i: number,
                  ) => (
                    <React.Fragment key={i}>
                      <RenderMarker
                        key={locations[i]?.business_id}
                        marker={locations[i]}
                        location={location}
                        mapRef={mapRef}
                        userLocation={userLocation}
                      />
                    </React.Fragment>
                  ),
                )}
            </>
          ) : (
            <Marker
              coordinate={markerPosition}
              title={markerTitle || t('YOUR_LOCATION', 'Your Location')}
            />
          )}
        </MapView>
        <Alert
          open={alertState.open}
          onAccept={closeAlert}
          onClose={closeAlert}
          content={alertState.content}
          title={t('ERROR', 'Error')}
        />
      </View>
      {showAcceptOrReject && (
        <FloatingButton
          btnText={t('ACCEPT', 'Accept')}
          isSecondaryBtn={false}
          color={theme.colors.green}
          secondButtonClick={() =>
            handleViewActionOrder && handleViewActionOrder('accept')
          }
          firstButtonClick={() =>
            handleViewActionOrder && handleViewActionOrder('accept')
          }
          secondButton={false}
          firstColorCustom={theme.colors.red}
          secondColorCustom={theme.colors.green}
          widthButton={'100%'}
          isPadding
        />
      )}
      <View style={styles.buttonContainer}>
        <OIconButton
          icon={theme.images.general.close}
          iconStyle={{ width: 48, height: 48 }}
          style={styles.buttonBack}
          onClick={() => handleArrowBack()}
        />
      </View>
    </SafeAreaView>
  );
};
