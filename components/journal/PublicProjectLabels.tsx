'use client'
import { useJournalText } from '@/lib/journal/client'
export function ProjectEmpty() {
  const t = useJournalText()
  return <div className="journal-card journal-empty">{t('No updates yet. Follow this project for its next chapter.', 'Aún no hay actualizaciones. Sigue este proyecto para descubrir su próximo capítulo.')}</div>
}
export function ProjectPaginationLabel({ previous = false }: { previous?: boolean }) {
  const t = useJournalText()
  return <>{previous ? t('Previous', 'Anterior') : t('Next', 'Siguiente')}</>
}
