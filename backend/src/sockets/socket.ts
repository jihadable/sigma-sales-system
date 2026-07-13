import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import IORedis from 'ioredis';
import { PROGRESS_CHANNEL } from '../utils/progressPublisher';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer, corsOrigin: string) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // Client join room per batch supaya hanya menerima progress importnya sendiri
    socket.on('subscribe:batch', (batchId: number) => {
      socket.join(`batch:${batchId}`);
    });
  });

  // Subscribe ke Redis channel: progress bisa datang dari proses worker (BullMQ)
  // yang terpisah dari proses API server ini, lalu diteruskan ke client via socket.io.
  const subscriber = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
  subscriber.subscribe(PROGRESS_CHANNEL).catch((err) => console.error('Gagal subscribe Redis:', err));
  subscriber.on('message', (_channel, message) => {
    try {
      const payload = JSON.parse(message);
      io!.to(`batch:${payload.batchId}`).emit('import:progress', payload);
    } catch {
      // pesan tidak valid, abaikan
    }
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO belum diinisialisasi');
  return io;
}
