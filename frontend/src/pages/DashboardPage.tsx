import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getDashboardSummary } from '../api/client';

interface Summary {
  totalOrders: number;
  totalOmzet: number;
  totalHpp: number;
  totalQuantity: number;
  byPlatform: Array<{ platform: string | null; _count: { _all: number } }>;
  byAdvertiser: Array<{ advertiser: string | null; _count: { _all: number } }>;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => {});
  }, []);

  if (!summary) return <div className="p-10 text-center text-slate-400">Memuat data...</div>;

  const cards = [
    { label: 'Total Order', value: summary.totalOrders.toLocaleString('id-ID') },
    { label: 'Total Omzet', value: formatRupiah(summary.totalOmzet) },
    { label: 'Total HPP', value: formatRupiah(summary.totalHpp) },
    { label: 'Total Qty Terjual', value: summary.totalQuantity.toLocaleString('id-ID') },
  ];

  const platformData = summary.byPlatform.map((p) => ({ name: p.platform ?? 'N/A', total: p._count._all }));
  const advertiserData = summary.byAdvertiser.map((a) => ({ name: a.advertiser ?? 'N/A', total: a._count._all }));

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard Summary</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4 border">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="text-lg font-semibold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border">
          <h2 className="font-medium mb-3 text-sm text-slate-600">Order per Platform</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border">
          <h2 className="font-medium mb-3 text-sm text-slate-600">Order per Advertiser</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={advertiserData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
