import IORedis from 'ioredis';

const publisher = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const PROGRESS_CHANNEL = 'import:progress';

// Dipanggil dari import.service.ts. Karena proses berat (worker) dan API server
// adalah proses Node terpisah, progress diteruskan lewat Redis pub/sub, bukan
// panggil socket.io instance secara langsung (yang hanya ada di proses API).
export function publishProgress(batchId: number, payload: Record<string, unknown>) {
  publisher.publish(PROGRESS_CHANNEL, JSON.stringify({ batchId, ...payload })).catch(() => {
    // best-effort, jangan sampai gagal publish menghentikan proses import
  });
}
