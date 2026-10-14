export const PROJECT_COLORS = [
  { value: 'red', en: 'Red', es: 'Rojo' },
  { value: 'orange', en: 'Orange', es: 'Naranja' },
  { value: 'gold', en: 'Gold', es: 'Dorado' },
  { value: 'green', en: 'Green', es: 'Verde' },
  { value: 'teal', en: 'Teal', es: 'Verde azulado' },
  { value: 'blue', en: 'Blue', es: 'Azul' },
  { value: 'purple', en: 'Purple', es: 'Morado' },
  { value: 'pink', en: 'Pink', es: 'Rosa' },
  { value: 'coral', en: 'Coral', es: 'Coral' },
  { value: 'amber', en: 'Amber', es: 'Ámbar' },
  { value: 'olive', en: 'Olive', es: 'Oliva' },
  { value: 'lime', en: 'Lime', es: 'Lima' },
  { value: 'emerald', en: 'Emerald', es: 'Esmeralda' },
  { value: 'cyan', en: 'Cyan', es: 'Cian' },
  { value: 'sky', en: 'Sky blue', es: 'Azul cielo' },
  { value: 'indigo', en: 'Indigo', es: 'Índigo' },
  { value: 'magenta', en: 'Magenta', es: 'Magenta' },
  { value: 'brown', en: 'Brown', es: 'Marrón' },
  { value: 'slate', en: 'Slate', es: 'Gris pizarra' },
] as const

export type ProjectColor = typeof PROJECT_COLORS[number]['value']
export function isProjectColor(value: unknown): value is ProjectColor {
  return PROJECT_COLORS.some(color => color.value === value)
}
export function projectColorStyle(value?: string | null) {
  return isProjectColor(value) ? { color: `var(--project-color-${value})` } : undefined
}
