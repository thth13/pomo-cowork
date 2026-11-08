import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-effect', 'es')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-effect" language="es" />
}
