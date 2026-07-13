interface Props {
  percent: number;
  stage?: string;
  status: string;
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-slate-400',
  PROCESSING: 'bg-brand',
  DONE: 'bg-green-500',
  FAILED: 'bg-red-500',
};

export default function ProgressBar({ percent, stage, status }: Props) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{stage ?? status}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${statusColor[status] ?? 'bg-brand'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
