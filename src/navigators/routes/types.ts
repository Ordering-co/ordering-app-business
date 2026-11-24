import type { ComponentType } from 'react'

/** A stack screen an area contributes: `src/navigators/routes/<area>.tsx` exports a list of them. */
export type AppScreen = {
  name: string
  component: ComponentType<any>
  options?: object
}
