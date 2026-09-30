import PostComposer from '@/components/journal/PostComposer'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'Post update | Pomo Cowork'
}
export default function Page({
  searchParams
}: {
  searchParams: {
    edit?: string;
    project?: string;
    type?: string;
  };
}) {
  return <PostComposer edit={searchParams.edit} project={searchParams.project} weekly={searchParams.type === 'WEEKLY_UPDATE'} />
}
