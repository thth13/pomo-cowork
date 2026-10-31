import PlannerLandingPage, { getPlannerMetadata } from '@/components/planner/PlannerLandingPage'

export const metadata = getPlannerMetadata('exam-study-planner')

export default function Page() {
  return <PlannerLandingPage slug="exam-study-planner" />
}
