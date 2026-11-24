import { TextInputProps } from 'react-native';

export interface PhoneInputParams {
  data?: any;
  handleData?: any;
  defaultValue?: any;
  defaultCode?: number | null;
  forwardRef?: any;
  isDisabled?: boolean;
  textInputProps?: TextInputProps;
  flagProps?: any;
  onSubmitEditing?: () => void;
}

export interface LanguageSelectorParams {
  languagesState?: any;
  currentLanguage?: string;
  handleChangeLanguage?: any;
}
export interface NotFoundSourceParams {
  /** A picture the caller brings (an image source); without it the tile with `icon`. */
  image?: any;
  /** The tile's glyph (Ionicons). */
  icon?: string;
  /** The title (`empty_state.base.title`). */
  content?: string;
  /** The line under the title (`empty_state.base.text` in `text_color`). */
  text?: string;
  btnTitle?: string;
  btnDisabled?: boolean;
  conditioned?: boolean;
  onClickButton?: any;
  children?: any;
  /** The state takes the room it is given and centres itself in it (a screen's whole body, not a row of a list). */
  fill?: boolean;
  testID?: string;
  actionTestID?: string;
  /** A small line under the action (the printers': "Without a printer you can still share any ticket as a PDF"). */
  footnote?: string;
}
export interface MessagesOptionParams {
  orders?: any;
  setOrders?: (status: any) => {};
  loadMore?: (key?: any) => {};
  orderList?: any;
  activeOrders?: boolean;
  pagination?: any;
  customArray?: Array<any>;
  messages?: any;
  setMessages?: () => {};
  loadMoreOrders?: () => {};
  loadOrders?: () => {};
  loadMessages?: () => {};
  handlerSubmit?: () => {};
  readMessages?: () => {};
  messagesReadList?: any;
  onNavigationRedirect?: any;
  setSortBy?: any;
  getOrders?: any
}

export interface PreviousMessagesParams {
  orders?: any;
  setOrders?: (status: any) => {};
  pagination?: any;
  getOrderStatus?: any;
  orderID?: number;
  reorderLoading?: boolean;
  messages?: any;
  setMessages?: (state?: any) => {};
  tabsFilter?: any;
  loadMoreOrders?: (status: any) => {};
  loadMessages?: (id: any) => {};
  handleReorder?: (order: any) => {};
  onNavigationRedirect?: (route: string, params?: any) => {};
  getOrders?: any;
  loading?: boolean;
  reload?: boolean;
  tabs?: any;
  loadMore: any
  error?: boolean
}
export interface OrderDetailsParams {
  handleUpdateLocationDriver?: () => {};
  setOrders?: (state: any) => {};
  actions?: actions;
  titleAccept?: textTranslate;
  titleReject?: textTranslate;
  titleNotReady?: textTranslate;
  appTitle?: textTranslate;
  drivers?: any;
  loadingDriver?: boolean;
  navigation?: any;
  messagesReadList?: any;
  urlToShare?: string;
  messages?: any;
  handleAssignDriver?: (id: any) => {};
  handleChangeOrderStatus?: (status: any, isAcceptOrReject: any, val?: any) => {};
  order?: any;
  isFromRoot?: any;
  handleOrderRedirect?: () => {};
  setMessages?: () => {};
  readMessages?: () => {};
  isFromCheckout?: boolean;
  driverLocation?: any;
  goToBusinessList?: boolean;
  permissions?: any;
  askLocationPermission?: any;
  redirectToSettings?: any;
  updateDriverPosition?: any;
  driverUpdateLocation?: any;
  setDriverUpdateLocation?: any;
  handleClickLogisticOrder?: (status: number, orderId: number) => void;
  orderTitle?: any;
  forceUpdate?: number;
  regressionRequest?: any;
  clearRegressionRequest?: () => void;
  getPermissions?: any
  loadMessages?: any;
  notificationApp?: string
  isCustomView?: boolean
  orderAssingId?: any
  isGrantedPermissions?: any
  showReservationAlert?: any
  setShowReservationAlert?: any
  logisticOrderStatus?: any
}
export interface MessagesParams {
  type?: string;
  order?: any;
  orderId?: number;
  messages?: any;
  message?: string;
  image?: string;
  messagesToShow?: any;
  sendMessage?: any;
  canRead?: any;
  setCanRead?: any;
  notificationApp?: string
  handleSend?: () => {};
  setImage?: (image: string | null) => {};
  setMessage?: (comment: string) => {};
  setMessages?: (state?: any) => {};
  readMessages?: () => {};
  isMessagesLoading?: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  speed: number;
  mocked?: boolean;
}

interface actions {
  accept: string;
  reject: string;
  pickupFailed?: string;
  deliveryFailed?: string;
  notReady?: string;
  forcePickUp?: string;
  forceDelivery?: string;
}

interface textTranslate {
  key: string;
  text: string;
}

export interface ReviewCustomerParams {
  order?: any,
  closeModal?: any,
  reviewState?: any,
  setReviewState?: any,
  actionState?: any,
  handleChangeQualification?: any,
  handleSendCustomerReview?: any,
  handleCustomCustomerReview?: any,
}

export interface SessionsParams {
  navigation: any,
  sessionsList?: any,
  actionState?: any,
  handleDeleteSession?: any,
  handleDeleteAllSessions?: any
}

