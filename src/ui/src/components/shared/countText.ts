/**
 * A count as a badge writes it (H19): the number, capped at `99+`; when more are still to load the number is a lower
 * bound and says so with the same `+`. One rule for the count badges that remain (the Messages tab, the Unread chip, a
 * conversation's count, the call and message buttons): the app shows no number of orders.
 */
export const COUNT_CAP = 99

export const countText = (count: number, more = false): string =>
  count > COUNT_CAP ? `${COUNT_CAP}+` : more ? `${count}+` : String(count)
