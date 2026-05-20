'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useToastStore } from '@/store/toast.store';
import {
  Search, X, Plus, Minus, Trash2, Eye, CheckCircle, XCircle,
  Truck, ChevronLeft, ChevronRight, Package, ShoppingBag,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

// ── Types ──────────────────────────────────────────────────────────────────

type Part = { id: string; partNumber: string; nameEn: string; buyPrice: number };

type Location = { id: string; name: string; type: string };

type Supplier = { id: string; name: string; phone: string | null };

type POItem = {
  partId: string; partName: string; partNumber: string;
  locationId: string; locationName: string;
  quantity: number; unitPrice: number; total: number;
};

type PurchaseDetail = {
  id: string; invoiceNo: string; supplierId: string;
  supplier: { id: string; name: string };
  date: string;
  total: number; discount: number; tax: number; netTotal: number; paidAmount: number;
  paymentMethod: string; notes: string | null; status: string;
  items: {
    id: string; partId: string;
    part: { nameEn: string; partNumber: string };
    locationId: string | null;
    location: { name: string } | null;
    quantity: number; unitPrice: number; total: number;
  }[];
  createdAt: string;
};

// ── Status helpers ─────────────────────────────────────────────────────────

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  pending:             { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending'   },
  received:            { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Received'  },
  partially_received:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Partial'   },
  cancelled:           { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Cancelled' },
};

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
  { value: 'credit',        label: 'Credit' },
];

// ── PartCombobox ───────────────────────────────────────────────────────────

function PartCombobox({ onSelect }: { onSelect: (p: Part) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['parts-po-search', query],
    queryFn: () =>
      api.get('/v1/parts', { params: { q: query, limit: 50 } })
        .then((r) => r.data.data.items as Part[]),
    enabled: open,
  });
  const parts = data ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search part to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <p className="text-xs text-gray-400 px-3 py-2">Loading...</p>
          ) : parts.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No parts found</p>
          ) : (
            parts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm"
                onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
              >
                <div>
                  <p className="font-medium text-gray-900">{p.nameEn}</p>
                  <p className="text-xs text-gray-500">{p.partNumber}</p>
                </div>
                <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                  PKR {Number(p.buyPrice).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── SupplierCombobox ───────────────────────────────────────────────────────

function SupplierCombobox({
  value, onChange,
}: {
  value: { id: string; name: string } | null;
  onChange: (s: { id: string; name: string } | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['suppliers-po-search', query],
    queryFn: () =>
      api.get('/v1/suppliers', { params: { q: query, limit: 50 } })
        .then((r) => r.data.data.items as Supplier[]),
    enabled: open,
  });
  const suppliers = data ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-lg bg-blue-50">
          <Truck size={14} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium text-blue-900 flex-1">{value.name}</span>
          <button type="button" onClick={() => onChange(null)}>
            <X size={14} className="text-blue-400 hover:text-blue-600" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search supplier..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}
      {open && !value && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {suppliers.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No suppliers found</p>
          ) : (
            suppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm"
                onClick={() => { onChange({ id: s.id, name: s.name }); setQuery(''); setOpen(false); }}
              >
                <p className="font-medium text-gray-900">{s.name}</p>
                {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── PO Detail Modal ────────────────────────────────────────────────────────

function PODetailModal({
  purchase, onClose, onReceive, onCancel, receiving, cancelling,
}: {
  purchase: PurchaseDetail;
  onClose: () => void;
  onReceive: () => void;
  onCancel: () => void;
  receiving: boolean;
  cancelling: boolean;
}) {
  const ss = statusStyle[purchase.status] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: purchase.status };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 font-mono">{purchase.invoiceNo}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}>
                {ss.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {purchase.supplier?.name} · {new Date(purchase.date).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left pb-2">Part</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Unit Cost</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchase.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5">
                    <p className="font-medium text-gray-900">{item.part?.nameEn}</p>
                    <p className="text-xs text-gray-400">
                      {item.part?.partNumber}
                      {item.location ? ` · ${item.location.name}` : ''}
                    </p>
                  </td>
                  <td className="text-right py-2.5 text-gray-700">{item.quantity}</td>
                  <td className="text-right py-2.5 text-gray-700">
                    PKR {Number(item.unitPrice).toLocaleString()}
                  </td>
                  <td className="text-right py-2.5 font-semibold text-gray-900">
                    PKR {Number(item.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1.5 text-sm pt-3 border-t border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>PKR {Number(purchase.total).toLocaleString()}</span>
            </div>
            {Number(purchase.discount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- PKR {Number(purchase.discount).toLocaleString()}</span>
              </div>
            )}
            {Number(purchase.tax) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>+ PKR {Number(purchase.tax).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Net Total</span>
              <span>PKR {Number(purchase.netTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Paid ({purchase.paymentMethod})</span>
              <span>PKR {Number(purchase.paidAmount).toLocaleString()}</span>
            </div>
          </div>

          {purchase.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <span className="font-medium">Notes:</span> {purchase.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        {purchase.status === 'pending' && (
          <div className="p-6 border-t border-gray-100 flex gap-3">
            <button
              onClick={onReceive}
              disabled={receiving}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle size={16} />
              {receiving ? 'Receiving...' : 'Receive All Items'}
            </button>
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="flex items-center justify-center gap-2 px-5 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <XCircle size={16} />
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Tab ────────────────────────────────────────────────────────────

function HistoryTab() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [detailPO, setDetailPO] = useState<PurchaseDetail | null>(null);
  const toast = useToastStore((s) => s.add);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, from, to, status],
    queryFn: () =>
      api.get('/v1/purchases', {
        params: { page, limit: 20, from: from || undefined, to: to || undefined, status: status || undefined },
      }).then((r) => r.data.data),
  });

  const purchases: PurchaseDetail[] = data?.items ?? [];
  const meta = data?.meta;

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/v1/purchases/${id}/receive`).then((r) => r.data.data),
    onSuccess: (updated) => {
      toast('Purchase received — stock updated!', 'success');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      setDetailPO(updated as PurchaseDetail);
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to receive', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/v1/purchases/${id}/cancel`).then((r) => r.data.data),
    onSuccess: (updated) => {
      toast('Purchase order cancelled', 'success');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setDetailPO(updated as PurchaseDetail);
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to cancel', 'error'),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
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
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {(from || to || status) && (
          <button
            onClick={() => { setFrom(''); setTo(''); setStatus(''); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Items</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Total</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : purchases.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No purchase orders found</p>
                  </td>
                </tr>
              )
              : purchases.map((po) => {
                  const ss = statusStyle[po.status] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: po.status };
                  return (
                    <tr key={po.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{po.invoiceNo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{po.supplier?.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{po.items?.length ?? 0} items</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        PKR {Number(po.netTotal).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}>
                          {ss.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailPO(po)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      {detailPO && (
        <PODetailModal
          purchase={detailPO}
          onClose={() => setDetailPO(null)}
          onReceive={() => receiveMutation.mutate(detailPO.id)}
          onCancel={() => cancelMutation.mutate(detailPO.id)}
          receiving={receiveMutation.isPending}
          cancelling={cancelMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Create PO Tab ──────────────────────────────────────────────────────────

function CreateTab() {
  const toast = useToastStore((s) => s.add);
  const qc = useQueryClient();

  const [items, setItems] = useState<POItem[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [itemLocationId, setItemLocationId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: locationsData } = useQuery({
    queryKey: ['locations-flat'],
    queryFn: () =>
      api.get('/v1/locations').then((r) => {
        const flat: Location[] = [];
        const walk = (nodes: any[], depth = 0) =>
          nodes.forEach((n) => {
            flat.push({ id: n.id, name: '  '.repeat(depth) + n.name, type: n.type });
            if (n.children?.length) walk(n.children, depth + 1);
          });
        const all: any[] = r.data.data ?? [];
        // only walk root nodes — prevents duplicates when children also appear at top level
        const roots = all.filter((n) => !n.parentId);
        walk(roots.length > 0 ? roots : all);
        return flat;
      }),
  });
  const locations: Location[] = locationsData ?? [];

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const netTotal = subtotal - discount + tax;

  const handlePartSelect = (p: Part) => {
    setSelectedPart(p);
    setItemUnitPrice(Number(p.buyPrice));
    setItemQty(1);
  };

  const handleAddItem = () => {
    if (!selectedPart) { toast('Select a part first', 'error'); return; }
    if (!itemLocationId) { toast('Select a destination location', 'error'); return; }
    const location = locations.find((l) => l.id === itemLocationId);
    const existing = items.findIndex((i) => i.partId === selectedPart.id && i.locationId === itemLocationId);
    if (existing >= 0) {
      setItems((prev) => prev.map((item, idx) =>
        idx === existing
          ? { ...item, quantity: item.quantity + itemQty, total: (item.quantity + itemQty) * item.unitPrice }
          : item,
      ));
    } else {
      setItems((prev) => [...prev, {
        partId: selectedPart.id,
        partName: selectedPart.nameEn,
        partNumber: selectedPart.partNumber,
        locationId: itemLocationId,
        locationName: location?.name?.trim() ?? '',
        quantity: itemQty,
        unitPrice: itemUnitPrice,
        total: itemQty * itemUnitPrice,
      }]);
    }
    setSelectedPart(null);
    setItemLocationId('');
    setItemQty(1);
    setItemUnitPrice(0);
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, quantity: qty, total: qty * item.unitPrice } : item,
    ));
  };

  const updatePrice = (idx: number, price: number) => {
    if (price < 0) return;
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, unitPrice: price, total: item.quantity * price } : item,
    ));
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/v1/purchases', payload).then((r) => r.data.data),
    onSuccess: () => {
      toast('Purchase order created!', 'success');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setItems([]);
      setSupplier(null);
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('CASH');
      setPaidAmount(0);
      setDiscount(0);
      setTax(0);
      setNotes('');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to create PO', 'error'),
  });

  const handleSubmit = () => {
    if (!supplier) { toast('Select a supplier', 'error'); return; }
    if (items.length === 0) { toast('Add at least one item', 'error'); return; }
    createMutation.mutate({
      supplierId: supplier.id,
      date,
      paymentMethod,
      paidAmount,
      discount,
      tax,
      notes: notes || undefined,
      items: items.map((i) => ({
        partId: i.partId, locationId: i.locationId,
        quantity: i.quantity, unitPrice: i.unitPrice,
      })),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left: Item Builder ── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Add item row */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Add Item</h3>
          <PartCombobox onSelect={handlePartSelect} />

          {selectedPart && (
            <div className="px-3 py-2.5 bg-blue-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">{selectedPart.nameEn}</p>
                <p className="text-xs text-blue-500">{selectedPart.partNumber}</p>
              </div>
              <button type="button" onClick={() => setSelectedPart(null)}>
                <X size={14} className="text-blue-400 hover:text-blue-600" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Destination Location</label>
              <select
                value={itemLocationId}
                onChange={(e) => setItemLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Quantity</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button type="button" onClick={() => setItemQty((q) => Math.max(1, q - 1))}
                  className="px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600">
                  <Minus size={14} />
                </button>
                <input
                  type="number" min={1} value={itemQty}
                  onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-2 py-2 text-center text-sm focus:outline-none"
                />
                <button type="button" onClick={() => setItemQty((q) => q + 1)}
                  className="px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Unit Cost (PKR)</label>
              <input
                type="number" min={0} value={itemUnitPrice}
                onChange={(e) => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            disabled={!selectedPart}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Plus size={15} /> Add to Order
          </button>
        </div>

        {/* Items table */}
        {items.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Part</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Location</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.partName}</p>
                      <p className="text-xs text-gray-400">{item.partNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{item.locationName}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => updateQty(idx, item.quantity - 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                          <Minus size={12} />
                        </button>
                        <input
                          type="number" min={1} value={item.quantity}
                          onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                          className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none"
                        />
                        <button onClick={() => updateQty(idx, item.quantity + 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number" min={0} value={item.unitPrice}
                        onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                        className="w-24 text-right border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      PKR {item.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeItem(idx)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 flex flex-col items-center text-gray-400">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No items added yet</p>
            <p className="text-xs mt-1">Search for a part above and add it to the order</p>
          </div>
        )}
      </div>

      {/* ── Right: PO Details ── */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Order Details</h3>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Supplier *</label>
            <SupplierCombobox value={supplier} onChange={setSupplier} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Purchase Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Amount Paid (PKR)</label>
            <input type="number" min={0} value={paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Discount (PKR)</label>
              <input type="number" min={0} value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Tax (PKR)</label>
              <input type="number" min={0} value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Optional notes..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Summary + Submit */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5 text-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- PKR {discount.toLocaleString()}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>+ PKR {tax.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
            <span>Net Total</span>
            <span>PKR {netTotal.toLocaleString()}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Paid</span>
              <span>PKR {paidAmount.toLocaleString()}</span>
            </div>
          )}
          {paidAmount > 0 && netTotal - paidAmount > 0 && (
            <div className="flex justify-between text-red-600 text-xs font-semibold">
              <span>Balance Due</span>
              <span>PKR {(netTotal - paidAmount).toLocaleString()}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || items.length === 0 || !supplier}
            className="w-full mt-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {createMutation.isPending
              ? 'Creating...'
              : `Create Purchase Order · PKR ${netTotal.toLocaleString()}`}
          </button>
          <p className="text-xs text-gray-400 text-center pt-1">
            Stock is added when you mark the order as &ldquo;Received&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const [tab, setTab] = useState<'create' | 'history'>('create');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create purchase orders and receive stock from suppliers
        </p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['create', 'history'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {id === 'create' ? 'New Order' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'create' ? <CreateTab /> : <HistoryTab />}
    </div>
  );
}
