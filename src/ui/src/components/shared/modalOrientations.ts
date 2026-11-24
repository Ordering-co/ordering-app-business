import { useLayout } from '@/theme/platform'

/** The orientations a React Native `Modal` may show (iOS; Android ignores the prop). */
export type ModalOrientation = 'portrait' | 'portrait-upside-down' | 'landscape' | 'landscape-left' | 'landscape-right'

/**
 * iOS shows a `Modal` in the orientations it is told, portrait only by default, whatever the screen under it does: a tablet turned
 * upside down drew the full-screen pages (the review) upside down and a turned one closed them. A modal of the app allows what
 * the screen under it allows: every orientation on a tablet (it rotates freely) and portrait on a phone (it is locked to it).
 */
const TABLET: ModalOrientation[] = ['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']
const PHONE: ModalOrientation[] = ['portrait']

export const useModalOrientations = (): ModalOrientation[] => (useLayout().tablet ? TABLET : PHONE)
