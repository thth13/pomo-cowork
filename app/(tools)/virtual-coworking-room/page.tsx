import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('virtual-coworking-room')

export default function Page() {
  return <SeoLandingPage slug="virtual-coworking-room" />
}
