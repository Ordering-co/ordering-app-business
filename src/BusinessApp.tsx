import * as React from 'react';
import { LogBox } from 'react-native';
import { LocalSimulatorBanner } from './onboarding/local-simulator-banner';
import { ProjectSetupGate } from './onboarding/project-setup-gate';

import settings from './config.json';
import theme from './theme.json';
import AppContainer from './AppContainer';
import { PermissionsProvider } from './context/PermissionsContext';

import { OrderingProvider } from '@components';
import { OToast, OAlertOriginal as Alert, ThemeProvider, OfflineActionsProvider } from '@ui';

LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state.',
  'Setting a timer',
  'The `value` prop is required for the `<Context.Provider>`',
  "Can't perform a React state update",
  'Remote debugger',
  'Task orphaned for request',
  "JSON value '<null>'",
  'VirtualizedLists should never be nested',
  'Could not receive settings from Segment',
  'No info about this app',
  'ViewPropTypes will be removed',
  'EdgeInsetsPropTypes will be removed',
  'EdgeInsetsPropType will be removed',
  'PointPropTypes will be removed',
  'PointPropType will be removed',
  'ColorPropType will be removed'
]);

theme.images = {
  logos: {
    background: require('./assets/images/background.png'),
    logotype: require('./assets/images/logotype.png'),
    logotypeInvert: require('./assets/images/logotype-invert.png'),
    passwordInputIcon: require('./assets/icons/password.png'),
    emailInputIcon: require('./assets/icons/email.png'),
    logo: require('./assets/images/logo.png'),
  },
  general: {
    loadingSplash: require('./assets/images/loading-splash.png'),
    notFound: require('./assets/images/not-found.png'),
    dropDown: require('./assets/icons/drop_down.png'),
    chevronDown: require('./assets/icons/chevron-down.png'),
    inputPhone: require('./assets/icons/phone.png'),
    imageChat: require('./assets/icons/image-chat.png'),
    attach: require('./assets/icons/attach.png'),
    arrow_down: require('./assets/icons/arrow_down.png'),
    arrow_left: require('./assets/icons/arrow_left.png'),
    map: require('./assets/icons/map.png'),
    message: require('./assets/icons/message.png'),
    telephone: require('./assets/icons/telephone.png'),
    location: require('./assets/icons/location.png'),
    arrowReturnLeft: require('./assets/icons/arrow_return_left.png'),
    close: require('./assets/icons/Close.png'),
    pdfFile: require('./assets/icons/pdfFile.png'),
    docFile: require('./assets/icons/docFile.png'),
    imageFile: require('./assets/icons/imageFile.png'),
    cellphone: require('./assets/icons/cellphone.png'),
    reload: require('./assets/icons/reload.png'),
    search: require('./assets/icons/search.png'),
    camera: require('./assets/icons/camera.png'),
    profilephoto: require('./assets/icons/profile-default-photo.png'),
    orders: require('./assets/icons/orders.png'),
    messages: require('./assets/icons/messages.png'),
    stores: require('./assets/icons/stores.png'),
    profile: require('./assets/icons/profile.png'),
    menulogout: require('./assets/icons/logout.png'),
    project: require('./assets/icons/project.png'),
    information: require('./assets/icons/information.png'),
    newOrder: require('./assets/images/new-order.png'),
    orderCreating: require('./assets/images/order-creating.png'),
    orderSuccess: require('./assets/images/order-success.png'),
    copy: require('./assets/icons/copy.png'),
    print: require('./assets/icons/print.png'),
    clock1: require('./assets/icons/clock1.png'),
    clockRisk: require('./assets/icons/clock-history1.png'),
    clockDelayed: require('./assets/icons/clock-fill1.png'),
    noNetwork: require('./assets/images/no-network.png'),
    ordersGroup: require('./assets/icons/orders_group.png'),
    send: require('./assets/icons/send.png'),
    pen: require('./assets/icons/pen.png'),
    noPrinters: require('./assets/images/no-printers.png'),
  },
  backgroundsImages: {
    login: require('./assets/images/background.png'),
  },
  dummies: {
    businessLogo: require('./assets/images/dummies/store.png'),
    driverPhoto:
      'https://res.cloudinary.com/demo/image/fetch/c_thumb,g_face,r_max/https://www.freeiconspng.com/thumbs/driver-icon/driver-icon-14.png',
    customerPhoto:
      'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,r_max/d_avatar.png/non_existing_id.png',
  },
  tutorials: {
    slide1: require('./assets/images/slide1.png'),
    slide2: require('./assets/images/slide2.png'),
    slide3: require('./assets/images/slide3.png'),
    slide4: require('./assets/images/slide4.png')
  }
};
theme.sounds = {
  notification: require('./assets/sounds/notification.mp3')
}

const BusinessAppContent = ({ configFile }: { configFile: any }) => {
  return (
    <ThemeProvider theme={theme}>
      <OrderingProvider settings={configFile} Alert={Alert} isDisableToast={true}>
        <OfflineActionsProvider>
          <PermissionsProvider>
            <LocalSimulatorBanner project={configFile.project}>
              <AppContainer />
              <OToast />
            </LocalSimulatorBanner>
          </PermissionsProvider>
        </OfflineActionsProvider>
      </OrderingProvider>
    </ThemeProvider>
  );
};

const BusinessApp = () => (
  <ProjectSetupGate settings={settings}>
    {configFile => <BusinessAppContent configFile={configFile} />}
  </ProjectSetupGate>
)

export default BusinessApp;
