

export const flatArray = (arr: any) => [].concat(...arr);

/**
 * Function to convert a string in string capitalized
 * @param {string} str string to capitalize
 */
export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)


/**
 * Function to return the traduction depending of a key 't'
 * @param {string} key for traduction
 */
export const getTraduction = (key: string, t: any, _theme?: any) => {
  const keyList: any = {
    // Add the key and traduction that you need below
    ERROR_ORDER_WITHOUT_CART: 'The order was placed without a cart',
    ERROR_INVALID_COUPON: "The coupon doesn't exist",
    ERROR_IVALID_COUPON_MINIMUM:
      'You must have more products in your cart to use the coupon',
    ERROR_ADD_PRODUCT_VERY_FAR_FOR_PICKUP:
      'The business is too far for order type pickup',
    ERROR_PLACE_PAY_WITH_CARD2: 'An error occurred while trying to pay by card',
    ERROR_ADD_PRODUCT_BUSINESS_CLOSED: 'The business is closed at the moment',
    INTERNAL_ERROR: 'Server Error, please wait, we are working to fix it',
    ERROR_NOT_FOUND_BUSINESSES: 'No businesses found near your location',
    YOU_DO_NOT_HAVE_PERMISSION: 'You do not have permission',
    INVALID_CODE: 'Invalid verify code',
    STRIPE_ERROR: 'Payment service error. Try again later.',
    ERROR_AUTH_TWILIO_DISABLED: 'Auth error, twilio is disabled',
    ERROR_CART_SELECT_PAYMETHOD: 'An error occurred with selected pay method',
    ERROR_YOU_HAVE_ACTIVE_CART: "You can't reorder this cart",
    ERROR_YOU_HAVE_NOT_CART: 'Cart not found',
    ERROR_PLACE_PAY_WITH_REDIRECT:
      'An error occurred while trying to pay by redirect',
    ERROR_PLACE_PAY_WITH_CARD1: 'An error occurred while trying to pay by card',
    ERROR_PLACE_PAY_WITH_PAYPAL_CAPTURE:
      'An error occurred while trying to pay by PayPal',
    ERROR_ADD_PRODUCT_VERY_FAR_FOR_DELIVERY:
      'Error adding product, very far for delivery',
    ERROR_PRODUCT_NOT_FOUND: 'Error with the product',
    ERROR_USER_UPDATE_YOU_HAVE_ASSIGNED_ORDERS:
      "You can't because you have assigned orders",
    ERROR_INVALID_OFFER: 'The offer doesn\'t exist',
    ERROR_AUTH_DRIVER_LOGIN_VALIDATION: 'Error auth driver login validation',
    ERROR_DRIVER_UPDATE_SCHEDULE: 'Error driver update schedule',
    ERROR_ADD_BUSINESS_INVALID: 'An error occurred with the business',
    ERROR_ADD_PRODUCT_BEFORE_ADDRESS: 'You must have an address'
  };
  return keyList[key]
    ? t(key, keyList[key])
    : (typeof key === 'string')
      ? (/^[^\s]*_[^\s]*$/.test(key))
        ? t(key, capitalize(key.replace(/_/g, ' ').toLowerCase()))
        : t(key.replace(/ /g, '_').toUpperCase(), key)
      : null
};
/**
 * List of fields with correct order
 */
export const fieldsToSort = [
  'name',
  'middle_name',
  'lastname',
  'second_lastname',
  'email',
];
/**
 * Function to return a array sorted by certain fields
 * @param fields Array with right order
 * @param array Array to sort
 */
export const sortInputFields = ({ fields, values }: any) => {
  let fieldsBase = fields;
  const fieldsSorted: any = [];
  const fieldsArray = Array.isArray(values)
    ? values
    : values && Object.values(values);

  if (!fieldsBase) {
    fieldsBase = fieldsToSort;
  }

  fieldsBase.forEach((f: any) => {
    fieldsArray &&
      fieldsArray.forEach((field: any) => {
        if (f === field.code) {
          fieldsSorted.push(field);
        }
      });
  });
  return fieldsSorted;
};

/**
 * Function to check if a number is decimal or not
 * @param {*} value number to check if decimal or not
 * @param {*} parser function fallback when is decimal
 * @returns string
 */
export const verifyDecimals = (value: number, parser: any, options?: any) => {
  if (value % 1 === 0) {
    return value;
  } else {
    return options ? parser(value, options) : parser(value);
  }
};

