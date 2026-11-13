export const firstFocusCopy = {
  en: {
    title: 'Ready to focus?',
    duration: 'Choose your focus time',
    custom: 'Custom',
    minutes: (value: number) => `${value} min`,
    start: (value: number) => `Focus for ${value} min`,
  },
  es: {
    title: '¿Empezamos a concentrarnos?',
    duration: 'Elige tu tiempo de concentración',
    custom: 'Personalizado',
    minutes: (value: number) => `${value} min`,
    start: (value: number) => `Concentrarme ${value} min`,
  },
} as const
