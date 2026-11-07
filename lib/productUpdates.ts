type Localized = { en: string; es: string }
export const PRODUCT_UPDATE_NOTIFICATION_TITLE: Localized = {
  en: 'New Pomo Cowork update',
  es: 'Nueva actualización de Pomo Cowork',
}

export interface ProductUpdate {
  id: string
  title: Localized
  summary: Localized
  sections: {
    heading?: Localized
    title: Localized
    body: Localized
    image?: string
    headingImage?: { src: string; alt: Localized; width: number; height: number }
    imageAlt?: Localized
    illustrations?: { src: Localized; alt: Localized; caption: Localized; width: number; height: number }[]
    actions?: { href: string; label: Localized; primary?: boolean }[]
    points: Localized[]
  }[]
}

// Keep published IDs and their content stable: notifications link to this catalog.
export const PRODUCT_UPDATES: ProductUpdate[] = [{
  id: 'workspace-appearance-2026-11',
  title: { en: 'Pomo blogs & a workspace that feels yours', es: 'Pomo blogs y un espacio a tu estilo' },
  summary: {
    en: 'Share your projects and progress with Pomo blogs. Plus, nine site themes and clearer timer digits.',
    es: 'Comparte tus proyectos y avances con Pomo blogs. Además, nueve temas y cifras más legibles.',
  },
  sections: [{
    heading: { en: 'Pomo blogs', es: 'Pomo blogs' },
    title: { en: 'Share your progress with Pomo blogs', es: 'Comparte tus avances con Pomo blogs' },
    headingImage: { src: '/updates/pomo-blogs-logo.svg', alt: { en: 'Pomo blogs', es: 'Pomo blogs' }, width: 1200, height: 300 },
    body: {
      en: 'Give your projects a public home. Publish updates about what you are working on, share milestones and discover what others are building.',
      es: 'Dale a tus proyectos un espacio público. Publica novedades sobre tu trabajo, comparte hitos y descubre lo que están creando los demás.',
    },
    actions: [{
      href: '/projects/public/new',
      label: { en: 'Create a blog', es: 'Crear un blog' },
      primary: true,
    }, {
      href: '/projects/public',
      label: { en: 'Explore Pomo blogs', es: 'Explorar Pomo blogs' },
    }],
    illustrations: [{
      src: { en: '/updates/pomo-blogs-catalog-en.png', es: '/updates/pomo-blogs-catalog-es.png' },
      width: 1200,
      height: 440,
      alt: { en: 'Pomo blogs project directory with public projects, task progress and focus statistics.', es: 'Directorio de Pomo blogs con proyectos públicos, progreso de tareas y estadísticas de concentración.' },
      caption: { en: 'Explore public projects and follow what others are building.', es: 'Explora proyectos públicos y sigue lo que están creando los demás.' },
    }, {
      src: { en: '/updates/pomo-blogs-project-en.png', es: '/updates/pomo-blogs-project-es.png' },
      width: 1200,
      height: 800,
      alt: { en: 'Pomo Cowork project page showing project navigation, focus statistics and blog updates.', es: 'Página del proyecto Pomo Cowork con navegación, estadísticas de concentración y publicaciones del blog.' },
      caption: { en: 'Your project, its progress and updates — in one public page.', es: 'Tu proyecto, sus avances y publicaciones, en una página pública.' },
    }],
    points: [{
      en: 'Explore public projects in Pomo blogs and share your own with Share project.',
      es: 'Explora los proyectos públicos en Pomo blogs y publica el tuyo con Compartir proyecto.',
    }, {
      en: 'Follow people and projects to keep up with their updates in your feed.',
      es: 'Sigue a personas y proyectos para ver sus novedades en tu feed.',
    }, {
      en: 'Like posts and join the conversation in the comments.',
      es: 'Dale me gusta a las publicaciones y participa en los comentarios.',
    }],
  }, {
    heading: { en: 'Site themes', es: 'Temas del sitio' },
    title: { en: 'Nine ways to make it yours', es: 'Nueve formas de hacerlo tuyo' },
    body: {
      en: 'Choose the material and mood of your workspace, from soft glass to warm paper and a glowing neon frame.',
      es: 'Elige el material y el ambiente de tu espacio: desde cristal suave hasta papel cálido o un marco de neón.',
    },
    image: '/updates/workspace-themes.svg',
    imageAlt: { en: 'Nine illustrated window styles, showing their surfaces, corners and borders.', es: 'Nueve estilos de ventana que muestran sus superficies, esquinas y bordes.' },
    points: [{ en: 'Free: Glass, Matte and Pixel.', es: 'Gratis: Cristal, Mate y Píxel.' }, {
      en: 'Pro: Clear glass, No background, Outline, Paper, Terminal and Neon.',
      es: 'Pro: Cristal ligero, Sin fondo, Contorno, Papel, Terminal y Neón.',
    }, {
      en: 'Clear glass lets much more of your scenery show through. No background removes the fill, blur and shadows.',
      es: 'Cristal ligero deja ver mucho más del fondo. Sin fondo elimina el relleno, el desenfoque y las sombras.',
    }],
  }, {
    heading: { en: 'Timer fonts', es: 'Tipografías del temporizador' },
    title: { en: 'Timer fonts that feel the right size', es: 'Cifras con el tamaño adecuado' },
    body: {
      en: 'Each font now has its own visual scale, so changing fonts no longer makes the timer unexpectedly tiny.',
      es: 'Cada tipografía tiene su propia escala visual para que cambiarla no reduzca demasiado las cifras.',
    },
    image: '/updates/timer-type.svg',
    imageAlt: { en: 'Timer numerals illustrated in three different type styles.', es: 'Cifras del temporizador ilustradas en tres estilos tipográficos.' },
    points: [{ en: 'The main timer, mini timer and font previews share the improvements.', es: 'Las mejoras se aplican al temporizador principal, al mini temporizador y a las vistas previas.' }, {
      en: 'Long values fit the available width. Controls stay in place when you change the font.',
      es: 'Los valores largos se ajustan al ancho disponible. Los controles no se desplazan al cambiar la tipografía.',
    }, { en: 'Pixel previews are centered, and Terminal digits are wider and easier to read.', es: 'La vista previa de Píxel está centrada y las cifras de Terminal son más anchas y legibles.' }],
  }],
}]

export const getProductUpdate = (id: string | null | undefined) => PRODUCT_UPDATES.find(update => update.id === id)

export const productUpdateCopy = {
  en: { label: 'What’s new', open: 'See what’s new', done: 'Got it', unavailable: 'This update is not available in this version of the site. Reload the page and try again.', readError: 'The update opened, but we could not mark the notification as read.', retry: 'Try again', saving: 'Updating notification…' },
  es: { label: 'Novedades', open: 'Ver novedades', done: 'Entendido', unavailable: 'Esta actualización no está disponible en esta versión del sitio. Recarga la página e inténtalo de nuevo.', readError: 'La actualización se abrió, pero no pudimos marcar la notificación como leída.', retry: 'Reintentar', saving: 'Actualizando notificación…' },
} as const

export const OPEN_PRODUCT_UPDATE = 'open-product-update'
export interface OpenProductUpdateDetail { updateId: string; notificationId?: string }
export function openProductUpdate(detail: OpenProductUpdateDetail) {
  window.dispatchEvent(new CustomEvent<OpenProductUpdateDetail>(OPEN_PRODUCT_UPDATE, { detail }))
}
