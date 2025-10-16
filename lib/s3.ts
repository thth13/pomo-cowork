import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const S3_REGION = process.env.S3_REGION
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const BUCKET_NAME = process.env.S3_BUCKET_NAME
const CLOUDFRONT_URL = 'https://dh5p0367pyzhh.cloudfront.net'

if (!S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY || !BUCKET_NAME) {
  console.error('Missing S3 configuration:', {
    hasRegion: !!S3_REGION,
    hasAccessKey: !!S3_ACCESS_KEY,
    hasSecretKey: !!S3_SECRET_ACCESS_KEY,
    hasBucket: !!BUCKET_NAME,
  })
}

const s3Client = new S3Client({
  region: S3_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: S3_ACCESS_KEY || '',
    secretAccessKey: S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
})

export interface GeneratePresignedUrlParams {
  userId: string
  fileType: string
}

export async function generatePresignedUrl({ userId, fileType }: GeneratePresignedUrlParams) {
  if (!S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY || !BUCKET_NAME) {
    throw new Error('S3 configuration is missing. Please check your environment variables.')
  }

  const fileExtension = fileType.split('/')[1]
  const fileName = `avatars/${userId}-${Date.now()}.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    ContentType: fileType,
  })

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 час
  })

  // Используем CloudFront URL для публичного доступа
  const fileUrl = `${CLOUDFRONT_URL}/${fileName}`

  return {
    presignedUrl,
    fileUrl,
    fileName,
  }
}

export function getPublicUrl(fileName: string): string {
  return `${CLOUDFRONT_URL}/${fileName}`
}

export async function uploadFileToS3(buffer: Buffer, userId: string, contentType: string): Promise<string> {
  if (!S3_REGION || !S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY || !BUCKET_NAME) {
    throw new Error('S3 configuration is missing. Please check your environment variables.')
  }

  const fileExtension = contentType.split('/')[1] || 'jpg'
  const fileName = `avatars/${userId}-${Date.now()}.${fileExtension}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)
  
  // Возвращаем CloudFront URL
  return `${CLOUDFRONT_URL}/${fileName}`
}

export async function deleteFileFromS3(fileUrl: string): Promise<boolean> {
  if (!fileUrl || !BUCKET_NAME) {
    return false
  }

  try {
    // Извлекаем путь файла из URL
    // Может быть CloudFront URL или прямой S3 URL
    let fileName: string

    if (fileUrl.includes(CLOUDFRONT_URL)) {
      fileName = fileUrl.replace(`${CLOUDFRONT_URL}/`, '')
    } else if (fileUrl.includes('.amazonaws.com/')) {
      fileName = fileUrl.split('.amazonaws.com/')[1]
    } else {
      // Если это просто путь
      fileName = fileUrl
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    })

    await s3Client.send(command)
    console.log(`Successfully deleted file: ${fileName}`)
    return true
  } catch (error) {
    console.error('Error deleting file from S3:', error)
    return false
  }
}
