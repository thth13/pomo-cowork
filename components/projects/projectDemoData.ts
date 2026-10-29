export type Text = { en: string; es: string }

export type DemoPhase = {
  id: string
  title: Text
  description: Text
}

export type DemoTask = {
  id: string
  phaseId: string
  title: Text
  details: Text
  checklist: Text[]
  sessions: number
  completedSessions: number
  done: boolean
  date: string
  priority: 'high' | 'medium' | 'low'
}

export type DemoPost = {
  id: string
  title: Text
  body: Text
  date: string
  minutes: number
  likes: number
  tag: Text
}

export type DemoTemplate = {
  id: string
  name: Text
  description: Text
  goal: Text
  icon: 'code' | 'book' | 'graduation' | 'calendar'
}

export const DEMO_TODAY = '2026-10-28'
export const DEMO_START = '2026-10-12'
export const DEMO_DEADLINE = '2026-11-13'

export const demoProject = {
  title: { en: 'Build my portfolio website', es: 'Crear mi sitio web de portafolio' },
  description: {
    en: 'A small home for my work, the thinking behind it, and what I want to build next. Three thoughtful case studies, a little personality, and an easy way to get in touch.',
    es: 'Un espacio para mi trabajo, las ideas que hay detrás y lo que quiero crear después. Tres casos de estudio bien contados, un toque personal y una forma sencilla de contactar.',
  },
  outcome: {
    en: 'Publish a responsive portfolio with three case studies and a working contact form by November 13.',
    es: 'Publicar un portafolio adaptable con tres casos de estudio y un formulario de contacto funcional antes del 13 de noviembre.',
  },
}

export const demoPhases: DemoPhase[] = [
  {
    id: 'define',
    title: { en: 'Find the story', es: 'Encontrar la historia' },
    description: { en: 'Choose the work and decide what this portfolio should say.', es: 'Elegir los proyectos y definir qué debe contar este portafolio.' },
  },
  {
    id: 'design',
    title: { en: 'Make it feel like me', es: 'Darle mi personalidad' },
    description: { en: 'Turn the content into clear, considered pages.', es: 'Convertir el contenido en páginas claras y bien pensadas.' },
  },
  {
    id: 'build',
    title: { en: 'Bring it to life', es: 'Darle vida' },
    description: { en: 'Build the pages and connect the small details.', es: 'Construir las páginas y conectar los pequeños detalles.' },
  },
  {
    id: 'launch',
    title: { en: 'Put it out into the world', es: 'Compartirlo con el mundo' },
    description: { en: 'Test the experience, publish, and ask for feedback.', es: 'Probar la experiencia, publicar y pedir opiniones.' },
  },
]

