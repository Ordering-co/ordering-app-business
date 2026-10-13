import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder';
import { useTheme } from 'styled-components/native';
import { useFocusEffect } from '@react-navigation/native';
import CountryPicker from 'react-native-country-picker-modal';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import AntDesignIcon from 'react-native-vector-icons/AntDesign'

import { OrderDetailsContainer, AssignDriver, DriverItem, Header, Actions, Dot, Messages as MessagesStyled } from './styles';
import { isManualDriverAssignmentEnabled } from './isManualDriverAssignmentEnabled';
import { USER_TYPE } from '../../config/constants';
import { verifyDecimals, getProductPrice, getOrderStatus } from '../../utils';
import { OrderDetailsParams } from '../../types';
import { _retrieveStoreData } from '../../providers/StoreUtil'
import { OrderHeaderComponent } from './OrderHeaderComponent';
import { OrderContentComponent } from './OrderContentComponent';
import { getViewActionOrderPlan } from './getViewActionOrderPlan'
import { getOrderDetailsPrinterSettings } from './getOrderDetailsPrinterSettings'
import { TICKET_PREVIEW_ENTRY, getTicketPreviewNavigationPlan } from './getTicketPreviewNavigationPlan'

import {
  ToastType,
  useToast,
  useLanguage,
  OrderDetails as OrderDetailsController,
  useUtils,
  useConfig,
  Messages,
  useSession
} from '@components';

import {
  OModal, OText, OIcon,
  AcceptOrRejectOrder,
  Chat,
  FloatingButton,
  GoogleMap,
  NotFoundSource,
  OAlertOriginal,
  OIconButton
} from '@ui'

