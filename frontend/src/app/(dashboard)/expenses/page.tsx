'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api/client';
import { useToastStore } from '@/store/toast.store';
import {
  Plus, X, Pencil, Trash2, Receipt, TrendingDown,
  Calendar, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  createdBy: { name: string } | null;
  createdAt: string;
};

type Summary = {
  monthly: { total: number; count: number };
  yearly: { total: number; count: number };
  byCategory: { category: string; total: number; count: number }[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const PRESET_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Fuel', 'Maintenance',
  'Marketing', 'Office Supplies', 'Transport', 'Insurance', 'Miscellaneous',
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent:             'bg-blue-100 text-blue-700',
  Utilities:        'bg-yellow-100 text-yellow-700',
  Salaries:         'bg-purple-100 text-purple-700',
  Fuel:             'bg-orange-100 text-orange-700',
  Maintenance:      'bg-cyan-100 text-cyan-700',
  Marketing:        'bg-pink-100 text-pink-700',
  'Office Supplies':'bg-indigo-100 text-indigo-700',
  Transport:        'bg-teal-100 text-teal-700',
  Insurance:        'bg-green-100 text-green-700',
  Miscellaneous:    'bg-gray-100 text-gray-600',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-red-100 text-red-700';
}

// ── Zod schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  category:    z.string().min(1, 'Category is required'),
  amount:      z.coerce.number().min(0.01, 'Amount must be > 0'),
  date:        z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── Expense Form Modal ─────────────────────────────────────────────────────

function ExpenseModal({
  initial, onClose,
}: {
  initial: Expense | null;
  onClose: () => void;
}) {
  const toast = useToastStore((s) => s.add);
  const qc = useQueryClient();
  const isEdit = !!initial;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category:    initial?.category ?? '',
      amount:      initial ? Number(initial.amount) : undefined,
      date:        initial?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      description: initial?.description ?? '',
    },
  });

  const selectedCategory = watch('category');

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit
        ? api.patch(`/v1/expenses/${initial!.id}`, data).then((r) => r.data)
        : api.post('/v1/expenses', data).then((r) => r.data),
    onSuccess: () => {
      toast(isEdit ? 'Expense updated!' : 'Expense added!', 'success');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      onClose();
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to save', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Category *
            </label>
            {/* Preset pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setValue('category', cat, { shouldValidate: true })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedCategory === cat
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              {...register('category')}
              placeholder="Or type a custom category..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Amount (PKR) *
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              {...register('amount')}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Date *
            </label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Optional note..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────

function DeleteModal({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const toast = useToastStore((s) => s.add);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/v1/expenses/${expense.id}`),
    onSuccess: () => {
      toast('Expense deleted.', 'success');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      onClose();
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to delete', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Delete Expense?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p className="font-medium text-gray-900">{expense.category}</p>
          <p className="text-red-600 font-bold">PKR {Number(expense.amount).toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-0.5">{new Date(expense.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {mutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, filterCategory, from, to],
    queryFn: () =>
      api.get('/v1/expenses', {
        params: {
          page, limit: 20,
          category: filterCategory || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      }).then((r) => r.data.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: () => api.get('/v1/expenses/summary').then((r) => r.data.data as Summary),
  });

  const expenses: Expense[] = data?.items ?? [];
  const meta = data?.meta;
  const summary = summaryData;

  const hasFilters = !!(filterCategory || from || to);
  const clearFilters = () => { setFilterCategory(''); setFrom(''); setTo(''); setPage(1); };

  const openAdd = () => { setEditTarget(null); setShowModal(true); };
  const openEdit = (e: Expense) => { setEditTarget(e); setShowModal(true); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track operational costs and overheads</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <Calendar size={16} className="text-red-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">This Month</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            PKR {(summary?.monthly.total ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">{summary?.monthly.count ?? 0} expenses</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
              <TrendingDown size={16} className="text-orange-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">This Year</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            PKR {(summary?.yearly.total ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">{summary?.yearly.count ?? 0} expenses</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <Receipt size={16} className="text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">Top Category</p>
          </div>
          {summary?.byCategory[0] ? (
            <>
              <p className="text-lg font-bold text-gray-900">{summary.byCategory[0].category}</p>
              <p className="text-xs text-gray-400 mt-1">
                PKR {summary.byCategory[0].total.toLocaleString()} this year
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>
      </div>

      {/* Category breakdown bar */}
      {summary && summary.byCategory.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Spending by Category (This Year)</p>
          <div className="space-y-2.5">
            {summary.byCategory.slice(0, 6).map((cat) => {
              const pct = summary.yearly.total > 0
                ? Math.round((cat.total / summary.yearly.total) * 100)
                : 0;
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{cat.category}</span>
                    <span className="text-gray-500">
                      PKR {cat.total.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setFilterCategory(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !filterCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setFilterCategory(cat === filterCategory ? '' : cat); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 ml-auto">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
            <input type="date" value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
            <input type="date" value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Added By</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : expenses.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No expenses found</p>
                    {!hasFilters && (
                      <button onClick={openAdd}
                        className="mt-3 text-blue-600 text-xs font-semibold hover:underline">
                        Add your first expense
                      </button>
                    )}
                  </td>
                </tr>
              )
              : expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">
                      {expense.description ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      PKR {Number(expense.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(expense.date).toLocaleDateString('en-PK', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {expense.createdBy?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(expense)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(expense)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Table footer: total + pagination */}
        {expenses.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm">
            <span className="text-gray-500">
              {meta?.total ?? 0} total ·{' '}
              <span className="font-semibold text-red-600">
                PKR {expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}
              </span>{' '}
              <span className="text-gray-400">on this page</span>
            </span>
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white">
                  <ChevronLeft size={15} />
                </button>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium text-xs">
                  {page} / {meta.totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white">
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ExpenseModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          expense={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