export const getProductPrice = (product: any) => {
  let subOptionPrice = 0;
  if (product.options.length > 0) {
    for (const option of product.options) {
      for (const suboption of option.suboptions) {
        subOptionPrice += suboption.quantity * suboption.price;
      }
    }
  }

  const price = product.quantity * (product.price + subOptionPrice);
  return price;
};

export const transformDistance = (value: number, distanceUnit?: string) => {
  return distanceUnit === 'mi'
    ? (value / 1.609).toFixed(2)
    : distanceUnit === 'ft'
      ? (value * 3280.84).toFixed(0)
      : (value).toFixed(2)
}

export const calculateDistance = (
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
  const distanceInKm = distance / 1000;
  return distanceInKm;
};

export const locale = (languageState: any, t: any) => {
  return {
    name: languageState?.language?.code?.slice(0, 2),
    config: {
      months: [
        t('MONTH1', 'January'),
        t('MONTH2', 'February'),
        t('MONTH3', 'March'),
        t('MONTH4', 'April'),
        t('MONTH5', 'May'),
        t('MONTH6', 'June'),
        t('MONTH7', 'July'),
        t('MONTH8', 'August'),
        t('MONTH9', 'September'),
        t('MONTH10', 'October'),
        t('MONTH11', 'November'),
        t('MONTH12', 'December')
      ],
      weekdaysShort: [
        t('DAYSHORT7', 'Sun'),
        t('DAYSHORT1', 'Mon'),
        t('DAYSHORT2', 'Tue'),
        t('DAYSHORT3', 'Wed'),
        t('DAYSHORT4', 'Thu'),
        t('DAYSHORT5', 'Fri'),
        t('DAYSHORT6', 'Sat')
      ],
    }
  }
}

/**
 * List shape for ribbon
 */
export const shape = {
  rectangle: 'rectangle',
  rectangleRound: 'rectangle_round',
  capsuleShape: 'capsule_shape'
}