export const demoTasks: DemoTask[] = [
  {
    id: 'audience', phaseId: 'define',
    title: { en: 'Define my audience and message', es: 'Definir mi público y mensaje' },
    details: { en: 'Decide who the portfolio is for and what they should remember after one minute.', es: 'Decidir para quién es el portafolio y qué debería recordar esa persona después de un minuto.' },
    checklist: [
      { en: 'Write three things a future collaborator should know about me.', es: 'Escribir tres cosas que una futura persona colaboradora debería saber de mí.' },
      { en: 'Compare three portfolios and note what makes their introductions clear.', es: 'Comparar tres portafolios y anotar qué hace claras sus presentaciones.' },
      { en: 'Draft a two-sentence introduction and one contact invitation.', es: 'Redactar una presentación de dos frases y una invitación a contactar.' },
    ],
    sessions: 4, completedSessions: 4, done: true, date: '2026-10-13', priority: 'high',
  },
  {
    id: 'case-studies', phaseId: 'define',
    title: { en: 'Choose three projects to feature', es: 'Elegir tres proyectos destacados' },
    details: { en: 'Select projects that show different strengths and gather the evidence behind them.', es: 'Seleccionar proyectos que muestren distintas fortalezas y reunir sus resultados.' },
    checklist: [
      { en: 'List six past projects with my role and one concrete result for each.', es: 'Enumerar seis proyectos anteriores con mi función y un resultado concreto de cada uno.' },
      { en: 'Pick the strongest three and collect their screenshots in one folder.', es: 'Elegir los tres mejores y reunir sus capturas en una carpeta.' },
      { en: 'Outline the problem, approach, and result for the first case study.', es: 'Esbozar el problema, el enfoque y el resultado del primer caso de estudio.' },
    ],
    sessions: 4, completedSessions: 4, done: true, date: '2026-10-15', priority: 'high',
  },
  {
    id: 'content-map', phaseId: 'define',
    title: { en: 'Map the pages and write the first draft', es: 'Organizar las páginas y escribir el borrador' },
    details: { en: 'Give every page a clear purpose before opening a design file.', es: 'Dar un propósito claro a cada página antes de abrir el archivo de diseño.' },
    checklist: [
      { en: 'Draw the route from the homepage to a case study and then to contact.', es: 'Dibujar el recorrido desde el inicio hasta un caso de estudio y el contacto.' },
      { en: 'Write the homepage headings using the audience notes.', es: 'Escribir los títulos de la página de inicio usando las notas sobre el público.' },
      { en: 'Draft the about section and remove any claims without examples.', es: 'Redactar la sección sobre mí y eliminar afirmaciones sin ejemplos.' },
    ],
    sessions: 4, completedSessions: 4, done: true, date: '2026-10-19', priority: 'medium',
  },
  {
    id: 'visual-direction', phaseId: 'design',
    title: { en: 'Set the visual direction', es: 'Definir la dirección visual' },
    details: { en: 'Choose type, color, and spacing that support the work without competing with it.', es: 'Elegir tipografía, color y espaciado que acompañen al trabajo sin competir con él.' },
    checklist: [
      { en: 'Collect five references and write what I like about each.', es: 'Reunir cinco referencias y escribir qué me gusta de cada una.' },
      { en: 'Try two type pairings using a real case-study title and paragraph.', es: 'Probar dos combinaciones tipográficas con un título y un párrafo reales.' },
      { en: 'Make a small style sheet with text, colors, buttons, and spacing.', es: 'Crear una pequeña guía con textos, colores, botones y espaciado.' },
    ],
    sessions: 6, completedSessions: 6, done: true, date: '2026-10-23', priority: 'medium',
  },
  {
    id: 'homepage', phaseId: 'design',
    title: { en: 'Design the homepage', es: 'Diseñar la página de inicio' },
    details: { en: 'The desktop layout is taking shape. Next, make the project cards work on a small screen.', es: 'La versión de escritorio ya toma forma. Ahora hay que adaptar las tarjetas de proyectos a una pantalla pequeña.' },
    checklist: [
      { en: 'Sketch a 375 px layout with the introduction and first project visible.', es: 'Esbozar un diseño de 375 px que muestre la presentación y el primer proyecto.' },
      { en: 'Adapt all three project cards and check the longest title.', es: 'Adaptar las tres tarjetas de proyectos y comprobar el título más largo.' },
      { en: 'Check text contrast and tap targets, then note the final adjustments.', es: 'Comprobar el contraste y las áreas táctiles, y anotar los últimos ajustes.' },
    ],
    sessions: 6, completedSessions: 4, done: false, date: '2026-10-28', priority: 'high',
  },
  {
    id: 'case-study-layout', phaseId: 'design',
    title: { en: 'Design the case-study template', es: 'Diseñar la plantilla de casos de estudio' },
    details: { en: 'Create one reusable reading layout for the story, images, and outcomes of each project.', es: 'Crear un diseño de lectura reutilizable para la historia, las imágenes y los resultados de cada proyecto.' },
    checklist: [
      { en: 'Lay out the first case study using its actual draft and screenshots.', es: 'Maquetar el primer caso de estudio con su borrador y sus capturas reales.' },
      { en: 'Design the image captions and a concise results section.', es: 'Diseñar los pies de imagen y una sección breve de resultados.' },
      { en: 'Adapt the template to mobile and check the reading order.', es: 'Adaptar la plantilla al móvil y comprobar el orden de lectura.' },
    ],
    sessions: 6, completedSessions: 2, done: false, date: '2026-10-29', priority: 'high',
  },
  {
    id: 'build-foundation', phaseId: 'build',
    title: { en: 'Build the page structure', es: 'Construir la estructura de las páginas' },
    details: { en: 'Set up the shared navigation, typography, and page shell before adding content.', es: 'Preparar la navegación, la tipografía y la estructura compartida antes de añadir contenido.' },
    checklist: [
      { en: 'Create the homepage, about page, and case-study routes.', es: 'Crear las rutas del inicio, la página sobre mí y los casos de estudio.' },
      { en: 'Build the header and footer with keyboard-accessible navigation.', es: 'Construir la cabecera y el pie con navegación accesible por teclado.' },
      { en: 'Add the chosen type scale, spacing, and color variables.', es: 'Añadir la escala tipográfica, el espaciado y las variables de color elegidas.' },
    ],
    sessions: 6, completedSessions: 0, done: false, date: '2026-10-30', priority: 'high',
  },
  {
    id: 'build-projects', phaseId: 'build',
    title: { en: 'Build the project pages', es: 'Construir las páginas de proyectos' },
    details: { en: 'Turn the approved layouts into responsive pages with the final project stories.', es: 'Convertir los diseños aprobados en páginas adaptables con las historias finales de los proyectos.' },
    checklist: [
      { en: 'Implement one project card with its title, image, and link.', es: 'Implementar una tarjeta de proyecto con su título, imagen y enlace.' },
      { en: 'Build the first case study and check it at narrow and wide widths.', es: 'Construir el primer caso de estudio y revisarlo en pantallas estrechas y anchas.' },
      { en: 'Add the other two stories and write useful image descriptions.', es: 'Añadir las otras dos historias y escribir descripciones útiles para las imágenes.' },
    ],
    sessions: 6, completedSessions: 0, done: false, date: '2026-11-04', priority: 'high',
  },
  {
    id: 'contact', phaseId: 'build',
    title: { en: 'Add contact and finishing touches', es: 'Añadir el contacto y los últimos detalles' },
    details: { en: 'Make it easy to get in touch and ensure the small interactions feel complete.', es: 'Facilitar el contacto y cuidar los pequeños detalles de interacción.' },
    checklist: [
      { en: 'Build labeled contact fields with helpful validation messages.', es: 'Crear campos de contacto etiquetados con mensajes de validación útiles.' },
      { en: 'Connect form delivery and try both a successful and failed submission.', es: 'Conectar el envío del formulario y probar un envío correcto y uno fallido.' },
      { en: 'Add visible focus states and check every navigation link.', es: 'Añadir estados de foco visibles y revisar todos los enlaces de navegación.' },
    ],
    sessions: 6, completedSessions: 0, done: false, date: '2026-11-06', priority: 'medium',
  },
  {
    id: 'review', phaseId: 'launch',
    title: { en: 'Test on real devices', es: 'Probar en dispositivos reales' },
    details: { en: 'Read, navigate, and use the contact form as someone seeing the site for the first time.', es: 'Leer, navegar y usar el formulario como alguien que visita el sitio por primera vez.' },
    checklist: [
      { en: 'Walk through every page on a phone and record layout problems.', es: 'Recorrer cada página en un teléfono y anotar problemas de diseño.' },
      { en: 'Navigate with only the keyboard and check the form labels.', es: 'Navegar solo con el teclado y comprobar las etiquetas del formulario.' },
      { en: 'Ask a friend to find one project result and send a test message.', es: 'Pedir a alguien que encuentre el resultado de un proyecto y envíe un mensaje de prueba.' },
    ],
    sessions: 5, completedSessions: 0, done: false, date: '2026-11-09', priority: 'high',
  },
  {
    id: 'polish', phaseId: 'launch',
    title: { en: 'Polish content and performance', es: 'Pulir el contenido y el rendimiento' },
    details: { en: 'Resolve the review notes and make the pages easy to load, scan, and share.', es: 'Resolver las notas de revisión y facilitar la carga, la lectura y el uso compartido de las páginas.' },
    checklist: [
      { en: 'Fix the three issues that most affect reading or navigation.', es: 'Corregir los tres problemas que más afectan a la lectura o la navegación.' },
      { en: 'Resize large images and check that pages stay stable while loading.', es: 'Redimensionar imágenes grandes y comprobar que el diseño no salta al cargar.' },
      { en: 'Proofread the copy and add page titles and share descriptions.', es: 'Revisar los textos y añadir títulos de página y descripciones para compartir.' },
    ],
    sessions: 6, completedSessions: 0, done: false, date: '2026-11-11', priority: 'medium',
  },
  {
    id: 'publish', phaseId: 'launch',
    title: { en: 'Publish and share the portfolio', es: 'Publicar y compartir el portafolio' },
    details: { en: 'Connect the domain, check the live site, and share the first version with a few people.', es: 'Conectar el dominio, revisar el sitio publicado y compartir la primera versión con algunas personas.' },
    checklist: [
      { en: 'Publish the site and check the domain and secure connection.', es: 'Publicar el sitio y comprobar el dominio y la conexión segura.' },
      { en: 'Try the contact form on the live site and check the received email.', es: 'Probar el formulario en el sitio publicado y comprobar el correo recibido.' },
      { en: 'Share the link with three people and write down what to improve next.', es: 'Compartir el enlace con tres personas y anotar las próximas mejoras.' },
    ],
    sessions: 5, completedSessions: 0, done: false, date: '2026-11-13', priority: 'medium',
  },
]

