'use client'

import { QueryError } from '@/components/journal/Primitives'
export default function ErrorPage({
  reset
}: {
  reset: () => void;
}) {
  return <QueryError error="We could not load this journal. Please try again." retry={reset} />
}
