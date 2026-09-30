import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('ielts-study-timer')

export default function Page() {
  return <SeoLandingPage slug="ielts-study-timer" />
}
