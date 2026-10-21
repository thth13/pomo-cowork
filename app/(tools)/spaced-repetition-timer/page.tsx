import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('spaced-repetition-timer')

export default function Page() {
  return <SeoLandingPage slug="spaced-repetition-timer" />
}
