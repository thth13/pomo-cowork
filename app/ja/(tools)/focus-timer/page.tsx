import JapaneseSeoPage, { getJapaneseSeoMetadata } from '@/components/seo/JapaneseSeoPage'

export const metadata = getJapaneseSeoMetadata('focus-timer')

export default function Page() {
  return <JapaneseSeoPage slug="focus-timer" />
}
