import { NextResponse } from 'next/server'

declare global {
  // eslint-disable-next-line no-var
  var pomodoOnlineUsers: Set<string> | undefined
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const onlineUsers = global.pomodoOnlineUsers ? Array.from(global.pomodoOnlineUsers) : []

  return NextResponse.json({ onlineUsers })
}


