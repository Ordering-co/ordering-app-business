import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { countText } from '../ui/src/components/shared/countText'

/**
 * A count that a list knows and the tab bar shows: the list reports it while it is mounted, the bar (which lives
 * outside the screen) reads it. The shell's counter (`UnreadMessagesContext`) is made with it:
 *
 * - until the list has loaded once there is nothing to show (`null`): the tab draws no number it cannot know;
 * - `more` says the list has pages it has not loaded, so `total` is a lower bound and is written with a "+";
 * - without a provider (a component on its own, a test) a report goes nowhere and nothing is known.
 */
export type ReportedCount = { total: number, more: boolean }

type Report = (count: ReportedCount | null) => void

export const createReportedCount = () => {
  const ValueContext = createContext<ReportedCount | null>(null)
  const ReportContext = createContext<Report>(() => {})

  const Provider = ({ children }: { children: React.ReactNode }) => {
    const [count, setCount] = useState<ReportedCount | null>(null)
    const report = useCallback<Report>((next) => {
      setCount((previous) => (previous?.total === next?.total && previous?.more === next?.more ? previous : next))
    }, [])
    return (
      <ReportContext.Provider value={report}>
        <ValueContext.Provider value={count}>{children}</ValueContext.Provider>
      </ReportContext.Provider>
    )
  }

  /** The count the list knows of; `null` while it knows nothing. */
  const useValue = (): ReportedCount | null => useContext(ValueContext)

  /** Reports the list's count while the component is mounted and takes it back when it leaves. */
  const useReport = (count: ReportedCount | null) => {
    const report = useContext(ReportContext)
    const total = count?.total
    const more = count?.more
    useEffect(() => {
      report(total === undefined ? null : { total, more: !!more })
    }, [report, total, more])
    useEffect(() => () => report(null), [report])
  }

  return { Provider, useValue, useReport }
}

/** The number a badge writes: "3", "3+" when the list has more pages than it has loaded, "99+" over 99 (`countText`). */
export const countLabel = (count: ReportedCount): string => countText(count.total, count.more)
