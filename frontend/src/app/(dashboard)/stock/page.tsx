'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, X, ArrowDown, ArrowUp, SlidersHorizontal,
  ChevronLeft, ChevronRight, Layers, AlertTriangle,
  ArrowRight, PackagePlus, Pencil,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Part {
  id: string;
  partNumber: string;
  nameEn: string;
  minStock: number;
  category?: { nameEn: string };
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface StockLevel {
  id: string;
  partId: string;
  locationId: string;
  quantity: number;
  reservedQty: number;
  part: Part;
  location: Location;
}

interface StockMovement {
  id: string;
  partId: string;
  quantity: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
  notes: string | null;
  createdAt: string;
  part: { partNumber: string; nameEn: string } | null;
  fromLocation: { name: string } | null;
  toLocation: { name: string } | null;
  createdBy: { name: string } | null;
}

interface PageMeta { total: number; page: number; limit: number; totalPages: number }

// ── Schemas ───────────────────────────────────────────────────────────────────

const receiveSchema = z.object({
  partId: z.string().uuid('Select a part'),
  locationId: z.string().uuid('Select a location'),
  quantity: z.coerce.number().int('Must be a whole number').min(1, 'Quantity must be at least 1'),
  notes: z.string().max(500).optional().or(z.literal('')),
});
type ReceiveForm = z.infer<typeof receiveSchema>;

const adjustSchema = z.object({
  partId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.coerce.number().int('Must be a whole number').refine((v) => v !== 0, 'Cannot be zero'),
  notes: z.string().min(1, 'Notes are required for adjustments').max(500),
});
type AdjustForm = z.infer<typeof adjustSchema>;

// ── API ───────────────────────────────────────────────────────────────────────

const fetchLevels = (q: string): Promise<StockLevel[]> =>
  api.get('/v1/stock/levels', { params: q ? { q } : {} }).then((r) => r.data.data);

const fetchMovements = (page: number): Promise<{ items: StockMovement[]; meta: PageMeta }> =>
  api.get('/v1/stock/movements', { params: { page, limit: 50 } }).then((r) => r.data.data);

const fetchParts = (): Promise<{ items: Part[] }> =>
  api.get('/v1/parts', { params: { limit: 500 } }).then((r) => r.data.data);

const fetchLocations = (): Promise<Location[]> =>
  api.get('/v1/locations').then((r) => r.data.data);

// ── Movement type config ──────────────────────────────────────────────────────

const MOVE_TYPE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  in:         { label: 'Received',   color: 'bg-green-100 text-green-700',  icon: ArrowDown },
  out:        { label: 'Issued',     color: 'bg-red-100 text-red-700',      icon: ArrowUp },
  adjustment: { label: 'Adjustment', color: 'bg-amber-100 text-amber-700',  icon: SlidersHorizontal },
  transfer:   { label: 'Transfer',   color: 'bg-blue-100 text-blue-700',    icon: ArrowRight },
  return:     { label: 'Return',     color: 'bg-purple-100 text-purple-700', icon: ArrowDown },
};

