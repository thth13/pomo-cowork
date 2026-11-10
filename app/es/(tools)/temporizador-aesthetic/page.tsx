import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('aesthetic-timer', 'es')

export default function Page() {
  return <SeoLandingPage slug="aesthetic-timer" language="es" />
}
