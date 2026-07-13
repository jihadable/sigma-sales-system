import { useEffect, useState } from 'react';
import { listBatches, downloadUrl, errorReportUrl, ImportBatch } from '../api/client';

const statusBadge: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function HistoryPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);

  useEffect(() => {
    listBatches().then(setBatches).catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">History Import</h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-3">Batch</th>
              <th className="p-3">File</th>
              <th className="p-3">Status</th>
              <th className="p-3">Total / Sukses / Error</th>
              <th className="p-3">Tanggal</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">#{b.id}</td>
                <td className="p-3 text-xs text-slate-500">
                  {[b.fileDailyName, b.fileMpName, b.fileProdukName].filter(Boolean).join(', ')}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[b.status]}`}>{b.status}</span>
                </td>
                <td className="p-3">{b.totalRows} / {b.successRows} / {b.errorRows}</td>
                <td className="p-3 text-xs text-slate-500">{new Date(b.createdAt).toLocaleString('id-ID')}</td>
                <td className="p-3 space-x-2">
                  {b.status === 'DONE' && (
                    <>
                      <a href={downloadUrl(b.id, 'finance')} className="text-brand hover:underline">Finance</a>
                      <a href={downloadUrl(b.id, 'marketing')} className="text-brand hover:underline">Marketing</a>
                      {b.errorRows > 0 && (
                        <a href={errorReportUrl(b.id)} className="text-red-500 hover:underline">Errors</a>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">Belum ada history import</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
