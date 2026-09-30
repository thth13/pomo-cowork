import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const getDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) return undefined
  const url = new URL(process.env.DATABASE_URL)
  // Keep each app process below the shared pooler's connection budget.
  // An explicit deployment setting takes precedence over this default.
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '3')
  }
  return url.toString()
}

const databaseUrl = getDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
