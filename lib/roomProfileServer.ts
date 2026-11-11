import { NextRequest } from 'next/server'
import { put } from '@vercel/blob'
import { deleteAvatarFromBlob } from '@/lib/vercelBlob'
import { ROOM_DESCRIPTION_LIMIT, ROOM_IMAGE_LIMIT, ROOM_IMAGE_TYPES } from '@/lib/roomProfile'

export class RoomProfileError extends Error {}

type RoomBody = Record<string, unknown>
type ProfileData = { description?: string; avatarUrl?: string | null; backgroundImageUrl?: string | null }

export async function readRoomBody(request: NextRequest): Promise<RoomBody> {
  try {
    const body = request.headers.get('content-type')?.includes('multipart/form-data')
      ? Object.fromEntries(await request.formData())
      : await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body
  } catch {
    throw new RoomProfileError('Invalid room data')
  }
}

// Validate every file before uploading. Only server-created URLs can be persisted.
export async function saveRoomProfile<T>(body: RoomBody, userId: string, save: (data: ProfileData) => Promise<T>): Promise<T> {
  const data: ProfileData = {}
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length > ROOM_DESCRIPTION_LIMIT) {
      throw new RoomProfileError(`Description must be at most ${ROOM_DESCRIPTION_LIMIT} characters`)
    }
    data.description = body.description.trim()
  }
  const files: { key: 'avatarUrl' | 'backgroundImageUrl'; buffer: Buffer; type: string }[] = []
  for (const [field, key] of [['avatar', 'avatarUrl'], ['background', 'backgroundImageUrl']] as const) {
    if (body[key] !== undefined) {
      if (body[key] !== null && body[key] !== '') throw new RoomProfileError('Upload an image file to change the room image')
      data[key] = null
    }
    const file = body[field]
    if (file === undefined) continue
    if (typeof file === 'string' || !file || typeof (file as File).arrayBuffer !== 'function') throw new RoomProfileError('Invalid image file')
    const image = file as File
    if (!ROOM_IMAGE_TYPES.includes(image.type) || !image.size || image.size > ROOM_IMAGE_LIMIT) {
      throw new RoomProfileError('Use a JPG, PNG, WebP or GIF image up to 2 MB')
    }
    const buffer = Buffer.from(await image.arrayBuffer())
    const valid = image.type === 'image/jpeg' ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      : image.type === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : image.type === 'image/gif' ? ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
      : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
    if (!valid) throw new RoomProfileError('Image content does not match its file type')
    files.push({ key, buffer, type: image.type })
  }
  const uploaded: string[] = []
  try {
    for (const file of files) {
      const blob = await put(`rooms/${userId}/${file.key}.${file.type.split('/')[1]}`, file.buffer, {
        access: 'public', contentType: file.type, addRandomSuffix: true,
      })
      uploaded.push(blob.url)
      data[file.key] = blob.url
    }
    return await save(data)
  } catch (error) {
    await Promise.allSettled(uploaded.map(url => deleteAvatarFromBlob(url)))
    throw error
  }
}
