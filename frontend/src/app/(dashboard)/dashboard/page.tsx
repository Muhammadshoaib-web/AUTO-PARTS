'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import {
  DollarSign, ShoppingCart, TrendingUp, Package,
  Users, AlertTriangle, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: summary } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => api.get('/v1/sales/daily-summary').then((r) => r.data.data),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () =>
      api.get('/v1/sales', { params: { limit: 6, page: 1 } }).then((r) => r.data.data),
  });

  const { data: lowStockParts } = useQuery({
    queryKey: ['low-stock-parts'],
    queryFn: () =>
      api.get('/v1/parts/low-stock').then((r) => r.data.data),
  });

  const avgSale =
    summary?.count > 0 ? Math.round((summary.total ?? 0) / summary.count) : 0;

  const stats = [
    {
      label: "Today's Revenue",
      value: `PKR ${Number(summary?.total ?? 0).toLocaleString()}`,
      sub: `${summary?.count ?? 0} transactions`,
      icon: DollarSign,
      bg: 'bg-blue-50',
      color: 'text-blue-600',
    },
    {
      label: 'Completed Sales',
      value: String(summary?.count ?? 0),
      sub: 'Today',
      icon: ShoppingCart,
      bg: 'bg-green-50',
      color: 'text-green-600',
    },
    {
      label: 'Total Discount',
      value: `PKR ${Number(summary?.discount ?? 0).toLocaleString()}`,
      sub: 'Applied today',
      icon: TrendingUp,
      bg: 'bg-purple-50',
      color: 'text-purple-600',
    },
    {
      label: 'Avg. Sale Value',
      value: `PKR ${avgSale.toLocaleString()}`,
      sub: 'Per transaction',
      icon: Package,
      bg: 'bg-orange-50',
      color: 'text-orange-600',
    },
  ];

  const quickActions = [
    { href: '/sales', label: 'New Sale', icon: ShoppingCart, bg: 'bg-blue-600' },
    { href: '/purchases', label: 'New Purchase', icon: Package, bg: 'bg-green-600' },
    { href: '/parts', label: 'Add Part', icon: Package, bg: 'bg-purple-600' },
    { href: '/customers', label: 'Add Customer', icon: Users, bg: 'bg-orange-600' },
    { href: '/suppliers', label: 'Add Supplier', icon: Users, bg: 'bg-teal-600' },
    { href: '/reports', label: 'View Reports', icon: TrendingUp, bg: 'bg-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome back, {user?.name?.split(' ')[0]}. Here&apos;s today&apos;s summary.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1.5">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Sales</h2>
            <Link
              href="/sales"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSales?.items?.length ? (
              recentSales.items.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.invoiceNo}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(sale.createdAt).toLocaleString('en-PK', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      PKR {Number(sale.netTotal).toLocaleString()}
                    </p>
                    <StatusBadge status={sale.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingCart size={32} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No sales today</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {quickActions.map(({ href, label, icon: Icon, bg }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
              >
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Low stock alert */}
      {(lowStockParts?.items?.length ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800 text-sm">Low Stock Alert</h3>
          </div>
          <div className="space-y-1">
            {lowStockParts.items.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700">{p.nameEn} ({p.partNumber})</span>
                <span className="font-medium text-amber-800">Reorder now</span>
              </div>
            ))}
          </div>
          <Link href="/parts" className="inline-flex items-center gap-1 mt-3 text-xs text-amber-700 hover:underline font-medium">
            Manage parts <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    draft: 'bg-gray-100 text-gray-600',
    refunded: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
