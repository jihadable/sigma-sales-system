import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function UploadDropzone({ label, file, onChange }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) onChange(accepted[0]);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-brand bg-blue-50' : 'border-slate-300 hover:border-brand/60'}
        ${file ? 'bg-green-50 border-green-400' : ''}`}
    >
      <input {...getInputProps()} />
      <p className="font-medium text-sm text-slate-700">{label}</p>
      {file ? (
        <p className="mt-2 text-xs text-green-700 truncate">✓ {file.name}</p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Drag & drop file .xlsx atau klik untuk pilih</p>
      )}
    </div>
  );
}
