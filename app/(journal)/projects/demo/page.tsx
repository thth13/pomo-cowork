import PublicProjectDemo from '@/components/journal/PublicProjectDemo'
export const metadata = {
  title: 'Public project demo | Pomo Cowork',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'
export default function Page({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = ['overview', 'activity', 'tasks', 'blog'].includes(searchParams.tab || '') ? searchParams.tab! : 'overview'
  return <PublicProjectDemo tab={tab} today={new Date().toISOString().slice(0, 10)} />
}
