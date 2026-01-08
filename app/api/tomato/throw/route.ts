import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { targetUserId } = await request.json()
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // Здесь можно добавить логику сохранения в БД, если нужно
    // Например, счетчик брошенных помидоров

    return NextResponse.json({ 
      success: true,
      fromUserId: payload.userId,
      toUserId: targetUserId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error throwing tomato:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
