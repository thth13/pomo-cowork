declare module 'react-kofi' {
  import type { ComponentType } from 'react'

  export interface KoFiButtonProps {
    color?: string
    id?: string
    label?: string
    size?: string
    radius?: string
  }

  export const KoFiButton: ComponentType<KoFiButtonProps>
  export const KoFiPanel: ComponentType<{ id?: string }>
}
