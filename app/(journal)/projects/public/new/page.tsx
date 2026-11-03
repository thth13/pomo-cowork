import ProjectEditor from '@/components/journal/ProjectEditor'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = { ...privateMetadata, title: 'Make public project | Pomo Cowork' }
export default function Page({ searchParams }: { searchParams: { project?: string } }) {
  return <ProjectEditor initialWorkProject={searchParams.project} />
}
