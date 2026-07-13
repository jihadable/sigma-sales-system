import { PrismaClient } from '@prisma/client';

// Singleton Prisma client (hindari koneksi berlebih saat hot-reload)
export const prisma = new PrismaClient();
