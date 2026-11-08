import JapaneseSeoPage, { getJapaneseSeoMetadata } from '@/components/seo/JapaneseSeoPage'

export const metadata = getJapaneseSeoMetadata('pomodoro-timer')

export default function Page() {
  return <JapaneseSeoPage slug="pomodoro-timer" />
}
