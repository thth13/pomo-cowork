import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runAchievementJobs } from '@/lib/achievements/jobs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization') ?? ''
  const expected = 'Bearer ' + secret
  const suppliedBytes = Buffer.from(supplied), expectedBytes = Buffer.from(expected)
  if (!secret || suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try { return NextResponse.json(await runAchievementJobs(50)) }
  catch (error) {
    console.error('Achievement worker failed', error)
    return NextResponse.json({ error: 'Achievement worker failed; safe to retry.' }, { status: 500 })
  }
}
