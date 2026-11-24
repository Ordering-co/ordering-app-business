//Components
import { AppTabBar, TabBarItem, SHELL_TABS } from './src/components/AppShell';
import { OrderActionsHost, useOrderActions, orderActions, canAssignDriver, canReviewCustomer, canAdjustTime } from './src/components/OrderActions';
import { BusinessController } from './src/components/BusinessController';
import { BusinessProductList } from './src/components/BusinessProductList';
import { Chat } from './src/components/Chat';
import { ForgotPasswordForm } from './src/components/ForgotPasswordForm';
import { GoogleMap } from './src/components/GoogleMap';
import { Home } from './src/components/Home';
import { LanguageSelector, LanguageSheet } from './src/components/LanguageSelector';
import { LoginForm } from './src/components/LoginForm';
import { LogoutButton } from './src/components/LogoutButton';
import { MessagesOption } from './src/components/MessagesOption';
import { NotFoundSource } from './src/components/NotFoundSource';
import { OrderMessage } from './src/components/OrderMessage';
import { SelectConversation } from './src/components/OrderMessage/SelectConversation';
import { SelectStore } from './src/components/StoresList/SelectStore';
import { OrderDetailsPage, OrderDetailsBusiness } from './src/components/OrderDetails/OrderDetailsPage';
import { orderStage, statusLabel } from './src/components/OrderDetails/orderStages';
import { buildOrderCopyText } from './src/components/OrderDetails/copyText';
import { orderNumber, orderNumberText } from './src/components/OrderDetails/orderData';
import { useOrderNumberText } from './src/components/OrderDetails/useOrderNumberText';
import { OrdersOption, OrdersSource, useOrdersSplit, useOrdersSearch, OrdersSearchModal, OrdersNotices } from './src/components/OrdersOption';
import { OrdersOptionBusiness } from './src/components/OrdersOptionBusiness';
import { OrdersOptionCity } from './src/components/OrdersOptionCity';
import { OrdersOptionDriver } from './src/components/OrdersOptionDriver';
import { OrdersOptionPaymethod } from './src/components/OrdersOptionPaymethod';
import { PhoneInputNumber } from './src/components/PhoneInputNumber';
import { PreviousMessages } from './src/components/PreviousMessages';
import { OrderCard, GroupedOrderCard, OrdersSkeleton } from './src/components/PreviousOrders';
import { PrinterSettings } from './src/components/PrinterSettings';
import { PrintTicketSettings } from './src/components/PrintTicketSettings';
import { ProductItemAccordion } from './src/components/ProductItemAccordion';
import { ReviewCustomer } from './src/components/ReviewCustomer'
import { StoresList } from './src/components/StoresList';
import { usePauseOrders } from './src/components/StoresList/usePauseOrders';
import { getStoreStatus } from './src/components/StoresList/storeStatus';
import { StoreProductOptions } from './src/components/StoreProductOptions';
import { UserFormDetails, UserFormDetailsUI } from './src/components/UserFormDetails';
import { UserProfileForm } from './src/components/UserProfileForm';
import { VerifyPhone } from './src/components/VerifyPhone';
import { NewOrderAlert } from './src/components/NewOrderNotification';
import { OrdersBoard } from './src/components/OrdersBoard';
import { NotificationSetting, NotificationsPermissionSheet, AlertsAndSound } from './src/components/NotificationSetting'
import { OrdersDisplaySettings } from './src/components/OrdersDisplaySettings'
import { ALERT_SOUNDS, ALERT_SETTINGS_KEY, DEFAULT_ALERT_SETTINGS, getAlertSettings, onTestAlert, requestTestAlert, updateAlertSettings, useAlertSettings } from './src/components/AlertSettings'
import { Sessions } from './src/components/Sessions';
import { WebsocketStatus, ConnectionHost } from './src/components/WebsocketStatus';
import { PrinterEdition } from './src/components/PrinterEdition';
import { TicketPreview } from './src/components/TicketPreview';
import { PrintingHost } from './src/components/TicketPreview/PrintingHost';
//OComponents
import {
  OText,
  OButton,
  OInput,
  OIcon,
  OFab,
  OTextarea,
  OAlertOriginal,
  OModal,
  OToast,
  OLink,
  ONavbar,
  Icon,
  IconTile,
  OBottomPopup,
  SheetHeader,
  ONotice,
  useConfirm,
  useNotice,
  ConfirmDialogHost,
  OSelect,
  OCalendar,
  OCheckbox,
  ChoiceMark,
  ChoiceRow,
  ChoiceTile,
  SectionTitle,
  BackButton,
  ModalCloseButton,
  FilterChip,
  Tabs,
  OBadge,
  ODivider,
  OCard,
  OListRow,
  OAvatar,
  OStepper,
  OOtpInput,
  OSwitch,
  OProgress,
  OBottomBar,
  ScreenContainer,
  PaneLayout,
  LoadingOverlay,
  OSpinner,
  FieldError,
  PasswordToggle,
  StableText,
  SkeletonBone,
  KeyboardScreen,
  KeyboardScrollView,
  SheetFooter,
  GLYPH
} from './src/components/shared';

