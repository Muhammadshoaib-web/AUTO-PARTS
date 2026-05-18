'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react';

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const { data: salesReport, isLoading: loadingSales } = useQuery({
    queryKey: ['report-sales', from, to],
    queryFn: () =>
      api.get('/v1/reports/sales', { params: { from, to } }).then((r) => r.data.data),
  });

  const { data: stockVal, isLoading: loadingStock } = useQuery({
    queryKey: ['report-stock'],
    queryFn: () => api.get('/v1/reports/stock-valuation').then((r) => r.data.data),
  });

  const { data: topSelling, isLoading: loadingTop } = useQuery({
    queryKey: ['report-top', from, to],
    queryFn: () =>
      api.get('/v1/reports/top-selling', { params: { from, to, limit: 10 } }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business analytics and insights</p>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Date Range:</span>
        <input
          type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sales summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `PKR ${Number(salesReport?.total ?? 0).toLocaleString()}`, icon: DollarSign, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Total Sales', value: String(salesReport?.count ?? 0), icon: BarChart3, bg: 'bg-green-50', color: 'text-green-600' },
          { label: 'Total Tax', value: `PKR ${Number(salesReport?.tax ?? 0).toLocaleString()}`, icon: TrendingUp, bg: 'bg-purple-50', color: 'text-purple-600' },
          { label: 'Stock Value', value: loadingStock ? '…' : `PKR ${Number(stockVal?.totalValue ?? 0).toLocaleString()}`, icon: Package, bg: 'bg-orange-50', color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5">{loadingSales ? '…' : s.value}</p>
              </div>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Selling */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top Selling Parts</h2>
          <p className="text-xs text-gray-400 mt-0.5">by quantity sold in selected period</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['#', 'Part', 'Part Number', 'Qty Sold', 'Revenue'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loadingTop ? (
              <SkeletonRows cols={5} />
            ) : (topSelling ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-gray-400">No data for this period</td>
              </tr>
            ) : (
              (topSelling ?? []).map((p: any, i: number) => (
                <tr key={p.partId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nameEn}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.partNumber}</td>
                  <td className="px-4 py-3 font-semibold text-blue-700">{p.totalQty}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">PKR {Number(p.totalRevenue).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
