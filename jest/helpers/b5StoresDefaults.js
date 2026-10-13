/**
 * Controller defaults for B5 stores & map UI wired exports.
 */
/* eslint-env jest */

const sampleBusiness = {
  id: 1,
  name: 'Store A',
  slug: 'store-a',
  address: '123 Main St',
  zipcode: '10001',
  logo: 'https://example.com/logo.png',
  enabled: true,
  open: true,
  location: { lat: 40.7128, lng: -74.006 }
}

const sampleCategory = {
  id: 10,
  name: 'Burgers',
  enabled: true,
  parent_category_id: null,
  subcategories: []
}

const sampleCategoryWithSubs = {
  id: 11,
  name: 'Drinks',
  enabled: true,
  parent_category_id: null,
  subcategories: [
    { id: 12, name: 'Soda', enabled: true, parent_category_id: 11, subcategories: [] }
  ]
}

const sampleProduct = {
  id: 100,
  name: 'Cheeseburger',
  enabled: true,
  category_id: 10,
  images: 'https://example.com/burger.png'
}

const storesListDefaults = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true)
  },
  businessesList: {
    businesses: [sampleBusiness],
    loading: false,
    error: null
  },
  searchValue: '',
  getBusinesses: jest.fn(),
  handleChangeBusinessType: jest.fn(),
  handleBusinessClick: jest.fn(),
  paginationProps: { currentPage: 1, totalPages: 2, pageSize: 10, total: 15 },
  handleChangeSearch: jest.fn()
}

const businessControllerDefaults = {
  businessState: {
    loading: false,
    business: sampleBusiness,
    error: null
  },
  updateBusiness: jest.fn(),
  isUpdateStore: false,
  setIsUpdateStore: jest.fn(),
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true)
  },
  handleCustomClick: jest.fn(),
  orderType: 1,
  isBusinessOpen: true
}

const businessProductListDefaults = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true)
  },
  businessState: {
    loading: false,
    error: null,
    business: { id: 1, name: 'Store A', slug: 'store-a' }
  },
  productsList: {
    loading: false,
    products: [sampleProduct],
    error: null,
    pagination: { currentPage: 1, totalPages: 2 }
  },
  updateStoreCategory: jest.fn(),
  updateStoreProduct: jest.fn(),
  productSearch: '',
  categorySearch: '',
  handleChangeCategory: jest.fn(),
  handleChangeProductSearch: jest.fn(),
  handleChangeCategorySearch: jest.fn(),
  getCategoryProducts: jest.fn(),
  categories: [sampleCategory, sampleCategoryWithSubs],
  categoriesState: { loading: false }
}

const sampleMapOrder = {
  id: 101,
  business_id: 1,
  customer_id: 2,
  business: {
    id: 1,
    name: 'Store A',
    logo: 'https://example.com/logo.png',
    address: '123 Main St',
    zipcode: '10001',
    location: { lat: 40.7128, lng: -74.006 },
    city: { name: 'NYC' }
  },
  customer: {
    id: 2,
    name: 'Jane',
    lastname: 'Doe',
    photo: null,
    address: '456 Customer Ave',
    zipcode: '10002',
    internal_number: '2B',
    location: { lat: 40.72, lng: -74.01 },
    city: { address_notes: 'Ring bell' }
  }
}

const mapViewDefaults = {
  isLoadingBusinessMarkers: false,
  markerGroups: {
    1: [sampleMapOrder]
  },
  customerMarkerGroups: {
    2: [sampleMapOrder]
  },
  alertState: { open: false, content: [] },
  setAlertState: jest.fn(),
  setDriverLocation: jest.fn(),
  onNavigationRedirect: jest.fn(),
  getBusinessLocations: jest.fn()
}

const googleMapDefaults = {
  location: { lat: 40.7128, lng: -74.006, icon: '', title: 'Pin' },
  locations: null,
  readOnly: true,
  markerTitle: 'Your Location',
  handleChangeAddressMap: jest.fn(),
  handleOpenMapView: jest.fn(),
  handleViewActionOrder: jest.fn(),
  setSaveLocation: jest.fn(),
  handleToggleMap: jest.fn(),
  saveLocation: false,
  showAcceptOrReject: false,
  maxLimitLocation: undefined,
  isSetInputs: false,
  driverLocation: null,
  navigation: { navigate: jest.fn(), goBack: jest.fn() },
  order: null,
  logisticOrderStatus: [],
  getOrderStatus: jest.fn((status) => ({ value: `Status ${status}` })),
  colors: { 0: '#000' }
}

const googleMapWithOrderDefaults = {
  ...googleMapDefaults,
  order: {
    id: 101,
    external_id: null,
    status: 0,
    isLogistic: false,
    order_group_id: null,
    business: { name: 'Store A' },
    customer: { address: '456 Customer Ave' }
  },
  locations: [
    {
      lat: 40.7128,
      lng: -74.006,
      level: 2,
      title: 'Business',
      icon: 'https://example.com/logo.png',
      business_id: 1,
      address: { addressName: '123 Main St', zipcode: '10001' }
    },
    {
      lat: 40.72,
      lng: -74.01,
      level: 3,
      title: 'Customer',
      icon: null,
      address: { addressName: '456 Customer Ave', zipcode: '10002' }
    }
  ]
}

module.exports = {
  sampleBusiness,
  sampleCategory,
  sampleCategoryWithSubs,
  sampleProduct,
  sampleMapOrder,
  storesListDefaults,
  businessControllerDefaults,
  businessProductListDefaults,
  mapViewDefaults,
  googleMapDefaults,
  googleMapWithOrderDefaults
}
