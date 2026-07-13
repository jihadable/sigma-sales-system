import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_URL}/api` });

export interface ImportBatch {
  id: number;
  fileDailyName: string | null;
  fileMpName: string | null;
  fileProdukName: string | null;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  totalRows: number;
  successRows: number;
  errorRows: number;
  financeFilePath: string | null;
  marketingFilePath: string | null;
  createdAt: string;
}

export async function uploadFiles(files: { daily?: File; mp?: File; produk?: File }) {
  const form = new FormData();
  if (files.daily) form.append('daily', files.daily);
  if (files.mp) form.append('mp', files.mp);
  if (files.produk) form.append('produk', files.produk);
  const { data } = await api.post<{ batchId: number; status: string }>('/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getBatch(batchId: number) {
  const { data } = await api.get<ImportBatch>(`/import/${batchId}`);
  return data;
}

export async function listBatches() {
  const { data } = await api.get<ImportBatch[]>('/import');
  return data;
}

export function downloadUrl(batchId: number, type: 'finance' | 'marketing') {
  return `${API_URL}/api/import/${batchId}/download/${type}`;
}

export function errorReportUrl(batchId: number) {
  return `${API_URL}/api/import/${batchId}/errors/download`;
}

export async function getDashboardSummary(batchId?: number) {
  const { data } = await api.get('/dashboard/summary', { params: batchId ? { batchId } : {} });
  return data;
}
