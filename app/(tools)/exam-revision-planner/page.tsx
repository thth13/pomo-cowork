import PlannerLandingPage, { getPlannerMetadata } from '@/components/planner/PlannerLandingPage'

export const metadata = getPlannerMetadata('exam-revision-planner')

export default function Page() {
  return <PlannerLandingPage slug="exam-revision-planner" />
}
