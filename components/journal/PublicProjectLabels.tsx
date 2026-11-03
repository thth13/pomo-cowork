'use client'
import { useJournalText } from '@/lib/journal/client'
import { projectStatusLabels } from '@/lib/journal/projectStatus'
import type { Project } from '@/lib/journal/types'
export function ProjectStatusLabel({ status }: { status: Project['status'] }) {
  const t = useJournalText()
  return <>{projectStatusLabels(t)[status]}</>
}
export function ProjectEmpty() {
  const t = useJournalText()
  return <div className="journal-card journal-empty">{t('No updates yet. Follow this project for its next chapter.', 'Aún no hay actualizaciones. Sigue este proyecto para descubrir su próximo capítulo.')}</div>
}
export function ProjectPaginationLabel({ previous = false }: { previous?: boolean }) {
  const t = useJournalText()
  return <>{previous ? t('Previous', 'Anterior') : t('Next', 'Siguiente')}</>
}
