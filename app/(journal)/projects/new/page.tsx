import ProjectEditor from '@/components/journal/ProjectEditor'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'New project | Pomo Cowork'
}
export default function Page() {
  return <ProjectEditor />
}
