import 'dotenv/config';
import { Worker } from 'bullmq';
import { connection, ImportJobData } from './import.queue';
import { runImport } from '../services/import.service';

// Worker proses terpisah dari API server (jalankan via `npm run worker`).
// Ini yang menangani file besar secara async via job queue, sesuai requirement:
// "File excel berukuran besar -> Proses async menggunakan job queue".
const worker = new Worker<ImportJobData>(
  'import-queue',
  async (job) => {
    console.log(`[worker] Memproses batch #${job.data.batchId}`);
    await runImport(job.data.batchId, job.data.files);
    console.log(`[worker] Selesai batch #${job.data.batchId}`);
  },
  { connection, concurrency: 2 },
);

worker.on('failed', (job, err) => {
  console.error(`[worker] Batch #${job?.data.batchId} gagal:`, err.message);
});

console.log('Import worker berjalan, menunggu job...');
