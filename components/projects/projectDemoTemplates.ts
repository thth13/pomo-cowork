import {
  DEMO_TODAY, demoPhases, demoTasks,
  type DemoPhase, type DemoTask, type DemoTemplate, type Text,
} from './projectDemoData'
import { shiftDemoDate } from './projectDemoSchedule'

const copy = (en: string, es: string): Text => ({ en, es })

type TaskSeed = {
  title: Text
  details: Text
  checklist: Text[]
  sessions: number
}

type TemplateSeed = { phases: DemoPhase[]; tasks: TaskSeed[] }

const study: TemplateSeed = {
  phases: [
    { id: 'study-map', title: copy('Map the subject', 'Organizar la materia'), description: copy('Choose what to learn and find a clear starting point.', 'Elegir qué aprender y encontrar un punto de partida claro.') },
    { id: 'study-learn', title: copy('Build understanding', 'Comprender los conceptos'), description: copy('Read actively and explain the ideas in your own words.', 'Leer de forma activa y explicar las ideas con tus propias palabras.') },
    { id: 'study-practice', title: copy('Put it into practice', 'Ponerlo en práctica'), description: copy('Use exercises to turn familiarity into understanding.', 'Usar ejercicios para convertir lo conocido en comprensión.') },
    { id: 'study-review', title: copy('Make it stick', 'Consolidar lo aprendido'), description: copy('Recall, review, and decide what to learn next.', 'Recordar, repasar y decidir qué aprender después.') },
  ],
  tasks: [
    {
      title: copy('Map the topics I need to learn', 'Organizar los temas que necesito aprender'),
      details: copy('Turn the subject into a short list of topics with one learning outcome each.', 'Convertir la materia en una lista breve de temas con un resultado de aprendizaje para cada uno.'),
      checklist: [copy('List the main topics from the course outline.', 'Enumerar los temas principales del programa.'), copy('Write one question I want to answer for each topic.', 'Escribir una pregunta que quiera responder por cada tema.'), copy('Choose the first two topics and note what I already know.', 'Elegir los dos primeros temas y anotar lo que ya sé.')], sessions: 2,
    },
    {
      title: copy('Gather a small set of useful resources', 'Reunir algunos recursos útiles'),
      details: copy('Choose one main source and one exercise set so studying stays focused.', 'Elegir una fuente principal y una colección de ejercicios para concentrar el estudio.'),
      checklist: [copy('Find the relevant chapters or lessons for the first topic.', 'Encontrar los capítulos o lecciones del primer tema.'), copy('Save a set of practice questions with answers.', 'Guardar una colección de preguntas prácticas con respuestas.'), copy('Put the reading and exercise links in one note.', 'Reunir los enlaces de lectura y ejercicios en una nota.')], sessions: 2,
    },
    {
      title: copy('Study the first core topic', 'Estudiar el primer tema principal'),
      details: copy('Read a small section, close the source, and describe the idea without copying.', 'Leer una sección breve, cerrar la fuente y describir la idea sin copiar.'),
      checklist: [copy('Read one section and mark the three most useful ideas.', 'Leer una sección y señalar las tres ideas más útiles.'), copy('Explain those ideas from memory in a short note.', 'Explicar esas ideas de memoria en una nota breve.'), copy('Reopen the source and correct the gaps in my explanation.', 'Volver a la fuente y corregir los errores de mi explicación.')], sessions: 4,
    },
    {
      title: copy('Connect the second topic to the first', 'Conectar el segundo tema con el primero'),
      details: copy('Look for the relationship between ideas instead of collecting more isolated notes.', 'Buscar la relación entre las ideas en lugar de acumular notas aisladas.'),
      checklist: [copy('Read the next lesson and write its main question.', 'Leer la siguiente lección y escribir su pregunta principal.'), copy('Draw a simple map connecting the two topics.', 'Dibujar un mapa sencillo que conecte los dos temas.'), copy('Write an example that uses both ideas together.', 'Escribir un ejemplo que use ambas ideas a la vez.')], sessions: 4,
    },
    {
      title: copy('Solve a short set of practice questions', 'Resolver una serie breve de ejercicios'),
      details: copy('Try the questions without notes first, then use mistakes to guide the next session.', 'Intentar resolver las preguntas sin apuntes y usar los errores para orientar la próxima sesión.'),
      checklist: [copy('Answer five questions without looking at the solutions.', 'Responder cinco preguntas sin mirar las soluciones.'), copy('Check the answers and classify each mistake.', 'Revisar las respuestas y clasificar cada error.'), copy('Retry two missed questions and explain the correction.', 'Repetir dos preguntas falladas y explicar la corrección.')], sessions: 3,
    },
    {
      title: copy('Explain a difficult idea with an example', 'Explicar una idea difícil con un ejemplo'),
      details: copy('Make one difficult concept clear enough to teach to someone new to the subject.', 'Aclarar un concepto difícil hasta poder enseñarlo a alguien que empieza.'),
      checklist: [copy('Choose the idea I found hardest in the practice questions.', 'Elegir la idea que más me costó en los ejercicios.'), copy('Write a plain-language explanation with a concrete example.', 'Escribir una explicación sencilla con un ejemplo concreto.'), copy('Check the example and simplify any unclear sentence.', 'Comprobar el ejemplo y simplificar las frases poco claras.')], sessions: 3,
    },
    {
      title: copy('Review from memory', 'Repasar de memoria'),
      details: copy('Check what I can recall before deciding what needs another look.', 'Comprobar qué puedo recordar antes de decidir qué repasar de nuevo.'),
      checklist: [copy('Write the main ideas on a blank page without notes.', 'Escribir las ideas principales en una página en blanco sin apuntes.'), copy('Compare with my topic map and mark missing connections.', 'Comparar con mi mapa de temas y señalar conexiones que faltan.'), copy('Make five review prompts for the weak points.', 'Crear cinco preguntas de repaso para los puntos débiles.')], sessions: 2,
    },
    {
      title: copy('Reflect and choose the next topics', 'Reflexionar y elegir los próximos temas'),
      details: copy('Record what improved and turn the remaining questions into a manageable next plan.', 'Registrar los avances y convertir las dudas pendientes en un próximo plan manejable.'),
      checklist: [copy('Answer the review prompts and note which are still difficult.', 'Responder las preguntas de repaso y anotar cuáles siguen costando.'), copy('Write three things I can now do that I could not do before.', 'Escribir tres cosas que ahora puedo hacer y antes no podía.'), copy('Choose the next two topics and schedule a later review.', 'Elegir los dos próximos temas y programar un repaso posterior.')], sessions: 2,
    },
  ],
}

