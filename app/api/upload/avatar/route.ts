import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { deleteFileFromS3 } from '@/lib/s3'
import { deleteAvatarFromBlob, uploadAvatarToBlob } from '@/lib/vercelBlob'

export const dynamic = 'force-dynamic'

// POST /api/upload/avatar - Upload avatar through backend
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Проверка размера (макс 20MB)
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 4.5MB)' }, { status: 400 })
    }

    // Конвертируем файл в Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const contentType = file.type || 'application/octet-stream'

    // Получаем текущего пользователя для проверки старого аватара
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { avatarUrl: true },
    })

    // Удаляем старый аватар из S3, если он существует
    const lastAvatarUrl = currentUser?.avatarUrl
    if (lastAvatarUrl) {
      if (lastAvatarUrl.includes('vercel-storage.com')) {
        await deleteAvatarFromBlob(lastAvatarUrl)
      } else {
        await deleteFileFromS3(lastAvatarUrl)
      }
    }

    // Загружаем новый файл в Vercel Blob, сохраняем исходный формат
    const avatarUrl = await uploadAvatarToBlob({
      buffer,
      userId: payload.userId,
      contentType,
    })

    // Обновляем URL аватара в БД
    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        isAnonymous: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
