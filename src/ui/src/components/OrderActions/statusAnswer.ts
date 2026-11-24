/**
 * What the sheets know of a group of orders (same `cart_group_id`): the list hands them the group's orders and the
 * sheets speak for the group, not for its first order. Ported from the driver app's `groupOrders`.
 */

/** A group has more than one order: a "group" of one (the others are in another tab) is that one order. */
export const isOrderGroup = (orders?: any[] | null): boolean => (orders?.length ?? 0) > 1;

/**
 * Every order of the group is for the same customer (a single phone to call makes sense, and the same person gets
 * the notification). The customer is known by its id; an order that has none is not known to be the same one.
 */
export const hasSingleCustomer = (orders?: any[] | null): boolean => {
  if (!orders?.length) return true;
  const ids = orders.map((order) => order?.customer_id ?? order?.customer?.id);
  return ids[0] != null && ids.every((id) => id === ids[0]);
};

/** An order that did not change, and what the API said about it. */
export interface StatusFailure {
  id: number;
  /** The API's error as it came (a message, a list of them, `{ message }`): worded by `apiErrorText`, never shown raw. */
  message?: any;
  errorCodes?: string[] | null;
  retryAfter?: number | null;
}

/** What a status change of a group did: every order changed, or the ones that did not. */
export interface GroupStatusOutcome {
  succeeded: boolean;
  failures: StatusFailure[];
}

/**
 * Reads what a handler answered, whichever handler it is: the list's own (`handleChangeOrderStatus`: one answer per order,
 * in the order of the ids, `null` for an order that failed, the answers with their `error` when asked `withDetails`, or the
 * text of an exception), the logistic one that saves the delivery time (one answer per order, `null` for a failure, `[]`
 * when it had nothing to send). An order changed when its answer is there and carries no `error`. An answer that cannot be
 * matched to the ids (a text, nothing, another count) says nothing of which orders changed: none is taken as changed, so
 * a retry sends them all again.
 */
export const readStatusAnswer = (answer: any, ids: number[] = []): GroupStatusOutcome => {
  const list: any[] = Array.isArray(answer) ? answer : []
  // A text among the answers is an exception's message (the list's handler returns it for a request that threw).
  const failed = (item: any) => item == null || item === false || typeof item === 'string' || (typeof item === 'object' && !!item.error)
  const reasonOf = (item: any) => (item && typeof item === 'object' ? item.result : typeof item === 'string' ? item : undefined)
  const matched = Array.isArray(answer) && list.length === ids.length
  const failures: StatusFailure[] = matched
    ? ids.flatMap((id, index) => failed(list[index])
      ? [{ id, message: reasonOf(list[index]), errorCodes: list[index]?.errorCodes ?? null, retryAfter: list[index]?.retryAfter ?? null }]
      : [])
    : ids.map((id) => ({ id, message: typeof answer === 'string' ? answer : reasonOf(list.find(failed)) }))
  return { succeeded: failures.length === 0, failures }
}

/**
 * What a status change of the group asks of the list's own `handleChangeOrderStatus` (the controller's, which takes the ids
 * of the orders): one request for the group. It says which orders
 * did not change (`readStatusAnswer`), so the screen that asked closes on success and stays, saying why, on a failure. A
 * request that throws is a failure of every order, not an exception for the screen.
 */
export const updateGroupStatus = async ({
  ids,
  handleChangeOrderStatus,
  status,
  body,
}: {
  ids?: number[];
  handleChangeOrderStatus?: (...args: any[]) => any;
  status: any;
  body: any;
}): Promise<GroupStatusOutcome | undefined> => {
  if (!handleChangeOrderStatus) return undefined
  const sent = ids ?? []
  try {
    // The details of each answer carry the API's message, which a plain answer (`null`) does not.
    return readStatusAnswer(await handleChangeOrderStatus(status, sent, body, { withDetails: true }), sent)
  } catch (error: any) {
    return { succeeded: false, failures: sent.map((id) => ({ id, message: error?.message })) }
  }
}
