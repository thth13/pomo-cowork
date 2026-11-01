import type { LanguageCode } from '@/lib/i18n/translations'

export const beepIntroduction: Record<LanguageCode, { title: string; body: string }> = {
  en: {
    title: 'Hi! I’m Beep 👋',
    body: 'I’m your personal focus assistant. Ask me questions, explore the workspace, or just say hi!',
  },
  es: {
    title: '¡Hola! Soy Beep 👋',
    body: 'Soy tu asistente personal de concentración. ¡Hazme preguntas, explora el espacio de trabajo o simplemente salúdame!',
  },
}

export function firstBeepGreeting(language: LanguageCode): string {
  const { title, body } = beepIntroduction[language]
  return `${title} ${body}`
}
