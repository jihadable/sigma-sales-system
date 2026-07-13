import { Queue } from 'bullmq';

// Pakai connection options (bukan instance IORedis) supaya tidak bentrok dengan
// versi ioredis internal milik bullmq (masalah type duplication antar package).
const connectionOptions = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export interface ImportJobData {
  batchId: number;
  files: { daily?: string; mp?: string; produk?: string };
}

export const importQueue = new Queue<ImportJobData>('import-queue', { connection: connectionOptions });
export { connectionOptions as connection };
