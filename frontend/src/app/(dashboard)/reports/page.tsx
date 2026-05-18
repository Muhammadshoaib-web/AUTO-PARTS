'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api/client';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  DollarSign, BarChart3, AlertTriangle, Warehouse,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => `PKR ${Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function yearStart() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        {trend === 'up' && <TrendingUp size={16} className="text-green-500" />}
        {trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab() {
  const [trendDays, setTrendDays] = useState(30);
  const trendFrom = daysAgo(trendDays - 1);
  const trendTo   = today();

  const { data: overview } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: () => api.get('/v1/reports/overview').then((r) => r.data.data),
  });

  const { data: trendData } = useQuery({
    queryKey: ['reports-trend', trendFrom, trendTo],
    queryFn: () =>
      api.get('/v1/reports/sales-trend', { params: { from: trendFrom, to: trendTo } })
        .then((r) => r.data.data as { date: string; revenue: number; orders: number }[]),
  });

  const { data: topPartsData } = useQuery({
    queryKey: ['reports-top-parts', monthStart(), today()],
    queryFn: () =>
      api.get('/v1/reports/top-parts', { params: { from: monthStart(), to: today(), limit: 5 } })
        .then((r) => r.data.data as { partName: string; partNumber: string; totalQty: number; totalRevenue: number }[]),
  });

  // Fill missing days with 0
  const chartData = useMemo(() => {
    if (!trendData) return { dates: [], revenues: [] };
    const map = new Map(trendData.map((r) => [r.date, r.revenue]));
    const dates: string[] = [];
    const revenues: number[] = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = daysAgo(i);
      dates.push(d);
      revenues.push(map.get(d) ?? 0);
    }
    return { dates, revenues };
  }, [trendData, trendDays]);

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    colors: ['#3b82f6'],
    xaxis: {
      categories: chartData.dates,
      labels: { rotate: -45, style: { fontSize: '10px' } },
      tickAmount: Math.min(trendDays, 10),
    },
    yaxis: { labels: { formatter: (v) => `${(v / 1000).toFixed(0)}k` } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
    grid: { borderColor: '#f3f4f6' },
    dataLabels: { enabled: false },
  };

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={fmt(overview?.today.revenue ?? 0)}
          sub={`${overview?.today.orders ?? 0} orders`}
          icon={DollarSign}
          color="bg-blue-50 text-blue-600"
          trend="up"
        />
        <KpiCard
          label="This Month Revenue"
          value={fmt(overview?.month.revenue ?? 0)}
          sub={`${overview?.month.orders ?? 0} orders`}
          icon={ShoppingCart}
          color="bg-green-50 text-green-600"
          trend="up"
        />
        <KpiCard
          label="Month Expenses"
          value={fmt(overview?.monthExpenses ?? 0)}
          icon={TrendingDown}
          color="bg-red-50 text-red-600"
          trend="down"
        />
        <KpiCard
          label="Gross Profit (Month)"
          value={fmt(overview?.grossProfitMonth ?? 0)}
          icon={TrendingUp}
          color={
            (overview?.grossProfitMonth ?? 0) >= 0
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600'
          }
        />
        <KpiCard
          label="Year Revenue"
          value={fmt(overview?.year.revenue ?? 0)}
          sub={`${overview?.year.orders ?? 0} orders`}
          icon={BarChart3}
          color="bg-purple-50 text-purple-600"
        />
        <KpiCard
          label="Month Purchases"
          value={fmt(overview?.monthPurchases ?? 0)}
          icon={Package}
          color="bg-orange-50 text-orange-600"
        />
        <KpiCard
          label="Stock Cost Value"
          value={fmt(overview?.stock.costValue ?? 0)}
          sub={`Retail: ${fmt(overview?.stock.retailValue ?? 0)}`}
          icon={Warehouse}
          color="bg-cyan-50 text-cyan-600"
        />
        <KpiCard
          label="Low Stock Items"
          value={String(overview?.lowStockCount ?? 0)}
          sub="at or below min level"
          icon={AlertTriangle}
          color={
            (overview?.lowStockCount ?? 0) > 0
              ? 'bg-amber-50 text-amber-600'
              : 'bg-gray-50 text-gray-400'
          }
        />
      </div>

      {/* Sales trend chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Sales Trend</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  trendDays === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {chartData.revenues.some((v) => v > 0) ? (
          <Chart
            type="area"
            height={220}
            options={chartOptions}
            series={[{ name: 'Revenue', data: chartData.revenues }]}
          />
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            No sales data in this period
          </div>
        )}
      </div>

      {/* Top selling parts (this month) */}
      {topPartsData && topPartsData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Selling Parts — This Month</h3>
          <div className="space-y-3">
            {topPartsData.map((p, i) => {
              const maxRev = topPartsData[0].totalRevenue;
              const pct = maxRev > 0 ? (p.totalRevenue / maxRev) * 100 : 0;
              return (
                <div key={p.partNumber}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-900">{p.partName}</span>
                      <span className="text-xs text-gray-400">{p.partNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{fmt(p.totalRevenue)}</span>
                      <span className="text-xs text-gray-400 ml-2">× {p.totalQty}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── P&L Tab ────────────────────────────────────────────────────────────────

function PLTab() {
  const [from, setFrom] = useState(monthStart());
  const [to,   setTo]   = useState(today());

  const { data, isLoading } = useQuery({
    queryKey: ['reports-pl', from, to],
    queryFn: () =>
      api.get('/v1/reports/profit-loss', { params: { from, to } })
        .then((r) => r.data.data as {
          revenue: number; cogs: number; grossProfit: number;
          expenses: number; netProfit: number;
          expenseBreakdown: { category: string; total: number }[];
        }),
    enabled: !!(from && to),
  });

  const rows = [
    { label: 'Revenue (Sales)',      value: data?.revenue ?? 0,      color: 'text-green-600',  bold: false },
    { label: 'Cost of Goods Sold',   value: -(data?.cogs ?? 0),      color: 'text-red-600',    bold: false },
    { label: 'Gross Profit',         value: data?.grossProfit ?? 0,  color: data?.grossProfit ?? 0 >= 0 ? 'text-emerald-700' : 'text-red-700', bold: true },
    { label: 'Operating Expenses',   value: -(data?.expenses ?? 0),  color: 'text-red-600',    bold: false },
    { label: 'Net Profit',           value: data?.netProfit ?? 0,    color: data?.netProfit ?? 0 >= 0 ? 'text-emerald-700' : 'text-red-700', bold: true },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Date range */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          {[
            { label: 'This Month', f: monthStart(), t: today() },
            { label: 'This Year',  f: yearStart(),  t: today() },
          ].map((p) => (
            <button key={p.label} onClick={() => { setFrom(p.f); setTo(p.t); }}
              className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* P&L Statement */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-900">Profit & Loss Statement</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(from).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' — '}
            {new Date(to).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rows.map((row) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-6 py-3.5 ${
                  row.bold ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`text-sm ${row.bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                  {row.label}
                </span>
                <span className={`text-sm font-semibold ${row.bold ? 'text-base' : ''} ${row.color}`}>
                  {row.value < 0 ? `- ${fmt(Math.abs(row.value))}` : fmt(row.value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expense breakdown */}
        {data?.expenseBreakdown && data.expenseBreakdown.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Expense Breakdown
            </p>
            <div className="space-y-2">
              {data.expenseBreakdown.map((e) => (
                <div key={e.category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{e.category}</span>
                  <span className="font-medium text-red-600">{fmt(e.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Top Parts Tab ──────────────────────────────────────────────────────────

function TopPartsTab() {
  const [from, setFrom] = useState(monthStart());
  const [to,   setTo]   = useState(today());

  const { data, isLoading } = useQuery({
    queryKey: ['reports-top-parts-full', from, to],
    queryFn: () =>
      api.get('/v1/reports/top-parts', { params: { from, to, limit: 20 } })
        .then((r) => r.data.data as { partName: string; partNumber: string; totalQty: number; totalRevenue: number }[]),
    enabled: !!(from && to),
  });

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ['#3b82f6'],
    xaxis: { labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f3f4f6' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {[
          { label: 'This Month', f: monthStart(), t: today() },
          { label: 'This Year',  f: yearStart(),  t: today() },
        ].map((p) => (
          <button key={p.label} onClick={() => { setFrom(p.f); setTo(p.t); }}
            className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse mb-3" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
          <BarChart3 size={36} className="mx-auto mb-2 opacity-30" />
          <p>No sales data in this period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue by Part</h3>
            <Chart
              type="bar"
              height={Math.max(200, data.length * 36)}
              options={{
                ...chartOptions,
                yaxis: { labels: { style: { fontSize: '11px' } } },
                xaxis: {
                  ...chartOptions.xaxis,
                  categories: data.map((p) => p.partName),
                },
              }}
              series={[{ name: 'Revenue', data: data.map((p) => p.totalRevenue) }]}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Part</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((p, i) => (
                  <tr key={p.partNumber} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.partName}</p>
                      <p className="text-xs text-gray-400">{p.partNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{p.totalQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(p.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stock Valuation Tab ────────────────────────────────────────────────────

function StockValuationTab() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['reports-stock-val'],
    queryFn: () =>
      api.get('/v1/reports/stock-valuation').then((r) => r.data.data as {
        items: { partName: string; partNumber: string; locationName: string; quantity: number; buyPrice: number; sellPrice: number; costValue: number; retailValue: number }[];
        totalCost: number; totalRetail: number; potentialMargin: number;
      }),
  });

  const items = data?.items ?? [];
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Cost Value</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(data?.totalCost ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">What you paid for current stock</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Retail Value</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(data?.totalRetail ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">What you can sell it for</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Potential Margin</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(data?.potentialMargin ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">If all stock is sold at retail</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Part</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Location</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Buy Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sell Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cost Value</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Retail Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Warehouse size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No stock on hand</p>
                  </td>
                </tr>
              ) : (
                pageItems.map((item, i) => (
                  <tr key={`${item.partNumber}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.partName}</p>
                      <p className="text-xs text-gray-400">{item.partNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{item.locationName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(item.buyPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(item.sellPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(item.costValue)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 hidden lg:table-cell">{fmt(item.retailValue)}</td>
                  </tr>
                ))
              )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(data?.totalCost ?? 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 hidden lg:table-cell">{fmt(data?.totalRetail ?? 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{items.length} items</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={15} />
              </button>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium text-xs">
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview'        },
  { id: 'pl',         label: 'Profit & Loss'   },
  { id: 'top-parts',  label: 'Top Parts'       },
  { id: 'stock-val',  label: 'Stock Valuation' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business intelligence across sales, expenses, stock and purchases</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab />}
      {tab === 'pl'        && <PLTab />}
      {tab === 'top-parts' && <TopPartsTab />}
      {tab === 'stock-val' && <StockValuationTab />}
    </div>
  );
}