function MoveBadge({ type }: { type: string }) {
  const cfg = MOVE_TYPE[type] ?? { label: type, color: 'bg-gray-100 text-gray-600', icon: Layers };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Part Combobox ─────────────────────────────────────────────────────────────

function PartCombobox({
  parts,
  isLoading,
  isError,
  value,
  onChange,
  error,
}: {
  parts: Part[];
  isLoading: boolean;
  isError?: boolean;
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selected = parts.find((p) => p.id === value) ?? null;

  const filtered = parts.filter(
    (p) =>
      !search ||
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.partNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (p: Part) => {
    onChange(p.id);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
    setOpen(true);
  };

  return (
    <div className="relative">
      {/* Trigger / search input */}
      {selected && !open ? (
        <div className="flex items-center justify-between field-input cursor-pointer" onClick={() => setOpen(true)}>
          <div>
            <span className="font-medium text-gray-900">{selected.nameEn}</span>
            <span className="ml-2 text-xs text-gray-400 font-mono">{selected.partNumber}</span>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            autoFocus={open}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={isLoading ? 'Loading parts…' : 'Search by name or part number…'}
            className="field-input pl-9"
          />
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-400">Loading parts…</div>
            ) : isError ? (
              <div className="px-4 py-3 text-sm text-red-500">Failed to load parts. Check that the backend is running.</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">
                {parts.length === 0
                  ? 'No parts found. Add parts at /parts first.'
                  : 'No matches for your search.'}
              </div>
            ) : (
              filtered.slice(0, 60).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-900 text-sm">{p.nameEn}</span>
                  <span className="ml-2 text-xs text-gray-400 font-mono">{p.partNumber}</span>
                  {p.category && (
                    <span className="ml-2 text-xs text-gray-400">· {p.category.nameEn}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Receive Stock Modal ───────────────────────────────────────────────────────

function ReceiveModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();

  const { data: partsData, isLoading: partsLoading, isError: partsError } = useQuery({
    queryKey: ['parts-all'],
    queryFn: fetchParts,
    retry: false,
  });
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  const allParts = partsData?.items ?? [];

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveForm>({ resolver: zodResolver(receiveSchema) });

  const selectedPartId = watch('partId') ?? '';

  const mut = useMutation({
    mutationFn: (data: ReceiveForm) => api.post('/v1/stock/receive', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock received successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to receive stock'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Receive Stock</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mut.mutate(d))}>
          <div className="px-6 py-5 space-y-4">
            {/* Part combobox */}
            <div>
              <label className="field-label">Part <span className="text-red-500">*</span></label>
              <input type="hidden" {...register('partId')} />
              <PartCombobox
                parts={allParts}
                isLoading={partsLoading}
                isError={partsError}
                value={selectedPartId}
                onChange={(id) => setValue('partId', id, { shouldValidate: true })}
                error={errors.partId?.message}
              />
            </div>

            {/* Location */}
            <div>
              <label className="field-label">Location <span className="text-red-500">*</span></label>
              <select {...register('locationId')} className="field-input">
                <option value="">— Select location —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.type})
                  </option>
                ))}
              </select>
              {errors.locationId && <p className="mt-1 text-xs text-red-500">{errors.locationId.message}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="field-label">Quantity <span className="text-red-500">*</span></label>
              <input
                {...register('quantity')}
                type="number"
                min="1"
                className="field-input"
                placeholder="e.g. 10"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="field-label">Notes</label>
              <input
                {...register('notes')}
                className="field-input"
                placeholder="e.g. PO-2025-001 delivery"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={mut.isPending || isSubmitting}>
              {mut.isPending ? 'Saving…' : 'Receive Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Adjust Stock Modal ────────────────────────────────────────────────────────

function AdjustModal({
  row,
  onClose,
}: {
  row: StockLevel;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      partId: row.partId,
      locationId: row.locationId,
      quantity: 0,
      notes: '',
    },
  });

  const mut = useMutation({
    mutationFn: (data: AdjustForm) => api.post('/v1/stock/adjust', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock adjusted successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to adjust stock'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mut.mutate(d))}>
          <div className="px-6 py-5 space-y-4">
            {/* Info card */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              <p className="font-medium text-gray-900">{row.part.nameEn}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {row.part.partNumber} · {row.location.name} · Current qty:{' '}
                <strong className="text-gray-700">{row.quantity}</strong>
              </p>
            </div>

            {/* Hidden fields */}
            <input type="hidden" {...register('partId')} />
            <input type="hidden" {...register('locationId')} />

            {/* Quantity */}
            <div>
              <label className="field-label">
                Adjustment <span className="text-red-500">*</span>
              </label>
              <input
                {...register('quantity')}
                type="number"
                className="field-input"
                placeholder="Use + to add, - to deduct (e.g. -3 or +5)"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Positive to add stock, negative to deduct. Cannot go below zero.
              </p>
            </div>

            {/* Notes — required for audit */}
            <div>
              <label className="field-label">
                Reason / Notes <span className="text-red-500">*</span>
              </label>
              <input
                {...register('notes')}
                className="field-input"
                placeholder="e.g. Damaged goods write-off, physical count correction"
              />
              {errors.notes && (
                <p className="mt-1 text-xs text-red-500">{errors.notes.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={mut.isPending || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {mut.isPending ? 'Saving…' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stock Levels Tab ──────────────────────────────────────────────────────────

function StockLevelsTab() {
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showReceive, setShowReceive] = useState(false);
  const [adjustRow, setAdjustRow] = useState<StockLevel | null>(null);

  const { data: levels = [], isLoading } = useQuery<StockLevel[]>({
    queryKey: ['stock-levels', q],
    queryFn: () => fetchLevels(q),
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const filtered = locationFilter
    ? levels.filter((l) => l.locationId === locationFilter)
    : levels;

  const lowStockCount = levels.filter(
    (l) => l.part.minStock > 0 && l.quantity <= l.part.minStock,
  ).length;

  const totalValue = levels.reduce(
    (sum, l) => sum + l.quantity,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Stock Rows</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{levels.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${lowStockCount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
            Low Stock Alerts
          </p>
          <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {lowStockCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Units in Stock</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQ(inputQ.trim()); } }}
            placeholder="Search part name, number, location…"
            className="field-input pl-9"
          />
        </div>
        <button
          onClick={() => { setQ(inputQ.trim()); }}
          className="btn-primary"
        >
          Search
        </button>
        {(q || inputQ) && (
          <button onClick={() => { setInputQ(''); setQ(''); }} className="btn-secondary">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="field-input max-w-[200px]"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowReceive(true)} className="btn-primary">
          <PackagePlus className="w-4 h-4" />
          Receive Stock
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Part</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Part #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Reserved</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Available</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Layers className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-500">No stock found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Use "Receive Stock" to add inventory
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const available = row.quantity - row.reservedQty;
                  const isLow = row.part.minStock > 0 && row.quantity <= row.part.minStock;
                  const isOut = row.quantity === 0;
                  return (
                    <tr
                      key={row.id}
                      className={`group transition-colors ${
                        isOut
                          ? 'bg-red-50 hover:bg-red-100'
                          : isLow
                          ? 'bg-amber-50 hover:bg-amber-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{row.part.nameEn}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.part.partNumber}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {row.part.category?.nameEn ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.location.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{row.reservedQty}</td>
                      <td className={`px-4 py-3 text-right font-medium ${available < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {available}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <X className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setAdjustRow(row)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Adjust stock"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showReceive && <ReceiveModal onClose={() => setShowReceive(false)} />}
      {adjustRow && <AdjustModal row={adjustRow} onClose={() => setAdjustRow(null)} />}
    </div>
  );
}

// ── Movement History Tab ──────────────────────────────────────────────────────

function MovementHistoryTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ items: StockMovement[]; meta: PageMeta }>({
    queryKey: ['stock-movements', page],
    queryFn: () => fetchMovements(page),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Part</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">From → To</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Layers className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-500">No movements yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Receive stock to see history here
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('en-PK', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {m.part ? (
                        <div>
                          <p className="font-medium text-gray-900">{m.part.nameEn}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.part.partNumber}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{m.partId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <MoveBadge type={m.type} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {m.type === 'out' || (m.type === 'adjustment' && !m.toLocation)
                        ? <span className="text-red-600">−{m.quantity}</span>
                        : <span className="text-green-600">+{m.quantity}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div className="flex items-center gap-1">
                        <span>{m.fromLocation?.name ?? '—'}</span>
                        {(m.fromLocation || m.toLocation) && (
                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        <span>{m.toLocation?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px]">
                      <span className="truncate block">{m.notes ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {m.createdBy?.name ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - meta.page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        meta.page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page === meta.totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'levels' | 'history';

export default function StockPage() {
  const [tab, setTab] = useState<Tab>('levels');

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View inventory levels, receive stock, and track all movements
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([
          { key: 'levels', label: 'Stock Levels', icon: Layers },
          { key: 'history', label: 'Movement History', icon: SlidersHorizontal },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'levels' ? <StockLevelsTab /> : <MovementHistoryTab />}
    </div>
  );
}
