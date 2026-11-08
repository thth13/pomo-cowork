import type { Metadata } from 'next'
import Link from 'next/link'
import HomeWorkspace from '@/components/HomeWorkspace'
import WorkspaceBackground from '@/components/WorkspaceBackground'
import { ES_HOME_TITLE, ES_HOME_DESCRIPTION, HOME_LANGUAGES } from '@/lib/homeSeo'
import '../daily-flow/daily-flow.css'
import './spanish-home.css'

export const metadata: Metadata = {
  title: ES_HOME_TITLE,
  description: ES_HOME_DESCRIPTION,
  alternates: { canonical: '/es', languages: HOME_LANGUAGES },
  openGraph: {
    title: ES_HOME_TITLE,
    description: ES_HOME_DESCRIPTION,
    type: 'website',
    locale: 'es_ES',
    alternateLocale: ['en_US'],
    url: '/es',
    siteName: 'Pomo Cowork',
    images: [{ url: '/assets/meta/og-main.png', width: 1200, height: 630, alt: 'Pomo Cowork: temporizador Pomodoro para estudiar y trabajar' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: ES_HOME_TITLE,
    description: ES_HOME_DESCRIPTION,
    images: ['/assets/meta/og-main.png'],
  },
}

export default function SpanishHomePage() {
  return (
    <main className="pomodoro-home garden-page" lang="es">
      <WorkspaceBackground />
      <div id="temporizador">
        <HomeWorkspace overview={<p className="pomodoro-overview">Organiza tus sesiones de estudio y trabajo con descansos. <a href="#como-funciona">Consulta la guía del temporizador Pomodoro.</a></p>} />
      </div>
      <section id="como-funciona" className="pomodoro-overview spanish-home-overview" aria-labelledby="spanish-home-heading" data-i18n-ignore>
        <nav aria-label="Idioma"><Link href="/" hrefLang="en" lang="en">English</Link> · <Link href="/es" hrefLang="es" aria-current="page">Español</Link></nav>
        <h1 id="spanish-home-heading">Temporizador Pomodoro online gratis para estudiar y trabajar</h1>
        <p>Dedica un rato a una sola tarea y reserva tiempo para descansar. Con Pomo Cowork puedes usar un temporizador Pomodoro online, ajustar tus sesiones de concentración y compartir el tiempo de estudio con otras personas. Todo desde el navegador, sin instalar una aplicación.</p>
        <p><a href="#temporizador">Empezar una sesión Pomodoro</a></p>

        <h2>Cómo usar la técnica Pomodoro: 25 minutos de concentración y 5 de descanso</h2>
        <ol>
          <li>Elige una tarea concreta: repasar un tema, leer un capítulo o avanzar en un proyecto.</li>
          <li>Configura el temporizador en 25 minutos y concéntrate en esa tarea hasta que termine la sesión.</li>
          <li>Haz una pausa de 5 minutos. Levántate, bebe agua o descansa la vista.</li>
          <li>Repite el ciclo. Después de cuatro sesiones, dedica entre 15 y 30 minutos a un descanso más largo.</li>
        </ol>
        <p>El método Pomodoro te ayuda a dividir el trabajo en pasos manejables. Puedes adaptar la duración de cada sesión y de las pausas a tu ritmo.</p>

        <h2>Un temporizador de estudio para preparar exámenes</h2>
        <p>Organiza el repaso por temas y asigna una tarea a cada sesión: resolver ejercicios, practicar vocabulario o recordar lo aprendido sin mirar los apuntes. Alternar tiempo de estudio y descansos te permite planificar una tarde de repaso con un principio y un final claros.</p>

        <h2>Estudia con amigos y trabaja en compañía online</h2>
        <p>Comparte un espacio de concentración con otras personas en tiempo real. Puedes crear una sala privada para tu grupo de estudio o tu equipo y utilizar el chat para comentar los avances entre sesiones. Cada persona trabaja en sus tareas, con la compañía del grupo.</p>
        <p><Link href="/rooms">Explorar las salas para estudiar y trabajar</Link></p>

        <h2>Personaliza tu temporizador Pomodoro</h2>
        <p>Ajusta los minutos de trabajo, los descansos cortos y las pausas largas. Elige sonidos de ambiente y configura las notificaciones para acompañar tus sesiones de lectura, escritura, programación o estudio. No tienes que mantener el ciclo de 25 y 5 si necesitas otro ritmo.</p>

        <h2>Lleva un registro de tu tiempo de concentración</h2>
        <p>Inicia sesión para guardar tus sesiones y consultar tu historial. Revisa cuánto tiempo has dedicado a estudiar o trabajar y utiliza ese registro para organizar tus próximas tareas.</p>

        <h2>Preguntas frecuentes sobre el temporizador Pomodoro</h2>
        <h3>¿El temporizador Pomodoro es gratis?</h3>
        <p>Sí. Puedes usar el temporizador Pomodoro básico gratis. Pomo Cowork también ofrece funciones adicionales de pago; consulta los <Link href="/pricing">planes disponibles</Link> si las necesitas.</p>
        <h3>¿Necesito descargar una aplicación?</h3>
        <p>No. El temporizador funciona online en el navegador de tu ordenador o móvil.</p>
        <h3>¿Puedo cambiar los 25 minutos de estudio?</h3>
        <p>Sí. Puedes personalizar la duración del trabajo y de los descansos. Empieza con una sesión que se adapte a la tarea y ajusta el tiempo según te resulte útil.</p>
        <h3>¿Sirve para estudiar con otras personas a distancia?</h3>
        <p>Sí. Las salas compartidas te permiten estudiar con amigos o trabajar con tu equipo online, aunque cada persona esté en un lugar distinto.</p>
      </section>
    </main>
  )
}
