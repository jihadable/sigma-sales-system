import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../api/client';

export interface ProgressEvent {
  batchId: number;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  stage?: string;
  percent?: number;
  totalRows?: number;
  successRows?: number;
  errorRows?: number;
  message?: string;
}

export function useImportProgress(batchId: number | null) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!batchId) return;
    const socket = io(API_URL);
    socketRef.current = socket;
    socket.emit('subscribe:batch', batchId);
    socket.on('import:progress', (payload: ProgressEvent) => {
      if (payload.batchId === batchId) setProgress(payload);
    });
    return () => {
      socket.disconnect();
    };
  }, [batchId]);

  return progress;
}
