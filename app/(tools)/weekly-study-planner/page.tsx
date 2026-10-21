import PlannerLandingPage, { getPlannerMetadata } from '@/components/planner/PlannerLandingPage'

export const metadata = getPlannerMetadata('weekly-study-planner')

export default function Page() {
  return <PlannerLandingPage slug="weekly-study-planner" />
}