import { getTraduction } from './src/utils'

// context
import { OfflineActionsContext, OfflineActionsProvider, useOfflineActions } from './src/context/OfflineActions'

//layouts
import { SafeAreaContainer } from './src/layouts/SafeAreaContainer';
import { SafeAreaContainerLayout } from './src/layouts/SafeAreaContainer';

// hooks
import { useLocation } from './src/hooks/useLocation';
import { useCountdownTimer } from './src/hooks/useCountdownTimer';
import { DeviceOrientationMethods, LANDSCAPE, PORTRAIT, useDeviceOrientation } from './src/hooks/DeviceOrientation';

// providers
import { StoreMethods } from './src/providers/StoreUtil';
import { isManualDriverAssignmentEnabled } from './src/components/OrderDetails/isManualDriverAssignmentEnabled';

export {
  //Components
  AppTabBar,
  TabBarItem,
  SHELL_TABS,
  OrderActionsHost,
  useOrderActions,
  orderActions,
  canAssignDriver,
  canReviewCustomer,
  canAdjustTime,
  BusinessController,
  BusinessProductList,
  Chat,
  ForgotPasswordForm,
  GoogleMap,
  Home,
  LanguageSelector,
  LanguageSheet,
  LoginForm,
  LogoutButton,
  MessagesOption,
  NewOrderAlert,
  OrdersBoard,
  NotFoundSource,
  OrderDetailsPage,
  OrderDetailsBusiness,
  orderStage,
  statusLabel,
  orderNumber,
  orderNumberText,
  useOrderNumberText,
  buildOrderCopyText,
  OrderMessage,
  SelectConversation,
  SelectStore,
  OrdersOption,
  OrdersSource,
  useOrdersSplit,
  useOrdersSearch,
  OrdersSearchModal,
  OrdersNotices,
  OrdersOptionBusiness,
  OrdersOptionCity,
  OrdersOptionDriver,
  OrdersOptionPaymethod,
  PhoneInputNumber,
  PreviousMessages,
  OrderCard,
  GroupedOrderCard,
  OrdersSkeleton,
  PrinterSettings,
  PrintTicketSettings,
  ProductItemAccordion,
  ReviewCustomer,
  SafeAreaContainerLayout,
  Sessions,
  StoresList,
  usePauseOrders,
  getStoreStatus,
  StoreProductOptions,
  UserFormDetails,
  UserFormDetailsUI,
  UserProfileForm,
  VerifyPhone,
  NotificationSetting,
  NotificationsPermissionSheet,
  AlertsAndSound,
  OrdersDisplaySettings,
  ALERT_SOUNDS,
  ALERT_SETTINGS_KEY,
  DEFAULT_ALERT_SETTINGS,
  getAlertSettings,
  onTestAlert,
  requestTestAlert,
  updateAlertSettings,
  useAlertSettings,
  WebsocketStatus,
  ConnectionHost,
  PrinterEdition,
  TicketPreview,
  PrintingHost,
  //OComponents
  OAlertOriginal,
  OButton,
  OIcon,
  OInput,
  OLink,
  OFab,
  OModal,
  OToast,
  OText,
  OTextarea,
  ONavbar,
  Icon,
  IconTile,
  OBottomPopup,
  SheetHeader,
  ONotice,
  useConfirm,
  useNotice,
  ConfirmDialogHost,
  OSelect,
  OCalendar,
  OCheckbox,
  ChoiceMark,
  ChoiceRow,
  ChoiceTile,
  SectionTitle,
  BackButton,
  ModalCloseButton,
  FilterChip,
  Tabs,
  OBadge,
  ODivider,
  OCard,
  OListRow,
  OAvatar,
  OStepper,
  OOtpInput,
  OSwitch,
  OProgress,
  OBottomBar,
  ScreenContainer,
  PaneLayout,
  LoadingOverlay,
  OSpinner,
  FieldError,
  PasswordToggle,
  StableText,
  SkeletonBone,
  KeyboardScreen,
  KeyboardScrollView,
  SheetFooter,
  GLYPH,
  //layouts
  SafeAreaContainer,
  // hooks
  useLocation,
  useCountdownTimer,
  DeviceOrientationMethods,
  LANDSCAPE,
  PORTRAIT,
  useDeviceOrientation,
  //context
  OfflineActionsContext,
  OfflineActionsProvider,
  useOfflineActions,
  // providers
  StoreMethods,
  // utils
  getTraduction,
  isManualDriverAssignmentEnabled,
};
