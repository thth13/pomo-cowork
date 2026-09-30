import ProjectEditor from '@/components/journal/ProjectEditor'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'Edit project | Pomo Cowork'
}
export default function Page({
  params
}: {
  params: {
    id: string;
  };
}) {
  return <ProjectEditor id={params.id} />
}