export const demoPosts: DemoPost[] = [
  {
    id: 'less-but-better',
    title: { en: 'The homepage finally has some breathing room', es: 'La página de inicio por fin respira' },
    body: {
      en: 'I removed the big list of tools and gave the projects more space. The work says more than a row of logos ever did. Next up: making the same layout feel good on a phone. Small change, much clearer direction.',
      es: 'Quité la gran lista de herramientas y di más espacio a los proyectos. El trabajo cuenta más que una fila de logotipos. Lo siguiente: conseguir que el mismo diseño funcione bien en el teléfono. Un cambio pequeño que aclara mucho la dirección.',
    },
    date: '2026-10-27', minutes: 600, likes: 12,
    tag: { en: 'Design note', es: 'Nota de diseño' },
  },
  {
    id: 'direction-set',
    title: { en: 'A direction I can actually stick with', es: 'Una dirección con la que puedo seguir' },
    body: {
      en: 'After trying a few directions, I settled on quiet typography and one warm accent. I made a little style sheet so I can stop choosing colors and start designing pages. Six focused sessions turned a folder of references into a clear starting point.',
      es: 'Después de probar varias opciones, elegí una tipografía tranquila y un acento cálido. Creé una pequeña guía para dejar de elegir colores y empezar a diseñar páginas. Seis sesiones de concentración convirtieron una carpeta de referencias en un punto de partida claro.',
    },
    date: '2026-10-23', minutes: 450, likes: 8,
    tag: { en: 'Milestone', es: 'Hito' },
  },
  {
    id: 'getting-started',
    title: { en: 'Starting before I feel ready', es: 'Empezar antes de sentirme preparado' },
    body: {
      en: 'This portfolio has lived in my notes for months. Today I picked three projects and wrote down what I want the site to do. No perfect first version. Just something honest, useful, and published by November 13.',
      es: 'Este portafolio llevaba meses en mis notas. Hoy elegí tres proyectos y escribí qué quiero conseguir con el sitio. La primera versión no tiene que ser perfecta: solo honesta, útil y publicada antes del 13 de noviembre.',
    },
    date: '2026-10-15', minutes: 200, likes: 6,
    tag: { en: 'First steps', es: 'Primeros pasos' },
  },
]

