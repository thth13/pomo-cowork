import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('group-study-timer', 'es')

export default function Page() {
  return <SeoLandingPage slug="group-study-timer" language="es" />
}
