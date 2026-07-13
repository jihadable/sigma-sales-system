import { useState } from 'react';
import toast from 'react-hot-toast';
import { downloadUrl, errorReportUrl, uploadFiles } from '../api/client';
import ProgressBar from '../components/ProgressBar';
import UploadDropzone from '../components/UploadDropzone';
import { useImportProgress } from '../hooks/useSocket';

export default function UploadPage() {
  const [daily, setDaily] = useState<File | null>(null);
  const [mp, setMp] = useState<File | null>(null);
  const [produk, setProduk] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const progress = useImportProgress(batchId);

  const canSubmit = (daily || mp || produk) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { batchId: id } = await uploadFiles({ daily: daily ?? undefined, mp: mp ?? undefined, produk: produk ?? undefined });
      setBatchId(id);
      toast.success('File berhasil diupload, proses import dimulai');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Upload gagal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-1">Import Data Sales</h1>
      <p className="text-slate-500 mb-6 text-sm">
        Upload 1-3 file Excel (Sales Daily, Sales Marketplace, Sales Produk). Sistem akan memvalidasi,
        mentransformasi, dan menghasilkan 2 file output (Finance & Marketing) secara otomatis.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <UploadDropzone label="Sales Daily" file={daily} onChange={setDaily} />
        <UploadDropzone label="Sales Marketplace (MP)" file={mp} onChange={setMp} />
        <UploadDropzone label="Sales Produk" file={produk} onChange={setProduk} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 rounded-lg bg-brand text-white font-medium disabled:opacity-40 hover:bg-brand-dark transition-colors"
      >
        {submitting ? 'Mengupload...' : 'Mulai Import'}
      </button>

      {batchId && (
        <div className="mt-8 border rounded-xl p-5 bg-white shadow-sm">
          <h2 className="font-semibold mb-3">Batch #{batchId}</h2>
          <ProgressBar
            percent={progress?.percent ?? 0}
            stage={progress?.stage}
            status={progress?.status ?? 'PENDING'}
          />

          {progress?.status === 'DONE' && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-600">
                Total baris: {progress.totalRows} · Berhasil: {progress.successRows} · Error: {progress.errorRows}
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={downloadUrl(batchId, 'finance')} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white">
                  Download Finance.xlsx
                </a>
                <a href={downloadUrl(batchId, 'marketing')} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white">
                  Download Marketing.xlsx
                </a>
                {progress.errorRows! > 0 && (
                  <a href={errorReportUrl(batchId)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white">
                    Download Error Report
                  </a>
                )}
              </div>
            </div>
          )}

          {progress?.status === 'FAILED' && (
            <p className="mt-3 text-sm text-red-600">Proses gagal: {progress.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
