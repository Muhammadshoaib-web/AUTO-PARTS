'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api/client';
import { useToastStore } from '@/store/toast.store';
import {
  BookOpen, Search, X, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, Building2, UserCircle,
  CreditCard, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

// ── Types ──────────────────────────────────────────────────────────────────

type Summary = {
  totalPayables: number;
  totalReceivables: number;
  netPosition: number;
};

type SupplierRow = {
  id: string; name: string; phone: string | null;
  email: string | null; ntn: string | null;
  balance: number; isActive: boolean;
};

type CustomerRow = {
  id: string; name: string; phone: string | null;
  email: string | null; ntn: string | null; cnic: string | null;
  discountSlab: number; creditLimit: number;
  balance: number; isActive: boolean;
};

type LedgerEntry = {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  referenceType: string;
  referenceId: string | null;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

// ── Helpers ────────────────────────────────────────────────────────────────

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(n);

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  notes:  z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string;
  color: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Payment modal ──────────────────────────────────────────────────────────

function PaymentModal({
  entityType, entityId, entityName, currentBalance, onClose,
}: {
  entityType: 'supplier' | 'customer';
  entityId: string;
  entityName: string;
  currentBalance: number;
  onClose: () => void;
}) {
  const toast = useToastStore((s) => s.add);
  const qc    = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: PaymentForm) =>
      api.post(`/v1/ledger/${entityType}s/${entityId}/payment`, data).then((r) => r.data),
    onSuccess: () => {
      toast('Payment recorded!', 'success');
      qc.invalidateQueries({ queryKey: ['ledger-summary'] });
      qc.invalidateQueries({ queryKey: ['ledger-entities'] });
      qc.invalidateQueries({ queryKey: ['ledger-entries', entityType, entityId] });
      onClose();
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to record payment', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
            <p className="text-sm text-gray-500 mt-0.5">{entityName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="bg-amber-50 rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-amber-700 font-medium">Outstanding balance</span>
            <span className="font-bold text-amber-800">{pkr(currentBalance)}</span>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Payment Amount (PKR) *
            </label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Notes (optional)
            </label>
            <input
              {...register('notes')}
              placeholder="e.g. Cheque #1234"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ledger trail modal ─────────────────────────────────────────────────────

function LedgerModal({
  entityType,
  entity,
  onClose,
}: {
  entityType: 'supplier' | 'customer';
  entity: SupplierRow | CustomerRow;
  onClose: () => void;
}) {
  const [page, setPage]         = useState(1);
  const [showPayment, setShowPayment] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['ledger-entries', entityType, entity.id, page],
    queryFn: () =>
      api.get(`/v1/ledger/${entityType}s/${entity.id}/entries`, { params: { page, limit: 20 } })
        .then((r) => r.data.data),
  });

  const entries: LedgerEntry[] = data?.items ?? [];
  const meta: Meta | undefined = data?.meta;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                entityType === 'supplier' ? 'bg-orange-100' : 'bg-blue-100'
              }`}>
                {entityType === 'supplier'
                  ? <Building2 size={18} className="text-orange-600" />
                  : <UserCircle size={18} className="text-blue-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{entity.name}</h2>
                <p className="text-sm text-gray-500">{entity.phone ?? entity.email ?? '—'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
          </div>

          {/* Balance strip */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {entityType === 'supplier' ? 'Outstanding Payable' : 'Outstanding Receivable'}
              </p>
              <p className={`text-xl font-bold mt-0.5 ${
                entity.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {pkr(entity.balance)}
                {entity.balance === 0 && (
                  <span className="ml-2 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Settled
                  </span>
                )}
              </p>
            </div>
            {entity.balance > 0 && (
              <button
                onClick={() => setShowPayment(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <CreditCard size={15} />
                Record Payment
              </button>
            )}
          </div>

          {/* Entries table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  {['Date', 'Type', 'Reference', 'Amount', 'Balance After', 'Notes'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No transactions yet</p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          entry.type === 'debit'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {entry.type === 'debit'
                            ? <ArrowUpRight size={11} />
                            : <ArrowDownLeft size={11} />}
                          {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {entry.referenceType.replace(/_/g, ' ')}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${
                        entry.type === 'debit' ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {entry.type === 'debit' ? '+' : '-'}{pkr(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {pkr(entry.balanceAfter)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate" title={entry.notes ?? ''}>
                        {entry.notes ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          entityType={entityType}
          entityId={entity.id}
          entityName={entity.name}
          currentBalance={entity.balance}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}

// ── Entity list table ──────────────────────────────────────────────────────

function EntityTable({
  entityType,
  search,
}: {
  entityType: 'supplier' | 'customer';
  search: string;
}) {
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState<SupplierRow | CustomerRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ledger-entities', entityType, search, page],
    queryFn: () =>
      api.get(`/v1/ledger/${entityType}s`, { params: { q: search || undefined, page, limit: 30 } })
        .then((r) => r.data.data),
  });

  const items: (SupplierRow | CustomerRow)[] = data?.items ?? [];
  const meta: Meta | undefined = data?.meta;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
            {entityType === 'customer' && (
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit Limit</th>
            )}
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: entityType === 'customer' ? 6 : 5 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={entityType === 'customer' ? 6 : 5} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <BookOpen size={32} className="text-gray-200" />
                  <p className="text-sm">No records found</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.email && <p className="text-xs text-gray-400">{item.email}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500">{item.phone ?? '—'}</td>
                {entityType === 'customer' && (
                  <td className="px-4 py-3 text-gray-500">
                    {(item as CustomerRow).creditLimit > 0
                      ? pkr((item as CustomerRow).creditLimit)
                      : <span className="text-gray-300">—</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`font-bold text-sm ${
                    item.balance > 0 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {pkr(item.balance)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.balance > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      Outstanding
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      Settled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(item)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    View Ledger
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
        />
      )}

      {selected && (
        <LedgerModal
          entityType={entityType}
          entity={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [tab, setTab]       = useState<'supplier' | 'customer'>('supplier');
  const [search, setSearch] = useState('');

  const { data: summaryData } = useQuery({
    queryKey: ['ledger-summary'],
    queryFn: () => api.get('/v1/ledger/summary').then((r) => r.data.data as Summary),
    staleTime: 30_000,
  });

  const summary: Summary = summaryData ?? { totalPayables: 0, totalReceivables: 0, netPosition: 0 };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track payables and receivables</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Payables"
          value={pkr(summary.totalPayables)}
          sub="Amount we owe to suppliers"
          color="bg-orange-500"
          icon={TrendingUp}
        />
        <StatCard
          label="Total Receivables"
          value={pkr(summary.totalReceivables)}
          sub="Amount customers owe us"
          color="bg-blue-500"
          icon={TrendingDown}
        />
        <StatCard
          label="Net Position"
          value={pkr(Math.abs(summary.netPosition))}
          sub={summary.netPosition >= 0 ? 'Net receivable (favourable)' : 'Net payable (unfavourable)'}
          color={summary.netPosition >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
          icon={Minus}
        />
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setTab('supplier'); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'supplier'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 size={15} /> Suppliers (Payables)
          </button>
          <button
            onClick={() => { setTab('customer'); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'customer'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCircle size={15} /> Customers (Receivables)
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}s...`}
            className="pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Entity table */}
      <EntityTable key={tab} entityType={tab} search={search} />
    </div>
  );
}
