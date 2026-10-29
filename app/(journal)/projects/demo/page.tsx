import ProjectDemo from '@/components/projects/ProjectDemo'
import { privateMetadata } from '@/lib/journal/metadata'

export const metadata = {
  ...privateMetadata,
  title: 'Project planning · Design preview | Pomo Cowork',
}

export default function ProjectDemoPage() {
  return <ProjectDemo />
}
