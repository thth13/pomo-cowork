import type { Metadata } from 'next'
import BeepHistory from '../BeepHistory'
export const metadata: Metadata = { title: 'Conversation with Mr. Beep | Pomo Cowork', robots: { index: false, follow: false } }
export default function Page({ params }: { params: { id: string } }) { return <BeepHistory conversationId={params.id} /> }