export const OrderDetailsUI = (props: OrderDetailsParams) => {
  const {
    navigation,
    messages,
    setMessages,
    readMessages,
    messagesReadList,
    handleAssignDriver,
    driverLocation,
    actions,
    orderTitle,
    appTitle,
    loadMessages,
    notificationApp,
    showReservationAlert,
    setShowReservationAlert,
    logisticOrderStatus,
    regressionRequest,
    clearRegressionRequest
  } = props;

  const theme = useTheme();
  const [, t] = useLanguage();
  const [{ parsePrice, parseNumber, parseDate }] = useUtils();
  const [{ configs }] = useConfig();
  const [{ user }] = useSession();
  const [, { showToast }] = useToast();
  const [unreadAlert, setUnreadAlert] = useState({
    business: false,
    driver: false,
  });
  const { order, loading, error } = props.order;
  const { drivers, loadingDriver } = props.drivers;
  const messagesReadIds = messagesReadList?.map((message: any) => message?.order_message_id)
  const filteredMessages = messagesReadList?.length > 0 ? messages?.messages?.filter((message: any) => !messagesReadIds?.includes(message?.id)) : messages?.messages
  const itemsDrivers: any = [];
  const [actionOrder, setActionOrder] = useState('');
  const [openModalForBusiness, setOpenModalForBusiness] = useState(false);
  const [openModalForAccept, setOpenModalForAccept] = useState(false);
  const [pendingStatusBody, setPendingStatusBody] = useState<any>(null);
  const [openModalForMapView, setOpenModalForMapView] = useState(false);
  const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<any>('')
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(false)
  const [alertState, setAlertState] = useState<any>({ open: false, content: null, title: null })

  const isReservation = order?.delivery_type === 9
  const statusForComplete = [4, 20, 21]
  const orderToComplete = isReservation ? [...statusForComplete, 7] : statusForComplete
  const pendingStatus = [0]
  const orderToReady = [7, 14]
  const deliveryTypes = [1, 7]

  const colors: any = {
    //BLUE
    0: theme.colors.statusOrderBlue,
    3: theme.colors.statusOrderBlue,
    4: theme.colors.statusOrderBlue,
    7: theme.colors.statusOrderBlue,
    8: theme.colors.statusOrderBlue,
    9: theme.colors.statusOrderBlue,
    13: theme.colors.statusOrderBlue,
    14: theme.colors.statusOrderBlue,
    18: theme.colors.statusOrderBlue,
    19: theme.colors.statusOrderBlue,
    20: theme.colors.statusOrderBlue,
    21: theme.colors.statusOrderBlue,
    22: theme.colors.statusOrderBlue,
    23: theme.colors.statusOrderBlue,
    24: theme.colors.statusOrderBlue,
    25: theme.colors.statusOrderBlue,
    26: theme.colors.statusOrderBlue,
    //GREEN
    1: theme.colors.statusOrderGreen,
    11: theme.colors.statusOrderGreen,
    15: theme.colors.statusOrderGreen,
    //RED
    2: theme.colors.statusOrderRed,
    5: theme.colors.statusOrderRed,
    6: theme.colors.statusOrderRed,
    10: theme.colors.statusOrderRed,
    12: theme.colors.statusOrderRed,
    16: theme.colors.statusOrderRed,
    17: theme.colors.statusOrderRed,
  };

  if (order?.status === 7 || order?.status === 4) {
    if (drivers?.length > 0 && drivers) {
      drivers.forEach((driver: any) => {
        itemsDrivers.push({
          available: driver?.available,
          key: driver?.id,
          value: driver?.id,
          label: driver?.name,
        });
      });

      if (
        !drivers?.some((driver: any) => driver?.id === order?.driver?.id) &&
        order?.driver?.id
      ) {
        itemsDrivers.push({
          available: order?.driver?.available,
          key: order?.driver?.id,
          value: order?.driver?.id,
          label: order?.driver?.name,
        });
      }
    }

    if (order?.driver && (!drivers?.length || drivers?.length === 0)) {
      itemsDrivers.push({
        available: order?.driver?.available,
        key: order?.driver?.id,
        value: order?.driver?.id,
        label: order?.driver?.name,
      });
    }

    if (order?.driver) {
      itemsDrivers.push({
        available: true,
        key: null,
        value: null,
        label: t('UNASSIGN_DRIVER', 'Unassign Driver'),
      });
    }

    if (itemsDrivers.length > 0) {
      itemsDrivers.sort((a: any, b: any) => {
        if (a.available > b.available) return -1;
      });
    }
  }

  const handleChangeOrderStatus = async (status: any, isAcceptOrReject: any = {}, redirectTicket: boolean = false) => {
    if (props.handleChangeOrderStatus) {
      const order: any = await props.handleChangeOrderStatus(status, isAcceptOrReject)

      if (order?.status === 7 && autoPrintEnabled && printerSettings && redirectTicket) {
        handleViewSummaryOrder(TICKET_PREVIEW_ENTRY.acceptAutoPrint)
      }
      return order
    }
  }

  const getFormattedSubOptionName = ({ quantity, name, position, price }: any) => {
    if (name !== 'No') {
      const pos = position && position !== 'whole' ? `(${t(position.toUpperCase(), position)})` : '';
      return pos
        ? `${quantity} x ${name} ${pos} +${parsePrice(price)}\n`
        : `${quantity} x ${name} +${parsePrice(price)}\n`;
    } else {
      return 'No\n';
    }
  };

  const handleCopyClipboard = () => {
    const businessName = !!order?.business?.name
      ? `${order?.business?.name} \n`
      : '';

    const businessEmail = !!order?.business?.email
      ? `${order?.business?.email} \n`
      : '';

    const businessCellphone = !!order?.business?.cellphone
      ? `${order?.business?.cellphone} \n`
      : '';

    const businessPhone = !!order?.business?.phone
      ? `${order?.business?.phone} \n`
      : '';

    const businessAddress = !!order?.business?.address
      ? `${order?.business?.address} \n`
      : '';

    const businessSpecialAddress = !!order?.business?.address_notes
      ? `${order?.business?.address_notes} \n \n`
      : '';

    const customerName = !!order?.customer?.name
      ? `${order?.customer?.name} ${order?.customer?.middle_name || ''} ${order?.customer?.lastname || ''
      } ${order?.customer?.second_lastname || ''} \n`
      : '';

    const customerEmail = !!order?.customer.email
      ? `${order?.customer.email} \n`
      : '';

    const customerCellPhone = !!order?.customer?.cellphone
      ? `${order?.customer?.cellphone} \n`
      : '';

    const customerPhone = !!order?.customer?.phone
      ? `${order?.customer?.phone} \n`
      : '';

    const customerAddress = !!order?.customer?.address
      ? `${order?.customer?.address} \n`
      : '';

    const customerSpecialAddress = !!order?.customer?.address_notes
      ? `${order?.customer?.address_notes} \n`
      : '';

    const payment = order?.paymethod?.name
      ? `${order?.paymethod?.name} - ${order.delivery_type === 1
        ? t('DELIVERY', 'Delivery')
        : order.delivery_type === 2
          ? t('PICKUP', 'Pickup')
          : order.delivery_type === 3
            ? t('EAT_IN', 'Eat in')
            : order.delivery_type === 4
              ? t('CURBSIDE', 'Curbside')
              : order.delivery_type === 5
                ? t('DRIVER_THRU', 'Driver thru')
                : order.delivery_type === 7
                  ? t('CATERING_DELIVERY', 'Catering delivery')
                  : order.delivery_type === 8
                    ? t('CATERING_PICKUP', 'Catering pickup')
                    : order.delivery_type === 9
                      ? t('RESERVATIONS', 'Reservations')
                      : t('DELIVERY', 'Delivery')
      }\n`
      : '';

    const getSuboptions = (suboptions: any) => {
      const array: any = []
      suboptions?.length > 0 &&
        suboptions?.map((suboption: any) => {
          const string = `${getFormattedSubOptionName(suboption)}`
          array.push(string)
        })

      return array.join('')
    }

    const getOptions = (options: any, productComment: string = '') => {
      const array: any = [];

      options?.length &&
        options?.map((option: any) => {
          const string =
            `  ${option.name}\n    ${getSuboptions(option.suboptions)}`;

          array.push(string)
        })

      if (productComment) {
        array.push(`  ${t('COMMENT', 'Comment')}\n    ${productComment}\n`)
      }

      return array.join('')
    }

    const productsInArray =
      order?.products.length &&
      order?.products.map((product: any, i: number) => {
        const string =
          `${product?.quantity} X ${product?.name} ${parsePrice(product.total ?? getProductPrice(product))}\n${getOptions(product.options, product.comment)}`;

        return i === 0 ? ` ${string}` : string
      });

    const productsInString = productsInArray.join(' ');
    const orderDetails = `${t(
      'ORDER_DETAILS',
      'Order Details',
    )}:\n${productsInString}\n`;

    const subtotal = `${t('SUBTOTAL', 'Subtotal')}: ${parsePrice(
      order?.subtotal
    )}\n`;

    const drivertip = `${t('DRIVER_TIP', 'Driver tip')} ${parsePrice(
      order?.summary?.driver_tip || order?.totalDriverTip
    )}\n`;

    const deliveryFee = `${t('DELIVERY_FEE', 'Delivery fee')} ${verifyDecimals(
      order?.service_fee,
      parseNumber,
    )}% ${parsePrice(order?.summary?.service_fee || order?.serviceFee || 0)}\n`;

    const total = `${t('TOTAL', 'Total')} ${parsePrice(
      order?.summary?.total || order?.total
    )}\n`;

    const orderStatus = `${t('INVOICE_ORDER_NO', 'Order No.')} ${order.id} ${t(
      'IS',
      'is',
    )} ${getOrderStatus(order?.status, t)?.value}\n`;

    Clipboard.setString(
      `${orderStatus} ${payment} ${t(
        'BUSINESS_DETAILS',
        'Business Details',
      )}\n ${businessName} ${businessEmail} ${businessCellphone} ${businessPhone} ${businessAddress} ${businessSpecialAddress}${t(
        'CUSTOMER_DETAILS',
        'Customer Details',
      )}\n ${customerName} ${customerEmail} ${customerCellPhone} ${customerPhone} ${customerAddress} ${customerSpecialAddress}\n${orderDetails} ${subtotal} ${drivertip} ${deliveryFee} ${total}`,
    );

    showToast(
      ToastType.Info,
      t('COPY_TO_CLIPBOARD', 'Copy to clipboard.'),
      1000,
    );
  };

  const handleOpenMessagesForBusiness = () => {
    navigation?.navigate('OrderMessage', { orderId: order?.id })
    // setOpenModalForBusiness(true)
    readMessages && readMessages()
    loadMessages && loadMessages()
    setUnreadAlert({ ...unreadAlert, business: false });
  };

  const handleViewActionOrder = async (action: string) => {
    const plan = getViewActionOrderPlan({ action, loading });
    if (plan.ignore) return;

    if (openModalForMapView) {
      setOpenModalForMapView(false);
    }
    setActionOrder(action);
    if (plan.openModal) {
      setOpenModalForAccept(true);
    }
  };

  const handleViewSummaryOrder = (entry?: unknown) => {
    const plan = getTicketPreviewNavigationPlan({
      printerSettings,
      order,
      orderStatus: getOrderStatus(order?.status, t)?.value,
      entry,
      autoPrintEnabled
    })
    navigation?.navigate?.(plan.screen, plan.params)
  };

  const handleCloseModal = () => {
    readMessages && readMessages()
    loadMessages && loadMessages()
    setOpenModalForBusiness(false);
  };

  const handleOpenMapView = () => {
    setOpenModalForMapView(!openModalForMapView);
  };

  const handleArrowBack: any = () => {
    navigation?.canGoBack() && navigation.goBack();
  };

  const handleCloseAlert = () => {
    setAlertState({
      open: false,
      content: null,
      title: null
    })
  }

  useEffect(() => {
    if (messagesReadList?.length) {
      openModalForBusiness
        ? setUnreadAlert({ ...unreadAlert, business: false })
        : setUnreadAlert({ ...unreadAlert, driver: false });
    }
  }, [messagesReadList]);

  let locations = [
    {
      ...order?.driver?.location,
      title: order?.driver?.name ?? t('DRIVER', 'Driver'),
      icon:
        order?.driver?.photo ||
        'https://res.cloudinary.com/demo/image/fetch/c_thumb,g_face,r_max/https://www.freeiconspng.com/thumbs/driver-icon/driver-icon-14.png',
      level: 4,
    },
    {
      ...order?.business?.location,
      title: order?.business?.name,
      address: {
        addressName: order?.business?.address,
        zipcode: order?.business?.zipcode
      },
      icon: order?.business?.logo || 'https://res.cloudinary.com/demo/image/fetch/c_thumb,g_face,r_max/https://res.cloudinary.com/ordering2/image/upload/v1654619525/hzegwosnplvrbtjkpfi6.png',
      level: 2,
    },
    {
      ...order?.customer?.location,
      title: order?.customer?.name ?? t('CUSTOMER', 'Customer'),
      address: {
        addressName: order?.customer?.address,
        zipcode: order?.customer?.zipcode
      },
      icon:
        order?.customer?.photo ||
        'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,r_max/d_avatar.png/non_existing_id.png',
      level: 3,
    },
  ];

  console.log('order', order, locations)
  useEffect(() => {
    if (openModalForAccept) {
      setOpenModalForAccept(false);
    }

    if (openModalForMapView) {
      setOpenModalForMapView(false);
    }
  }, [loading]);

  useEffect(() => {
    if (!regressionRequest) return
    setPendingStatusBody(regressionRequest.body)
    setActionOrder('forceStatus')
    setOpenModalForAccept(true)
    clearRegressionRequest?.()
  }, [regressionRequest])

  const showFloatButtonsAcceptOrReject: any = {
    0: true,
  };

  useEffect(() => {
    if (driverLocation) {
      locations[0] = { ...locations[0], driverLocation };
    }
  }, [driverLocation]);

  const getStorageData = useCallback(async () => {
    const printers = await _retrieveStoreData('printers')
    const autoPrint = await _retrieveStoreData('auto_print_after_accept_order')
    const next = getOrderDetailsPrinterSettings({ printers, autoPrint })
    setPrinterSettings(next.printerSettings)
    setAutoPrintEnabled(next.autoPrintEnabled)
  }, [])

  useFocusEffect(
    useCallback(() => {
      getStorageData()
    }, [getStorageData])
  )

  useEffect(() => {
    if (showReservationAlert) {
      setAlertState({
        open: true,
        title: t('RESERVATION', 'Reservation'),
        content: [`${t('SCHEDULED_FOR', 'Scheduled for')}: ${parseDate(order?.reservation?.reserve_date, { utc: false })}`]
      })
      setShowReservationAlert(false)
    }
  }, [showReservationAlert])

  const styles = StyleSheet.create({
    driverOff: {
      backgroundColor: theme.colors.notAvailable,
    },
    btnPickUp: {
      borderWidth: 0,
      backgroundColor: theme.colors.btnBGWhite,
      borderRadius: 8,
    },
    icons: {
      maxWidth: 40,
      height: 40,
      padding: 10,
      alignItems: 'flex-end',
      color: theme.colors.gray200,
    },
    btnBackArrow: {
      borderWidth: 0,
      width: 24,
      height: 24,
      tintColor: theme.colors.gray200,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
      marginTop: 10
    },
    headerText: {
      textAlign: 'center'
    },
    secondaryHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 10
    }
  });

  const locationsToSend = locations.filter(
    (location: any) => location?.lat && location?.lng,
  );

  return (
    <>
      {(!order || Object.keys(order).length === 0) &&
        (error?.length < 1 || !error) && (
          <View
            style={{
              backgroundColor: theme.colors.backgroundPage,
              paddingHorizontal: 20,
            }}>
            {[...Array(6)].map((item, i) => (
              <Placeholder key={i} Animation={Fade}>
                <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                  <Placeholder>
                    <PlaceholderLine width={90} />
                    <PlaceholderLine width={50} />
                    <PlaceholderLine width={20} />
                    <PlaceholderLine width={10} />
                  </Placeholder>
                </View>
              </Placeholder>
            ))}
          </View>
        )}

      {(!!error || error?.length > 0) && (
        <NotFoundSource
          btnTitle={t('GO_TO_MY_ORDERS', 'Go to my orders')}
          content={
            props.order.error[0] ||
            props.order.error ||
            t('NETWORK_ERROR', 'Network Error')
          }
          onClickButton={() => navigation.navigate('Orders')}
        />
      )}
      {order && Object.keys(order).length > 0 && (error?.length < 1 || !error) && (
        <View style={{ flex: 1 }}>
          {!props.isCustomView && (
            <Header>
              <OIconButton
                icon={theme.images.general.arrow_left}
                borderColor={theme.colors.clear}
                iconStyle={{ width: 24, height: 24 }}
                style={styles.btnBackArrow}
                onClick={() => handleArrowBack()}
              />
              {(!order?.isLogistic || (!logisticOrderStatus?.includes(order?.status) && !order?.order_group)) && (
                <Actions>
                  {getOrderStatus(order?.status, t)?.slug !==
                    'PENDING' && (
                      <>
                        <TouchableOpacity onPress={() => handleCopyClipboard?.()}>
                          <MaterialCommunityIcons
                            name='content-copy'
                            color={theme.colors.gray200}
                            size={20}
                            style={styles.icons}
                          />
                        </TouchableOpacity>
                        {!!handleViewSummaryOrder && (
                          <TouchableOpacity onPress={() => handleViewSummaryOrder?.()}>
                            <SimpleLineIcons
                              name='printer'
                              color={theme.colors.gray200}
                              size={20}
                              style={styles.icons}
                            />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  <OIconButton
                    icon={theme.images.general.map}
                    iconStyle={{
                      width: 20,
                      height: 20,
                      tintColor: theme.colors.gray200,
                    }}
                    borderColor={theme.colors.clear}
                    style={{ ...styles.icons, minWidth: 40 }}
                    onClick={() => handleOpenMapView()}
                  />
                  <MessagesStyled>
                    {filteredMessages?.filter((message: any) => message?.author_id !== user?.id && !message?.read)?.length > 0 && <Dot />}
                    <OIconButton
                      icon={theme.images.general.messages}
                      iconStyle={{
                        width: 20,
                        height: 20,
                        tintColor: theme.colors.gray200,
                      }}
                      borderColor={theme.colors.clear}
                      style={styles.icons}
                      onClick={() => handleOpenMessagesForBusiness()}
                    />
                  </MessagesStyled>
                </Actions>
              )}
            </Header>
          )}
          <OrderDetailsContainer
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            hasFloatingButton={order &&
              Object.keys(order).length > 0 &&
              (pendingStatus.includes(order?.status) ||
                (orderToReady.includes(order?.status) && !isReservation) ||
                (orderToComplete.includes(order?.status) && !deliveryTypes.includes(order?.delivery_type)))}
          >
            <>
              <OrderHeaderComponent
                order={order}
                handleOpenMapView={handleOpenMapView}
                handleOpenMessagesForBusiness={handleOpenMessagesForBusiness}
                getOrderStatus={getOrderStatus}
                handleViewSummaryOrder={handleViewSummaryOrder}
                handleCopyClipboard={handleCopyClipboard}
                handleArrowBack={handleArrowBack}
                isCustomView={props.isCustomView}
                messages={messages}
                messagesReadList={messagesReadList}
                colors={colors}
              />
              {(order?.status === 7 || order?.status === 4) &&
                deliveryTypes.includes(order?.delivery_type) && isManualDriverAssignmentEnabled(configs) && (
                  <AssignDriver>
                    <OText style={{ marginBottom: 15 }} size={16} weight="700">
                      {t('ASSIGN_DRIVER', 'Assign driver')}
                    </OText>
                    <View
                      style={{
                        backgroundColor: theme.colors.secondary,
                        borderRadius: 10,
                        marginBottom: 10,
                        paddingVertical: 5
                      }}>
                      <CountryPicker
                        // @ts-ignore
                        countryCode={undefined}
                        visible={isDriverModalVisible}
                        onClose={() => setIsDriverModalVisible(false)}
                        withCountryNameButton
                        renderFlagButton={() => (
                          <>
                            <TouchableOpacity
                              onPress={() => setIsDriverModalVisible(true)}
                              disabled={
                                itemsDrivers.length === 0 || loadingDriver
                              }>
                              {loadingDriver ? (
                                <DriverItem justifyContent="center">
                                  <ActivityIndicator
                                    size="small"
                                    color={theme.colors.primary}
                                  />
                                </DriverItem>
                              ) : (
                                <DriverItem justifyContent="space-between">
                                  <OText color={theme.colors.primary}>
                                    {itemsDrivers.length > 0
                                      ? order?.driver?.name ||
                                      t('DRIVERS', 'Drivers')
                                      : t('WITHOUT_DRIVERS', 'Without drivers')}
                                  </OText>
                                  <AntDesignIcon
                                    name={isDriverModalVisible ? 'up' : 'down'}
                                    color={theme.colors.gray200}
                                    size={18}
                                  />
                                </DriverItem>
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                        flatListProps={{
                          keyExtractor: (item: any) => item.value,
                          data: itemsDrivers || [],
                          renderItem: ({ item }: any) => (
                            <TouchableOpacity
                              style={!item.available && styles.driverOff}
                              disabled={
                                !item.available ||
                                order?.driver?.id === item.value
                              }
                              onPress={() => {
                                handleAssignDriver &&
                                  handleAssignDriver(item.value);
                                setIsDriverModalVisible(false);
                              }}>
                              <DriverItem>
                                <OText
                                  color={!item.available && theme.colors.grey}>
                                  {item.label}
                                  {!item.available &&
                                    ` (${t('NOT_AVAILABLE', 'Not available')})`}
                                  {item.value === order?.driver?.id &&
                                    ` (${t('SELECTED', 'Selected')})`}
                                </OText>
                              </DriverItem>
                            </TouchableOpacity>
                          ),
                        }}
                      />
                    </View>
                  </AssignDriver>
                )}
              <View style={{ flex: 1, paddingHorizontal: 20 }}>
                <OrderContentComponent order={order} />
              </View>
              {/* <OModal
                open={openModalForBusiness}
                order={order}
                title={`${t('INVOICE_ORDER_NO', 'Order No.')} ${order?.id}`}
                entireModal
                onClose={() => handleCloseModal()}>
                <Chat
                  type={
                    openModalForBusiness ? USER_TYPE.BUSINESS : USER_TYPE.DRIVER
                  }
                  orderId={order?.id}
                  messages={messages}
                  order={order}
                  setMessages={setMessages}
                  notificationApp={notificationApp}
                />
              </OModal> */}

              <OModal
                open={openModalForAccept}
                onClose={() => setOpenModalForAccept(false)}
                entireModal
                customClose>
                <AcceptOrRejectOrder
                  handleUpdateOrder={(status, isAcceptOrReject) => handleChangeOrderStatus(status, isAcceptOrReject, true)}
                  closeModal={setOpenModalForAccept}
                  customerCellphone={order?.customer?.cellphone}
                  loading={loading}
                  action={actionOrder}
                  orderId={order?.id}
                  notShowCustomerPhone={false}
                  actions={actions}
                  orderTitle={orderTitle}
                  appTitle={appTitle}
                  pendingStatusBody={pendingStatusBody}
                />
              </OModal>

              <OModal
                open={openModalForMapView}
                onClose={() => handleOpenMapView()}
                entireModal
                customClose>
                <GoogleMap
                  location={order?.customer?.location}
                  locations={locationsToSend}
                  driverLocation={driverLocation}
                  navigation={navigation}
                  handleViewActionOrder={handleViewActionOrder}
                  handleOpenMapView={handleOpenMapView}
                  readOnly
                  showAcceptOrReject={
                    showFloatButtonsAcceptOrReject[order?.status]
                  }
                  order={order}
                  logisticOrderStatus={logisticOrderStatus}
                  getOrderStatus={getOrderStatus}
                  colors={colors}
                />
              </OModal>
            </>
            <View style={{ height: 30 }} />
          </OrderDetailsContainer>
          {order &&
            Object.keys(order).length > 0 &&
            pendingStatus.includes(order?.status) && (
              <FloatingButton
                btnText={t('REJECT', 'Reject')}
                isSecondaryBtn={false}
                secondButtonClick={() => handleViewActionOrder('accept')}
                firstButtonClick={() => handleViewActionOrder('reject')}
                secondBtnText={t('ACCEPT', 'Accept')}
                secondButton={true}
                firstColorCustom={theme.colors.red}
                secondColorCustom={theme.colors.green}
                widthButton={'100%'}
                isPadding={true}
                disabled={loading}
              />
            )}
          {orderToReady.includes(order?.status) && !isReservation && (
            <FloatingButton
              btnText={t('READY_FOR_PICKUP', 'Ready for pickup')}
              colorTxt1={theme.colors.white}
              color={theme.colors.green}
              firstButtonClick={() => handleChangeOrderStatus?.(4)}
              widthButton={'100%'}
              isPadding={true}
              disabled={loading}
            />
          )}
          {orderToComplete.includes(order?.status) && !deliveryTypes.includes(order?.delivery_type) && (
            <FloatingButton
              btnText={
                !isReservation
                  ? t('ORDER_NOT_PICKEDUP_BY_CUSTOMER', 'Order not picked up by customer')
                  : t('CUSTOMER_NOT_ARRIVED', 'Customer not arrived')
              }
              isSecondaryBtn={false}
              colorTxt1={theme.colors.white}
              secondButtonClick={() => handleChangeOrderStatus?.(15)}
              firstButtonClick={() => handleChangeOrderStatus?.(17)}
              secondBtnText={
                !isReservation
                  ? t('ORDER_PICKUP_COMPLETED_BY_CUSTOMER', 'Pickup completed by customer')
                  : t('CUSTOMER_ARRIVED', 'Customer arrived')
              }
              secondButton={true}
              isPadding={true}
              firstColorCustom={theme.colors.red}
              secondColorCustom={theme.colors.green}
              widthButton={'100%'}
              disabled={loading}
            />
          )}
        </View>
      )}
      <OAlertOriginal
        open={alertState.open}
        title={alertState.title}
        content={alertState.content}
        onAccept={() => handleCloseAlert()}
        onClose={() => handleCloseAlert()}
      />
    </>
  );
};

export const OrderDetailsBusiness = (props: OrderDetailsParams) => {
  const orderDetailsProps = {
    ...props,
    UIComponent: OrderDetailsUI,
  };
  return <OrderDetailsController {...orderDetailsProps} />;
};
