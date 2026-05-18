'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Layers, Search } from 'lucide-react';

export default function StockPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', search, page],
    queryFn: () =>
      api.get('/v1/stock/movements', { params: { search: search || undefined, page, limit: 20 } })
        .then((r) => r.data.data),
  });

  const items: any[] = data?.items ?? [];

  const typeColors: Record<string, string> = {
    in: 'bg-green-100 text-green-700',
    out: 'bg-red-100 text-red-700',
    transfer: 'bg-blue-100 text-blue-700',
    adjustment: 'bg-yellow-100 text-yellow-700',
    return: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stock movements history</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search movements…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Part', 'Type', 'Qty', 'From', 'To', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <SkeletonRows cols={6} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Layers size={32} className="text-gray-200" />
                      <p className="text-sm">No stock movements yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.part?.nameEn ?? m.partId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[m.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{m.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{m.fromLocation?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.toLocation?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.total > data.meta.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>Total: {data.meta.total} movements</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={page * data.meta.limit >= data.meta.total} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
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
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}
