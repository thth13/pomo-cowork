import type { LanguageCode } from '@/lib/i18n/translations'

export const beepIntroduction: Record<LanguageCode, { title: string; body: string }> = {
  en: {
    title: 'Hi! I’m Beep 👋',
    body: 'I live here now. You can chat with me and ask me questions!',
  },
  es: {
    title: '¡Hola! Soy Beep 👋',
    body: 'Ahora vivo aquí. ¡Puedes hablar conmigo y hacerme preguntas!',
  },
}

export function firstBeepGreeting(language: LanguageCode): string {
  const { title, body } = beepIntroduction[language]
  return `${title} ${body}`
}