const exam: TemplateSeed = {
  phases: [
    { id: 'exam-assess', title: copy('Know the exam', 'Conocer el examen'), description: copy('Understand the format and find the biggest knowledge gaps.', 'Entender el formato y detectar las principales lagunas.') },
    { id: 'exam-revise', title: copy('Revise the essentials', 'Repasar lo esencial'), description: copy('Give the hardest and most useful topics focused attention.', 'Dedicar atención a los temas más difíciles y útiles.') },
    { id: 'exam-practice', title: copy('Practice under time', 'Practicar con tiempo limitado'), description: copy('Use realistic questions to learn both the content and the pace.', 'Usar preguntas realistas para dominar el contenido y el ritmo.') },
    { id: 'exam-prepare', title: copy('Get ready for the day', 'Prepararse para el día'), description: copy('Close the remaining gaps and prepare a calm final review.', 'Resolver las dudas pendientes y preparar un repaso final tranquilo.') },
  ],
  tasks: [
    {
      title: copy('Map the syllabus and exam format', 'Revisar el temario y el formato del examen'),
      details: copy('Make a checklist of the tested topics, question types, and time limits.', 'Crear una lista de temas evaluados, tipos de preguntas y límites de tiempo.'),
      checklist: [copy('Read the official syllabus and list the tested topics.', 'Leer el temario oficial y enumerar los temas evaluados.'), copy('Note the time limit and marks for each section.', 'Anotar el tiempo y los puntos de cada sección.'), copy('Collect one sample paper and its marking guide.', 'Reunir un examen de muestra y su guía de corrección.')], sessions: 2,
    },
    {
      title: copy('Try a short diagnostic quiz', 'Hacer una prueba diagnóstica breve'),
      details: copy('Use a small sample of questions to choose what to revise first.', 'Usar una pequeña muestra de preguntas para elegir qué repasar primero.'),
      checklist: [copy('Answer a mixed set of questions without notes.', 'Responder una serie variada de preguntas sin apuntes.'), copy('Mark the answers and record uncertain topics.', 'Corregir las respuestas y registrar los temas dudosos.'), copy('Pick the three gaps with the biggest effect on my score.', 'Elegir las tres lagunas que más afectan a mi puntuación.')], sessions: 2,
    },
    {
      title: copy('Revise the highest-priority topic', 'Repasar el tema más prioritario'),
      details: copy('Build understanding of the weakest core topic, then test it immediately.', 'Comprender mejor el tema principal más débil y comprobarlo enseguida.'),
      checklist: [copy('Review one lesson covering the main gap.', 'Repasar una lección sobre la principal laguna.'), copy('Create a one-page summary from memory.', 'Crear un resumen de una página de memoria.'), copy('Answer three exam questions on that topic.', 'Responder tres preguntas de examen sobre ese tema.')], sessions: 4,
    },
    {
      title: copy('Build a compact recall sheet', 'Crear una hoja breve de repaso'),
      details: copy('Gather the formulas, concepts, or definitions that need quick and accurate recall.', 'Reunir fórmulas, conceptos o definiciones que deba recordar con rapidez y precisión.'),
      checklist: [copy('List the concepts I hesitated on in the diagnostic quiz.', 'Enumerar los conceptos que me hicieron dudar en la prueba inicial.'), copy('Write one prompt and answer for each concept.', 'Escribir una pregunta y una respuesta para cada concepto.'), copy('Test myself with the answers covered and revise weak prompts.', 'Probarme con las respuestas tapadas y repasar las preguntas difíciles.')], sessions: 3,
    },
    {
      title: copy('Complete a timed practice section', 'Completar una sección cronometrada'),
      details: copy('Work at exam pace and note where time runs short.', 'Trabajar al ritmo del examen y anotar dónde falta tiempo.'),
      checklist: [copy('Choose a section that fits a 25-minute practice block.', 'Elegir una sección que encaje en un bloque de práctica de 25 minutos.'), copy('Answer it under the real timing rules without notes.', 'Responderla con las reglas de tiempo reales y sin apuntes.'), copy('Mark the answers and compare time spent with marks earned.', 'Corregir las respuestas y comparar el tiempo invertido con los puntos obtenidos.')], sessions: 4,
    },
    {
      title: copy('Repair the mistakes from practice', 'Corregir los errores de la práctica'),
      details: copy('Separate knowledge gaps from rushed reading and time-management mistakes.', 'Separar las lagunas de conocimiento de los errores de lectura o de gestión del tiempo.'),
      checklist: [copy('Group mistakes by missing knowledge, method, or timing.', 'Agrupar los errores por conocimientos, método o tiempo.'), copy('Work through the two most useful corrections slowly.', 'Trabajar con calma en las dos correcciones más útiles.'), copy('Try similar questions without looking at the corrected answers.', 'Resolver preguntas parecidas sin mirar las respuestas corregidas.')], sessions: 3,
    },
    {
      title: copy('Run a final mixed-topic review', 'Hacer un repaso final de varios temas'),
      details: copy('Check that the revised ideas still hold when different topics are mixed together.', 'Comprobar que lo repasado se mantiene al mezclar distintos temas.'),
      checklist: [copy('Choose questions from three different syllabus areas.', 'Elegir preguntas de tres áreas distintas del temario.'), copy('Answer the mixed set and check the marking guide.', 'Responder la serie variada y consultar la guía de corrección.'), copy('Add only the remaining weak points to my recall sheet.', 'Añadir a la hoja de repaso solo los puntos que todavía cuestan.')], sessions: 3,
    },
    {
      title: copy('Prepare the exam-day checklist', 'Preparar la lista para el día del examen'),
      details: copy('Finish with a clear plan for materials, timing, and a light final review.', 'Terminar con un plan claro de materiales, horarios y un último repaso ligero.'),
      checklist: [copy('Confirm the exam time, location, and permitted materials.', 'Confirmar la hora, el lugar y los materiales permitidos.'), copy('Write a simple time budget for the exam sections.', 'Escribir un reparto sencillo del tiempo por secciones.'), copy('Pack what I need and choose a short final recall review.', 'Preparar lo necesario y elegir un último repaso breve.')], sessions: 2,
    },
  ],
}

