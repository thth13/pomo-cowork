import PlannerLandingPage, { getPlannerMetadata } from '@/components/planner/PlannerLandingPage'

export const metadata = getPlannerMetadata('pomodoro-calculator')

export default function Page() {
  return <PlannerLandingPage slug="pomodoro-calculator" />
}
