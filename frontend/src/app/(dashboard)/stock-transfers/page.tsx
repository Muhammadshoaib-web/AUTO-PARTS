'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useToastStore } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { ArrowLeftRight, Plus, Package, MapPin } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface Part { id: string; nameEn: string; partNumber: string; }
interface Location { id: string; name: string; branchId: string | null; }
interface StockLevel { partId: string; locationId: string; quantity: number; part: Part; location: Location; }
interface Transfer {
  id: string;
  partId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  part: Part;
  fromLocation: Location;
  toLocation: Location;
}

interface TransferFormData {
  partId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
  notes: string;
}

function TransferModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { add } = useToastStore();
  const [form, setForm] = useState<TransferFormData>({
    partId: '', fromLocationId: '', toLocationId: '', quantity: '1', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: stockLevels = [] } = useQuery<StockLevel[]>({
    queryKey: ['stock-levels-all'],
    queryFn: () => api.get('/v1/stock/levels').then((r) => r.data.data),
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations-all'],
    queryFn: () => api.get('/v1/locations').then((r) => r.data.data),
  });

  const partsInStock = Array.from(
    new Map(stockLevels.map((s) => [s.partId, s.part])).values(),
  ).sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  const locationsWithStock = form.partId
    ? stockLevels.filter((s) => s.partId === form.partId && s.quantity > 0).map((s) => s.location)
    : [];

  const availableQty = form.partId && form.fromLocationId
    ? stockLevels.find((s) => s.partId === form.partId && s.locationId === form.fromLocationId)?.quantity ?? 0
    : 0;

  const destinationLocations = locations.filter(
    (l) => l.id !== form.fromLocationId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantity, 10);
    if (!form.partId || !form.fromLocationId || !form.toLocationId || isNaN(qty) || qty < 1) return;
    setSaving(true);
    try {
      await api.post('/v1/stock-transfers', {
        partId: form.partId,
        fromLocationId: form.fromLocationId,
        toLocationId: form.toLocationId,
        quantity: qty,
        notes: form.notes.trim() || undefined,
      });
      add('Stock transferred successfully.', 'success');
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      onClose();
    } catch (err: any) {
      add(err?.response?.data?.message ?? 'Transfer failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Transfer Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part *</label>
            <select
              value={form.partId}
              onChange={(e) => setForm((f) => ({ ...f, partId: e.target.value, fromLocationId: '', toLocationId: '' }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a part…</option>
              {partsInStock.map((p) => (
                <option key={p.id} value={p.id}>{p.nameEn} ({p.partNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Location *</label>
            <select
              value={form.fromLocationId}
              onChange={(e) => setForm((f) => ({ ...f, fromLocationId: e.target.value, toLocationId: '' }))}
              required
              disabled={!form.partId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Select source location…</option>
              {locationsWithStock.map((l) => {
                const qty = stockLevels.find((s) => s.partId === form.partId && s.locationId === l.id)?.quantity ?? 0;
                return (
                  <option key={l.id} value={l.id}>{l.name} (Available: {qty})</option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Location *</label>
            <select
              value={form.toLocationId}
              onChange={(e) => setForm((f) => ({ ...f, toLocationId: e.target.value }))}
              required
              disabled={!form.fromLocationId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Select destination…</option>
              {destinationLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity * {availableQty > 0 && <span className="text-gray-400 font-normal">(max {availableQty})</span>}
            </label>
            <input
              type="number"
              min={1}
              max={availableQty || undefined}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.partId || !form.fromLocationId || !form.toLocationId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockTransfersPage() {
  const { user } = useAuthStore();
  const { activeBranchId } = useBranchStore();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  const effectiveBranchId = user?.branchId ?? activeBranchId ?? undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', page, effectiveBranchId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (effectiveBranchId) params.set('branchId', effectiveBranchId);
      return api.get(`/v1/stock-transfers?${params}`).then((r) => r.data.data);
    },
  });

  const transfers: Transfer[] = data?.items ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Move inventory between locations or branches</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Transfer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading transfers…</div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16">
            <ArrowLeftRight size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">No transfers yet</p>
            <p className="text-sm text-gray-500 mt-1">Create a transfer to move stock between locations</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Part</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">To</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{t.part?.nameEn ?? '—'}</p>
                          <p className="text-xs text-gray-400">{t.part?.partNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin size={13} className="text-red-400 flex-shrink-0" />
                        {t.fromLocation?.name ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin size={13} className="text-green-500 flex-shrink-0" />
                        {t.toLocation?.name ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{t.quantity}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {fmtDate(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={20}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {showModal && <TransferModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
