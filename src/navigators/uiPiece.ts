import * as ui from '@ui'

/**
 * A piece another area exports from `@ui`, looked up by name when it is drawn: `null` while that area has not
 * shipped it, so the shell mounts it the day it exists and draws nothing before. (A static import of a name the
 * barrel does not export would not compile; the shell cannot wait for every area.)
 */
export const uiPiece = (name: string): React.ComponentType<any> | null => {
  const piece = (ui as any)[name]
  return piece && (typeof piece === 'function' || typeof piece === 'object') ? piece : null
}
