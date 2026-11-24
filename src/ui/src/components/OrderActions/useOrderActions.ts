import { closeRequest, openRequest } from './store'
import type {
  AcceptOptions,
  AssignDriverOptions,
  ForceStatusOptions,
  MapOptions,
  MoreHandlers,
  PrepTimeOptions,
  ReviewOptions,
  StatusRequestOptions
} from './types'

/**
 * What a screen asks of the order's action sheets, the map and the review. The one object is the same for every screen
 * and never changes between renders (it is not state: the open request lives in the store the host reads).
 */
export interface OrderActions {
  openAccept: (order: any, opts?: AcceptOptions) => void
  openReject: (order: any, opts?: StatusRequestOptions) => void
  openPrepTime: (order: any, opts?: PrepTimeOptions) => void
  openAssignDriver: (order: any, opts?: AssignDriverOptions) => void
  openMore: (order: any, handlers?: MoreHandlers) => void
  openForceStatus: (order: any, opts: ForceStatusOptions) => void
  openMap: (order: any, opts?: MapOptions) => void
  openReview: (order: any, opts?: ReviewOptions) => void
  close: () => void
}

export const orderActions: OrderActions = {
  openAccept: (order, opts) => openRequest('accept', order, opts),
  openReject: (order, opts) => openRequest('reject', order, opts),
  openPrepTime: (order, opts) => openRequest('prepTime', order, opts),
  openAssignDriver: (order, opts) => openRequest('assignDriver', order, opts),
  openMore: (order, handlers) => openRequest('more', order, handlers),
  openForceStatus: (order, opts) => openRequest('forceStatus', order, opts),
  openMap: (order, opts) => openRequest('map', order, opts),
  openReview: (order, opts) => openRequest('review', order, opts),
  close: closeRequest
}

export const useOrderActions = (): OrderActions => orderActions
