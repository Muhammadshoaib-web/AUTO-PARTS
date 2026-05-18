'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Plus, Search, ShoppingCart } from 'lucide-react';

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
  partially_refunded: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-600',
};

const methodColors: Record<string, string> = {
  cash: 'bg-green-50 text-green-600',
  card: 'bg-blue-50 text-blue-600',
  mobile_wallet: 'bg-purple-50 text-purple-600',
  credit: 'bg-orange-50 text-orange-600',
  split: 'bg-teal-50 text-teal-600',
};

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', search, page],
    queryFn: () =>
      api.get('/v1/sales', { params: { search: search || undefined, page, limit: 20 } })
        .then((r) => r.data.data),
  });

  const items: any[] = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta?.total ?? 0} total sales</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> New Sale
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search invoice…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Invoice', 'Customer', 'Date', 'Total', 'Paid', 'Method', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <SkeletonRows cols={7} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ShoppingCart size={32} className="text-gray-200" />
                      <p className="text-sm">No sales recorded yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{s.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-700">{s.customer?.name ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">PKR {Number(s.netTotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">PKR {Number(s.paidAmount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${methodColors[s.paymentMethod] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.paymentMethod?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.total > meta.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={page * meta.limit >= meta.total} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
        ))}</tr>
      ))}
    </>
  );
}
