import { put, del } from '@vercel/blob'

const BLOB_STORE_ID = process.env.BLOB_STORE_ID
const BLOB_BASE_URL = process.env.BLOB_BASE_URL
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable'

interface UploadAvatarParams {
  buffer: Buffer
  userId: string
  contentType: string
}

export async function uploadAvatarToBlob({ buffer, userId, contentType }: UploadAvatarParams): Promise<string> {
  if (!BLOB_STORE_ID || !BLOB_BASE_URL || !BLOB_READ_WRITE_TOKEN) {
    throw new Error('Vercel Blob configuration is incomplete')
  }

  const extension = contentType.split('/')[1] ?? 'webp'
  const fileName = `avatars/${userId}-${Date.now()}.${extension}`

  const blob = await put(fileName, buffer, {
    access: 'public',
    contentType,
    token: BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  })

  if (!blob.url) {
    throw new Error('Vercel Blob did not return a URL')
  }

  return blob.url
}

export async function deleteAvatarFromBlob(url?: string | null): Promise<void> {
  if (!url) {
    return
  }

  if (!BLOB_READ_WRITE_TOKEN) {
    throw new Error('Missing Vercel Blob read/write token')
  }

  try {
    await del(url, { token: BLOB_READ_WRITE_TOKEN })
  } catch (error) {
    console.error('Failed to delete avatar from Vercel Blob:', error)
  }
}

export function getBlobBaseUrl(): string {
  if (!BLOB_BASE_URL) {
    throw new Error('Missing Vercel Blob base URL')
  }

  return BLOB_BASE_URL
}

