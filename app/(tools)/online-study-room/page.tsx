import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('online-study-room')

export default function Page() {
  return <SeoLandingPage slug="online-study-room" />
}
