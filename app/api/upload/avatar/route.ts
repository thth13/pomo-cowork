import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { uploadFileToS3, deleteFileFromS3 } from '@/lib/s3'

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
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
    }

    // Конвертируем файл в Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Получаем текущего пользователя для проверки старого аватара
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { avatarUrl: true },
    })

    // Удаляем старый аватар из S3, если он существует
    if (currentUser?.avatarUrl) {
      await deleteFileFromS3(currentUser.avatarUrl)
    }

    // Загружаем новый файл в S3
    const avatarUrl = await uploadFileToS3(buffer, payload.userId, file.type)

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
