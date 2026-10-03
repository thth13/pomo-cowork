import MyProjects, { MyProjectsLoading } from '@/components/MyProjects'
import { AuthGate } from '@/components/journal/Primitives'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'My projects | Pomo Cowork'
}
export default function Page() {
  return <AuthGate loadingFallback={<MyProjectsLoading />}><MyProjects /></AuthGate>
}
