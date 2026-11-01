import type { Metadata } from 'next'
import BeepHistory from './BeepHistory'
export const metadata: Metadata = { title: 'Mr. Beep | Pomo Cowork', robots: { index: false, follow: false } }
export default function Page() { return <BeepHistory /> }