const weekly: TemplateSeed = {
  phases: [
    { id: 'weekly-choose', title: copy('Choose what matters', 'Elegir lo importante'), description: copy('Define a few useful outcomes and make space for them.', 'Definir algunos resultados útiles y reservarles espacio.') },
    { id: 'weekly-first', title: copy('Move the main priority', 'Avanzar en la prioridad principal'), description: copy('Give the most important work an early, focused start.', 'Empezar pronto y con concentración el trabajo más importante.') },
    { id: 'weekly-finish', title: copy('Finish the next outcomes', 'Completar los siguientes objetivos'), description: copy('Complete the remaining priorities and handle small loose ends.', 'Completar las prioridades restantes y resolver los detalles pendientes.') },
    { id: 'weekly-close', title: copy('Close the week', 'Cerrar la semana'), description: copy('Review the results and leave a clear starting point for next week.', 'Revisar los resultados y preparar un punto de partida claro para la próxima semana.') },
  ],
  tasks: [
    {
      title: copy('Choose three outcomes for the week', 'Elegir tres objetivos para la semana'),
      details: copy('Choose results that would make the week useful, not just a longer to-do list.', 'Elegir resultados que hagan útil la semana, en lugar de alargar la lista de tareas.'),
      checklist: [copy('Gather the work currently on my mind in one list.', 'Reunir en una lista el trabajo que tengo pendiente.'), copy('Choose three outcomes and write a clear finish line for each.', 'Elegir tres objetivos y definir cuándo estará terminado cada uno.'), copy('Move everything else to a later list or mark it optional.', 'Pasar el resto a una lista para más adelante o marcarlo como opcional.')], sessions: 2,
    },
    {
      title: copy('Reserve realistic focus blocks', 'Reservar bloques de concentración realistas'),
      details: copy('Make room around existing commitments and leave a buffer for unexpected work.', 'Hacer espacio entre los compromisos existentes y dejar margen para imprevistos.'),
      checklist: [copy('Check meetings and other fixed commitments.', 'Revisar reuniones y otros compromisos fijos.'), copy('Give each outcome a few focused work blocks.', 'Asignar varios bloques de concentración a cada objetivo.'), copy('Leave one buffer block and write down the first action.', 'Dejar un bloque de margen y escribir la primera acción.')], sessions: 2,
    },
    {
      title: copy('Make a first draft of the main deliverable', 'Crear un borrador de la entrega principal'),
      details: copy('Create something concrete that can be reviewed, even if it still needs work.', 'Crear algo concreto que pueda revisarse aunque todavía necesite trabajo.'),
      checklist: [copy('Open the main task and define one useful first section.', 'Abrir la tarea principal y definir una primera sección útil.'), copy('Produce a rough version without polishing details.', 'Crear una versión inicial sin pulir los detalles.'), copy('Compare it with the finish line and list the missing pieces.', 'Compararla con el objetivo final y anotar lo que falta.')], sessions: 4,
    },
    {
      title: copy('Finish and review the main deliverable', 'Terminar y revisar la entrega principal'),
      details: copy('Resolve the essential gaps and check the result against the original outcome.', 'Resolver las carencias esenciales y comprobar el resultado frente al objetivo inicial.'),
      checklist: [copy('Complete the most important missing piece.', 'Completar la parte pendiente más importante.'), copy('Review the work from the recipient’s point of view.', 'Revisar el trabajo desde el punto de vista de quien lo recibe.'), copy('Save the finished version and note any handoff details.', 'Guardar la versión final y anotar los detalles para entregarla.')], sessions: 3,
    },
    {
      title: copy('Complete the second priority', 'Completar la segunda prioridad'),
      details: copy('Use a small, defined scope to move the next important outcome to done.', 'Usar un alcance pequeño y definido para completar el siguiente objetivo importante.'),
      checklist: [copy('Identify the smallest complete version of this outcome.', 'Identificar la versión completa más pequeña de este objetivo.'), copy('Work on the part that removes the biggest obstacle.', 'Trabajar en la parte que elimina el mayor obstáculo.'), copy('Check the result and record the remaining follow-up.', 'Comprobar el resultado y registrar el seguimiento pendiente.')], sessions: 3,
    },
    {
      title: copy('Complete the third priority and loose ends', 'Completar la tercera prioridad y los pendientes'),
      details: copy('Finish the final planned outcome without letting small tasks fill the whole day.', 'Terminar el último objetivo previsto sin dejar que las tareas pequeñas ocupen todo el día.'),
      checklist: [copy('Work on the third outcome before opening small requests.', 'Trabajar en el tercer objetivo antes de revisar solicitudes pequeñas.'), copy('Finish and save the result against its original scope.', 'Terminar y guardar el resultado según su alcance original.'), copy('Handle a short batch of necessary follow-up tasks.', 'Resolver un grupo breve de tareas de seguimiento necesarias.')], sessions: 3,
    },
    {
      title: copy('Review what moved forward', 'Revisar los avances'),
      details: copy('Compare the plan with what actually happened and keep the useful lessons.', 'Comparar el plan con lo que ocurrió y conservar los aprendizajes útiles.'),
      checklist: [copy('Review the three outcomes and record what was completed.', 'Revisar los tres objetivos y registrar lo completado.'), copy('Note one thing that helped and one thing that interrupted focus.', 'Anotar algo que ayudó y algo que interrumpió la concentración.'), copy('Write a short weekly update with the concrete results.', 'Escribir una actualización semanal breve con resultados concretos.')], sessions: 2,
    },
    {
      title: copy('Leave a clear start for next week', 'Preparar un comienzo claro para la próxima semana'),
      details: copy('Carry forward only the work that still matters and make its first action obvious.', 'Trasladar solo el trabajo que aún importa y dejar clara su primera acción.'),
      checklist: [copy('Remove stale tasks and collect useful follow-up notes.', 'Eliminar tareas obsoletas y reunir notas útiles de seguimiento.'), copy('Choose the likely first priority for next week.', 'Elegir la posible primera prioridad de la próxima semana.'), copy('Prepare its files and write the next 25-minute action.', 'Preparar sus archivos y escribir la próxima acción de 25 minutos.')], sessions: 2,
    },
  ],
}

/** Fresh, local sample plans. No inference, persistence, or account mutations. */
export function createTemplatePreview(template: DemoTemplate): { phases: DemoPhase[]; tasks: DemoTask[] } {
  if (template.id === 'software') {
    return {
      phases: demoPhases.map(phase => ({ ...phase })),
      tasks: demoTasks.map((task, index) => ({
        ...task,
        completedSessions: 0,
        done: false,
        date: shiftDemoDate(DEMO_TODAY, index),
      })),
    }
  }

  const seed = template.id === 'exam' ? exam : template.id === 'weekly' ? weekly : study
  return {
    phases: seed.phases.map(phase => ({ ...phase })),
    tasks: seed.tasks.map((task, index) => ({
      ...task,
      id: `${template.id}-task-${index + 1}`,
      phaseId: seed.phases[Math.floor(index / 2)].id,
      completedSessions: 0,
      done: false,
      date: shiftDemoDate(DEMO_TODAY, template.id === 'weekly' ? Math.floor(index / 2) : index),
      priority: index < 2 ? 'high' : 'medium',
    })),
  }
}
