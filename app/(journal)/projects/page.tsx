import MyProjects, { MyProjectsLoading } from '@/components/MyProjects'
import PersonalNavigation from '@/components/PersonalNavigation'
import { AuthGate } from '@/components/journal/Primitives'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'My projects | Pomo Cowork'
}
export default function Page() {
  return <section className="my-projects personal-page-frame">
    <PersonalNavigation />
    <AuthGate loadingFallback={<MyProjectsLoading />}><MyProjects /></AuthGate>
  </section>
}
