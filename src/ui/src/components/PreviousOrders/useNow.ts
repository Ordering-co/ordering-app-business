import { useRef, useSyncExternalStore } from 'react'

/**
 * One clock for every card of the screen: a single one-second interval while any card is subscribed, so the list never
 * runs a timer per card nor re-renders as a whole: each card that counts re-renders alone.
 */
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
let tick = Date.now()

const subscribe = (listener: () => void) => {
  if (!listeners.size) tick = Date.now()
  listeners.add(listener)
  if (!timer) {
    timer = setInterval(() => {
      tick = Date.now()
      listeners.forEach((notify) => notify())
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const idle = () => () => {}

/** The time now (ms), refreshed every second while `active`; a card with nothing to count passes `false` and reads it once. */
export const useNow = (active: boolean): number => {
  const once = useRef(Date.now())
  const live = useSyncExternalStore(active ? subscribe : idle, () => (active ? tick : once.current))
  return active ? live : once.current
}
