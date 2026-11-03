// Keep stored status values compatible with existing project records.
export function projectStatusLabels(t: (en: string, es: string) => string) {
  return {
    PLANNING: t('Not started', 'Sin empezar'),
    BUILDING: t('In progress', 'En curso'),
    PAUSED: t('Paused', 'En pausa'),
    COMPLETED: t('Completed', 'Completado'),
    ARCHIVED: t('Archived', 'Archivado')
  }
}