export const getOrderStatus = (s: string, t: any) => {
  const status = parseInt(s);
  const orderStatus = [
    {
      key: 0,
      value: t('PENDING', 'Pending'),
      slug: 'PENDING',
      percentage: 0.25,
    },
    {
      key: 1,
      value: t('COMPLETED', 'Completed'),
      slug: 'COMPLETED',
      percentage: 1,
    },
    {
      key: 2,
      value: t('REJECTED', 'Rejected'),
      slug: 'REJECTED',
      percentage: 0,
    },
    {
      key: 3,
      value: t('DRIVER_IN_BUSINESS', 'Driver in business'),
      slug: 'DRIVER_IN_BUSINESS',
      percentage: 0.6,
    },
    {
      key: 4,
      value: t('PREPARATION_COMPLETED', 'Preparation Completed'),
      slug: 'PREPARATION_COMPLETED',
      percentage: 0.7,
    },
    {
      key: 5,
      value: t('REJECTED_BY_BUSINESS', 'Rejected by business'),
      slug: 'REJECTED_BY_BUSINESS',
      percentage: 0,
    },
    {
      key: 6,
      value: t('REJECTED_BY_DRIVER', 'Rejected by Driver'),
      slug: 'REJECTED_BY_DRIVER',
      percentage: 0,
    },
    {
      key: 7,
      value: t('ACCEPTED_BY_BUSINESS', 'Accepted by business'),
      slug: 'ACCEPTED_BY_BUSINESS',
      percentage: 0.35,
    },
    {
      key: 8,
      value: t('ACCEPTED_BY_DRIVER', 'Accepted by driver'),
      slug: 'ACCEPTED_BY_DRIVER',
      percentage: 0.45,
    },
    {
      key: 9,
      value: t('PICK_UP_COMPLETED_BY_DRIVER', 'Pick up completed by driver'),
      slug: 'PICK_UP_COMPLETED_BY_DRIVER',
      percentage: 0.8,
    },
    {
      key: 10,
      value: t('PICK_UP_FAILED_BY_DRIVER', 'Pick up Failed by driver'),
      slug: 'PICK_UP_FAILED_BY_DRIVER',
      percentage: 0,
    },
    {
      key: 11,
      value: t(
        'DELIVERY_COMPLETED_BY_DRIVER',
        'Delivery completed by driver',
      ),
      slug: 'DELIVERY_COMPLETED_BY_DRIVER',
      percentage: 1,
    },
    {
      key: 12,
      value: t('DELIVERY_FAILED_BY_DRIVER', 'Delivery Failed by driver'),
      slug: 'DELIVERY_FAILED_BY_DRIVER',
      percentage: 0,
    },
    {
      key: 13,
      value: t('PREORDER', 'PreOrder'),
      slug: 'PREORDER',
      percentage: 0,
    },
    {
      key: 14,
      value: t('ORDER_NOT_READY', 'Order not ready'),
      slug: 'ORDER_NOT_READY',
      percentage: 0,
    },
    {
      key: 15,
      value: t(
        'ORDER_PICKEDUP_COMPLETED_BY_CUSTOMER',
        'Order picked up completed by customer',
      ),
      slug: 'ORDER_PICKEDUP_COMPLETED_BY_CUSTOMER',
      percentage: 1,
    },
    {
      key: 16,
      value: t('CANCELLED_BY_CUSTOMER', 'Cancelled by customer'),
      slug: 'CANCELLED_BY_CUSTOMER',
      percentage: 0,
    },
    {
      key: 17,
      value: t(
        'ORDER_NOT_PICKEDUP_BY_CUSTOMER',
        'Order not picked up by customer',
      ),
      slug: 'ORDER_NOT_PICKEDUP_BY_CUSTOMER',
      percentage: 0,
    },
    {
      key: 18,
      value: t(
        'DRIVER_ALMOST_ARRIVED_TO_BUSINESS',
        'Driver almost arrived to business',
      ),
      slug: 'DRIVER_ALMOST_ARRIVED_TO_BUSINESS',
      percentage: 0.15,
    },
    {
      key: 19,
      value: t(
        'DRIVER_ALMOST_ARRIVED_TO_CUSTOMER',
        'Driver almost arrived to customer',
      ),
      slug: 'DRIVER_ALMOST_ARRIVED_TO_CUSTOMER',
      percentage: 0.9,
    },
    {
      key: 20,
      value: t(
        'ORDER_CUSTOMER_ALMOST_ARRIVED_BUSINESS',
        'Customer almost arrived to business',
      ),
      slug: 'ORDER_CUSTOMER_ALMOST_ARRIVED_BUSINESS',
      percentage: 0.9,
    },
    {
      key: 21,
      value: t(
        'ORDER_CUSTOMER_ARRIVED_BUSINESS',
        'Customer arrived to business',
      ),
      slug: 'ORDER_CUSTOMER_ARRIVED_BUSINESS',
      percentage: 0.95,
    },
    {
      key: 22,
      value: t('ORDER_LOOKING_FOR_DRIVER', 'Looking for driver'),
      slug: 'ORDER_LOOKING_FOR_DRIVER',
      percentage: 0.35,
    },
    {
      key: 23,
      value: t('ORDER_DRIVER_ON_WAY', 'Driver on way'),
      slug: 'ORDER_DRIVER_ON_WAY',
      percentage: 0.45,
    },
    {
      key: 24,
      value: t('ORDER_DRIVER_WAITING_FOR_ORDER', 'Driver waiting for order'),
      slug: 'ORDER_DRIVER_WAITING_FOR_ORDER',
      percentage: 0.25
    },
    {
      key: 25,
      value: t('ORDER_ACCEPTED_BY_DRIVER_COMPANY', 'Accepted by driver company'),
      slug: 'ORDER_ACCEPTED_BY_DRIVER_COMPANY',
      percentage: 0.25
    },
    {
      key: 26,
      value: t('ORDER_DRIVER_ARRIVED_CUSTOMER', 'Driver arrived to customer'),
      slug: 'ORDER_DRIVER_ARRIVED_CUSTOMER',
      percentage: 0.8
    }
  ];

  const objectStatus = orderStatus.find((o) => o.key === status);

  return objectStatus && objectStatus;
}

/**
 * function to manage review comment list
 * @param {number} param0 type of reviews to return
 * @returns object with reviews dictionary
 */