export const demoTemplates: DemoTemplate[] = [
  {
    id: 'study', icon: 'book',
    name: { en: 'Study Planner', es: 'Plan de estudio' },
    description: { en: 'Make steady progress through a subject, one topic at a time.', es: 'Avanzar de forma constante en una materia, un tema a la vez.' },
    goal: { en: 'Understand the core topics, practice with exercises, and review what I learn each week.', es: 'Entender los temas principales, practicar con ejercicios y repasar lo aprendido cada semana.' },
  },
  {
    id: 'exam', icon: 'graduation',
    name: { en: 'Exam Preparation', es: 'Preparación de exámenes' },
    description: { en: 'Work back from exam day with revision and practice sessions.', es: 'Planificar hasta el examen con sesiones de repaso y práctica.' },
    goal: { en: 'Prepare for my exam by covering the syllabus, revisiting weak topics, and completing timed practice papers.', es: 'Preparar mi examen repasando el temario, reforzando los temas difíciles y completando pruebas cronometradas.' },
  },
  {
    id: 'software', icon: 'code',
    name: { en: 'Software Development', es: 'Desarrollo de software' },
    description: { en: 'Take an idea through design, development, and a first release.', es: 'Llevar una idea desde el diseño y el desarrollo hasta su primera versión.' },
    goal: { en: 'Build and launch a useful first version, from a clear scope to a tested release.', es: 'Crear y lanzar una primera versión útil, desde un alcance claro hasta una entrega probada.' },
  },
  {
    id: 'weekly', icon: 'calendar',
    name: { en: 'Weekly Work Plan', es: 'Plan de trabajo semanal' },
    description: { en: 'Give this week’s priorities a realistic place in your day.', es: 'Reservar un espacio realista para las prioridades de esta semana.' },
    goal: { en: 'Finish my three most important outcomes this week while leaving room for review and unexpected work.', es: 'Completar mis tres objetivos más importantes esta semana dejando espacio para revisar e imprevistos.' },
  },
]
