'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Plus, Search, Receipt } from 'lucide-react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', search, page],
    queryFn: () =>
      api.get('/v1/expenses', { params: { search: search || undefined, page, limit: 20 } })
        .then((r) => r.data.data),
  });

  const items: any[] = data?.items ?? [];
  const meta = data?.meta;

  const totalAmount = items.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta?.total ?? 0} records</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {items.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 inline-flex items-center gap-3">
          <Receipt size={18} className="text-red-500" />
          <div>
            <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Page Total</p>
            <p className="text-lg font-bold text-red-700">PKR {totalAmount.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search expenses…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['Category', 'Description', 'Amount', 'Date', 'Added By'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <SkeletonRows cols={5} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Receipt size={32} className="text-gray-200" />
                    <p className="text-sm">No expenses recorded yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">PKR {Number(e.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500">{e.createdBy?.name ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {meta && meta.total > meta.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{meta.total} records</span>
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
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
        ))}</tr>
      ))}
    </>
  );
}
