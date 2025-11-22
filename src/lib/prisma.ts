// Using runtime require to avoid bundler issues with ESM imports
const prismaModule = require('@prisma/client') as typeof import('@prisma/client')
const PrismaClient: typeof import('@prisma/client').PrismaClient = prismaModule.PrismaClient

let prismaInstance: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance

  const globalForPrisma = globalThis as unknown as { prisma?: InstanceType<typeof PrismaClient> }
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance
  return prismaInstance
}
