import JapaneseSeoPage, { getJapaneseSeoMetadata } from '@/components/seo/JapaneseSeoPage'

export const metadata = getJapaneseSeoMetadata('25-minute-timer')

export default function Page() {
  return <JapaneseSeoPage slug="25-minute-timer" />
}
