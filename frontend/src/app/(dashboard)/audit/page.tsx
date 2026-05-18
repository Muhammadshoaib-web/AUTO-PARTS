'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import {
  Shield, Search, X, ChevronDown, ChevronRight,
  Calendar, Filter, RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type AuditLog = {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

// ── Action badge colours ───────────────────────────────────────────────────

const ACTION_STYLE: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100   text-blue-700',
  DELETE: 'bg-red-100    text-red-700',
  LOGIN:  'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100   text-gray-600',
};

function actionStyle(action: string) {
  return ACTION_STYLE[action.toUpperCase()] ?? 'bg-amber-100 text-amber-700';
}

// ── JSON diff viewer ───────────────────────────────────────────────────────

function DiffViewer({ oldData, newData }: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  if (!oldData && !newData) return <p className="text-xs text-gray-400 italic">No data captured</p>;

  const keys = Array.from(new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ])).filter((k) => !['password', 'refreshTokenHash'].includes(k));

  if (keys.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {oldData && (
          <div>
            <p className="text-xs font-semibold text-red-600 mb-1.5">Before</p>
            <pre className="bg-red-50 rounded-lg p-3 text-xs text-gray-700 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(oldData, null, 2)}
            </pre>
          </div>
        )}
        {newData && (
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-1.5">After</p>
            <pre className="bg-emerald-50 rounded-lg p-3 text-xs text-gray-700 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(newData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  const changed = keys.filter(
    (k) => JSON.stringify(oldData?.[k]) !== JSON.stringify(newData?.[k]),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100">
            <th className="pb-1.5 pr-4 font-semibold w-32">Field</th>
            {oldData && <th className="pb-1.5 pr-4 font-semibold text-red-500">Before</th>}
            {newData && <th className="pb-1.5 font-semibold text-emerald-600">After</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {keys.map((key) => {
            const isChanged = changed.includes(key);
            const old = oldData?.[key];
            const nw  = newData?.[key];
            return (
              <tr key={key} className={isChanged ? 'bg-yellow-50' : ''}>
                <td className="py-1.5 pr-4 font-mono text-gray-500 font-medium">{key}</td>
                {oldData && (
                  <td className={`py-1.5 pr-4 font-mono ${isChanged ? 'text-red-600 line-through' : 'text-gray-600'}`}>
                    {old === undefined ? <span className="text-gray-300">—</span> : String(old)}
                  </td>
                )}
                {newData && (
                  <td className={`py-1.5 font-mono ${isChanged ? 'text-emerald-700 font-semibold' : 'text-gray-600'}`}>
                    {nw === undefined ? <span className="text-gray-300">—</span> : String(nw)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Expandable row ─────────────────────────────────────────────────────────

function LogRow({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);
  const hasData = log.oldData || log.newData;

  return (
    <>
      <tr
        className={`hover:bg-gray-50 transition-colors ${hasData ? 'cursor-pointer' : ''}`}
        onClick={() => hasData && setOpen((o) => !o)}
      >
        <td className="px-4 py-3 w-6 text-gray-300">
          {hasData
            ? open
              ? <ChevronDown size={14} className="text-blue-400" />
              : <ChevronRight size={14} />
            : null}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900 text-sm">{log.user?.name ?? <span className="text-gray-400 italic">System</span>}</p>
          {log.user && <p className="text-xs text-gray-400">{log.user.email}</p>}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionStyle(log.action)}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{log.resourceType.replace(/_/g, ' ')}</td>
        <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[140px] truncate" title={log.resourceId ?? ''}>
          {log.resourceId ?? '—'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-400">{log.ipAddress ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
        </td>
      </tr>
      {open && hasData && (
        <tr>
          <td colSpan={7} className="px-8 pb-4 pt-0 bg-gray-50 border-b border-gray-100">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <DiffViewer oldData={log.oldData} newData={log.newData} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 1 ? '80%' : j === 2 ? '60%' : '70%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [actionFilter, setActionFilter]       = useState('');
  const [resourceFilter, setResourceFilter]   = useState('');
  const [from, setFrom]               = useState('');
  const [to, setTo]                   = useState('');
  const [showFilters, setShowFilters] = useState(false);

  function resetFilters() {
    setSearch(''); setActionFilter(''); setResourceFilter('');
    setFrom(''); setTo(''); setPage(1);
  }

  const hasActiveFilter = !!(search || actionFilter || resourceFilter || from || to);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit', page, search, actionFilter, resourceFilter, from, to],
    queryFn: () =>
      api.get('/v1/audit', {
        params: {
          page,
          limit: 50,
          q:            search       || undefined,
          action:       actionFilter || undefined,
          resourceType: resourceFilter || undefined,
          from:         from || undefined,
          to:           to   || undefined,
        },
      }).then((r) => r.data.data),
  });

  const { data: metaData } = useQuery({
    queryKey: ['audit-meta'],
    queryFn: () => api.get('/v1/audit/meta').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const items: AuditLog[] = data?.items ?? [];
  const pagination: Meta | undefined = data?.meta;
  const actions: string[]       = metaData?.actions ?? [];
  const resourceTypes: string[] = metaData?.resourceTypes ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full system activity trail</p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <RefreshCw size={14} className="text-blue-400 animate-spin" />
          )}
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
              showFilters || hasActiveFilter
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            Filters
            {hasActiveFilter && (
              <span className="ml-1 bg-white/20 text-xs px-1 rounded">on</span>
            )}
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search user, action..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action */}
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Resource type */}
            <select
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Resources</option>
              {resourceTypes.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            {/* Reset */}
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilter}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <X size={14} /> Clear Filters
            </button>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar size={14} className="text-gray-400" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      {pagination && (
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>
            {pagination.total.toLocaleString()} event{pagination.total !== 1 ? 's' : ''} total
          </span>
          {hasActiveFilter && (
            <span className="text-blue-600 font-medium">· filtered</span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-100">
                <th className="px-4 py-3 w-6" />
                {['User', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Date & Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <SkeletonRows />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Shield size={36} className="text-gray-200" />
                      <p className="text-sm font-medium">No audit events found</p>
                      {hasActiveFilter && (
                        <button onClick={resetFilters} className="text-xs text-blue-500 hover:underline mt-1">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
              <span className="ml-2 text-gray-400">({pagination.total.toLocaleString()} total)</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Prev
              </button>
              {/* page numbers — show at most 5 around current */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
                return start + i;
              }).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 py-1 rounded-lg text-xs border transition-colors ${
                    p === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={page === pagination.totalPages}
                className="px-2 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-400 text-center">
        Click any row with a &gt; indicator to expand and view data changes
      </p>
    </div>
  );
}
