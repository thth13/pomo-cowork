import ProfileEditor from '@/components/journal/ProfileEditor'
import { privateMetadata } from '@/lib/journal/metadata'
export const metadata = {
  ...privateMetadata,
  title: 'Profile settings | Pomo Cowork'
}
export default function Page() {
  return <ProfileEditor />
}
