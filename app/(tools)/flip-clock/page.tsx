import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('flip-clock')

export default function Page() {
  return <SeoLandingPage slug="flip-clock" />
}