export const reviewCommentList = (type: string, t: any) => {
  // TODO: improve this function
  const reviews: any = {
    order: {
      1: {
        title: t('QUICK_COMMENT_TITLE_1', "What went wrong?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_1_0', "Not handled with care") },
          { key: 1, content: t('QUICK_COMMENT_1_1', "Poor communication") },
          { key: 2, content: t('QUICK_COMMENT_1_2', "COVID-19 issue") },
          { key: 3, content: t('QUICK_COMMENT_1_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_1_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_1_5', "Not on-time") },
        ]
      },
      2: {
        title: t('QUICK_COMMENT_TITLE_2', "What went wrong?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_2_0', "Not handled with care") },
          { key: 1, content: t('QUICK_COMMENT_2_1', "Poor communication") },
          { key: 2, content: t('QUICK_COMMENT_2_2', "COVID-19 issue") },
          { key: 3, content: t('QUICK_COMMENT_2_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_2_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_2_5', "Not on-time") },
        ]
      },
      3: {
        title: t('QUICK_COMMENT_TITLE_3', "What could have been better?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_3_0', "Not handled with care") },
          { key: 1, content: t('QUICK_COMMENT_3_1', "Poor communication") },
          { key: 2, content: t('QUICK_COMMENT_3_2', "COVID-19 issue") },
          { key: 3, content: t('QUICK_COMMENT_3_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_3_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_3_5', "Not on-time") },
        ]
      },
      4: {
        title: t('QUICK_COMMENT_TITLE_4', " Tell us more"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_4_0', "Good communication") },
          { key: 1, content: t('QUICK_COMMENT_4_1', "Followed instructions") },
          { key: 2, content: t('QUICK_COMMENT_4_2', "Friendly") },
          { key: 3, content: t('QUICK_COMMENT_4_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_4_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_4_5', "Not on-time") },
        ]
      },
      5: {
        title: t('QUICK_COMMENT_TITLE_5', "What went well?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_5_0', "Good communication") },
          { key: 1, content: t('QUICK_COMMENT_5_1', "Followed instructions") },
          { key: 2, content: t('QUICK_COMMENT_5_2', "Friendly") },
          { key: 3, content: t('QUICK_COMMENT_5_3', 'Handled with care') },
          { key: 4, content: t('QUICK_COMMENT_5_4', "Above and beyond") },
        ]
      },
    },
    customer: {
      1: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_1', "What went wrong?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_1_0', "Poor communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_1_1', "Wrong address") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_1_2', "COVID-19 issue") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_1_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_1_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_1_5', "Not on-time") },
        ]
      },
      2: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_2', "What went wrong?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_2_0', "Poor communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_2_1', "Wrong address") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_2_2', "COVID-19 issue") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_2_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_2_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_2_5', "Not on-time") },
        ]
      },
      3: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_3', "What could have been better?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_3_0', "Poor communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_3_1', "Wrong address") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_3_2', "COVID-19 issue") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_3_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_3_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_3_5', "Not on-time") },
        ]
      },
      4: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_4', " Tell us more"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_4_0', "Good communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_4_1', "Followed instructions") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_4_2', "Friendly") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_4_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_4_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_4_5', "Not on-time") },
        ]
      },
      5: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_5', "What went well?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_5_0', "Good communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_5_1', "Friendly") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_5_2', "Above and beyond") },
        ]
      },
    },
    driver: {
      1: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_1', "What went wrong?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_1_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_1_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_1_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_1_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_1_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_1_5', "Not on-time") },
        ]
      },
      2: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_2', "What went wrong?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_2_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_2_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_2_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_2_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_2_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_2_5', "Not on-time") },
        ]
      },
      3: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_3', "What could have been better?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_3_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_3_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_3_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_3_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_3_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_3_5', "Not on-time") },
        ]
      },
      4: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_4', " Tell us more"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_4_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_4_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_4_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_4_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_4_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_4_5', "Not on-time") },
        ]
      },
      5: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_5', "What went well?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_5_0', "Good communication") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_5_1', "Followed instructions") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_5_2', "Friendly") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_5_3', 'Handled with care') },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_5_4', "Above and beyond") },
        ]
      },
    },
    product: {
      like: [
        { key: 0, content: t('QUICK_COMMENT_LIKE_0', "Tasty") },
        { key: 1, content: t('QUICK_COMMENT_LIKE_1', "Good price") },
        { key: 2, content: t('QUICK_COMMENT_LIKE_2', "Good portion size") },
        { key: 3, content: t('QUICK_COMMENT_LIKE_3', "Packed well") },
      ],
      dislike: [
        { key: 0, content: t('QUICK_COMMENT_DISLIKE_0', "Not tasty") },
        { key: 1, content: t('QUICK_COMMENT_DISLIKE_1', "High price") },
        { key: 2, content: t('QUICK_COMMENT_DISLIKE_2', "Bad portion size") },
        { key: 3, content: t('QUICK_COMMENT_DISLIKE_3', "Not packed well") },
      ]
    }
  }

  return reviews[type]
}
