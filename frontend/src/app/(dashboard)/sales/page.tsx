'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2, Receipt,
  User, ChevronLeft, ChevronRight, CheckCircle, Printer,
  Ban, Eye, CreditCard, Banknote, Smartphone, Tag,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';
import { Pagination } from '@/components/ui/Pagination';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Part {
  id: string;
  partNumber: string;
  nameEn: string;
  sellPrice: number;
  category?: { nameEn: string };
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  discountSlab: number;
  creditLimit: number;
  balance: number;
}

interface CartItem {
  partId: string;
  partNumber: string;
  nameEn: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

interface SaleItem {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  total: number;
  part: { partNumber: string; nameEn: string };
}

interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  createdAt: string;
  total: number;
  discount: number;
  tax: number;
  netTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  status: string;
  customer: Customer | null;
  items: SaleItem[];
  createdBy: { name: string } | null;
}

interface PageMeta { total: number; page: number; limit: number; totalPages: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `PKR ${Number(n).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

const lineTotal = (item: CartItem) =>
  item.quantity * item.unitPrice * (1 - item.discountPct / 100);

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
};

const PAY_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  card: CreditCard,
  mobile_wallet: Smartphone,
  credit: Tag,
  split: Receipt,
};

// ── API ───────────────────────────────────────────────────────────────────────

const fetchPartsAll = (): Promise<{ items: Part[] }> =>
  api.get('/v1/parts', { params: { limit: 500 } }).then((r) => r.data.data);

const fetchCustomersAll = (): Promise<{ items: Customer[] }> =>
  api.get('/v1/customers', { params: { limit: 500 } }).then((r) => r.data.data);

const fetchSales = (page: number, from: string, to: string, status: string) =>
  api.get('/v1/sales', { params: { page, limit: 20, from: from || undefined, to: to || undefined, status: status || undefined } })
    .then<{ items: Sale[]; meta: PageMeta }>((r) => r.data.data);

const fetchSale = (id: string): Promise<Sale> =>
  api.get(`/v1/sales/${id}`).then((r) => r.data.data);

// ── Part Search Combobox ──────────────────────────────────────────────────────

function PartCombobox({ parts, isLoading, onSelect }: {
  parts: Part[];
  isLoading: boolean;
  onSelect: (p: Part) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = search.length > 0
    ? parts.filter(
        (p) =>
          p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
          p.partNumber.toLowerCase().includes(search.toLowerCase()),
      )
    : parts.slice(0, 30);

  const handleSelect = (p: Part) => {
    onSelect(p);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={isLoading ? 'Loading parts…' : 'Search part by name or number…'}
          className="field-input pl-9 text-sm"
        />
        {search && (
          <button onClick={() => { setSearch(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (search.length > 0 || filtered.length > 0) && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No parts match "{search}"</p>
            ) : (
              filtered.map((p) => (
                <button key={p.id} type="button" onClick={() => handleSelect(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{p.nameEn}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{p.partNumber}</span>
                    {p.category && <span className="ml-2 text-xs text-gray-400">· {p.category.nameEn}</span>}
                  </div>
                  <span className="text-sm font-semibold text-green-700 ml-4 flex-shrink-0">
                    {fmt(p.sellPrice)}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Customer Combobox ─────────────────────────────────────────────────────────

function CustomerCombobox({ customers, value, onChange }: {
  customers: Customer[];
  value: Customer | null;
  onChange: (c: Customer | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search),
  );

  if (value) {
    return (
      <div className="flex items-center justify-between field-input">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-700">{value.name[0]}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{value.name}</p>
            {value.phone && <p className="text-xs text-gray-400">{value.phone}</p>}
          </div>
        </div>
        <button onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Walk-in (no customer)"
          className="field-input pl-9 text-sm"
        />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <button onClick={() => { onChange(null); setSearch(''); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 text-sm text-gray-500 italic">
              Walk-in customer (no account)
            </button>
            {filtered.slice(0, 30).map((c) => (
              <button key={c.id} onClick={() => { onChange(c); setSearch(''); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                {c.phone && <span className="ml-2 text-xs text-gray-400">{c.phone}</span>}
                {Number(c.discountSlab) > 0 && (
                  <span className="ml-2 text-xs text-purple-600 font-medium">{c.discountSlab}% off</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({ sale, onNewSale, onClose }: {
  sale: Sale;
  onNewSale: () => void;
  onClose: () => void;
}) {
  const PayIcon = PAY_ICONS[sale.paymentMethod] ?? Receipt;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center py-6 px-6 border-b border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Sale Complete!</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{sale.invoiceNo}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(sale.createdAt).toLocaleString('en-PK')}
          </p>
        </div>

        {/* Items */}
        <div className="px-6 py-4 max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2">Item</th>
                <th className="text-center pb-2">Qty</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-1.5">
                    <p className="font-medium text-gray-800">{item.part.nameEn}</p>
                    <p className="text-xs text-gray-400">{fmt(item.unitPrice)} each
                      {Number(item.discountPct) > 0 && ` · ${item.discountPct}% off`}
                    </p>
                  </td>
                  <td className="text-center text-gray-600">{item.quantity}</td>
                  <td className="text-right font-medium text-gray-900">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-100 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{fmt(sale.total)}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span><span>- {fmt(sale.discount)}</span>
            </div>
          )}
          {Number(sale.tax) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax</span><span>+ {fmt(sale.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1">
            <span>Net Total</span><span>{fmt(sale.netTotal)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="px-6 py-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span className="flex items-center gap-1.5">
              <PayIcon className="w-4 h-4" />
              {sale.paymentMethod.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            <span>{fmt(sale.paidAmount)}</span>
          </div>
          {Number(sale.changeAmount) > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Change</span><span>{fmt(sale.changeAmount)}</span>
            </div>
          )}
          {sale.customer && (
            <div className="flex justify-between text-gray-500">
              <span>Customer</span><span className="font-medium">{sale.customer.name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={() => { window.print(); }}
            className="btn-secondary flex-1"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onNewSale} className="btn-primary flex-1">
            <Plus className="w-4 h-4" /> New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sale Detail Modal ─────────────────────────────────────────────────────────

function SaleDetailModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: sale, isLoading } = useQuery<Sale>({
    queryKey: ['sale', saleId],
    queryFn: () => fetchSale(saleId),
  });

  const cancelMut = useMutation({
    mutationFn: () => api.patch(`/v1/sales/${saleId}/cancel`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sale', saleId] });
      qc.invalidateQueries({ queryKey: ['stock-levels'] });
      toast.success('Sale cancelled and stock restored');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to cancel sale'),
  });

  const PayIcon = sale ? (PAY_ICONS[sale.paymentMethod] ?? Receipt) : Receipt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {sale?.invoiceNo ?? 'Loading…'}
            </h2>
            {sale && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(sale.createdAt).toLocaleString('en-PK')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sale ? (
          <div className="overflow-y-auto flex-1">
            {/* Status + customer */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[sale.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {sale.status}
              </span>
              <span className="text-sm text-gray-600">
                {sale.customer?.name ?? <span className="text-gray-400 italic">Walk-in</span>}
              </span>
            </div>

            {/* Items */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2">Part</th>
                    <th className="text-center pb-2">Qty</th>
                    <th className="text-right pb-2">Price</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-2">
                        <p className="font-medium text-gray-900">{item.part.nameEn}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.part.partNumber}
                          {Number(item.discountPct) > 0 && ` · ${item.discountPct}% off`}
                        </p>
                      </td>
                      <td className="text-center text-gray-700">{item.quantity}</td>
                      <td className="text-right text-gray-600">{fmt(item.unitPrice)}</td>
                      <td className="text-right font-semibold text-gray-900">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{fmt(sale.total)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span><span>- {fmt(sale.discount)}</span>
                </div>
              )}
              {Number(sale.tax) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span><span>+ {fmt(sale.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1.5">
                <span>Net Total</span><span>{fmt(sale.netTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <PayIcon className="w-4 h-4" />
                  {sale.paymentMethod.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <span>{fmt(sale.paidAmount)}</span>
              </div>
              {Number(sale.changeAmount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Change</span><span>{fmt(sale.changeAmount)}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {sale && sale.status === 'completed' && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <button
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Ban className="w-4 h-4" />
              {cancelMut.isPending ? 'Cancelling…' : 'Cancel Sale'}
            </button>
          </div>
        )}
        {(!sale || sale.status !== 'completed') && (
          <div className="px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── POS Tab ───────────────────────────────────────────────────────────────────

function POSTab() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderTax, setOrderTax] = useState(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: ['parts-all'],
    queryFn: fetchPartsAll,
    retry: false,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: fetchCustomersAll,
    retry: false,
  });

  const parts = partsData?.items ?? [];
  const customers = customersData?.items ?? [];

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const netTotal = Math.max(0, subtotal - orderDiscount + orderTax);
  const paid = parseFloat(paidAmount) || 0;
  const change = payMethod === 'cash' ? Math.max(0, paid - netTotal) : 0;

  const addToCart = useCallback((part: Part) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.partId === part.id);
      if (existing) {
        return prev.map((i) =>
          i.partId === part.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      const discountPct = customer ? Number(customer.discountSlab) : 0;
      return [...prev, {
        partId: part.id,
        partNumber: part.partNumber,
        nameEn: part.nameEn,
        quantity: 1,
        unitPrice: Number(part.sellPrice),
        discountPct,
      }];
    });
  }, [customer]);

  const updateItem = (partId: string, field: 'quantity' | 'unitPrice' | 'discountPct', value: number) => {
    setCart((prev) => prev.map((i) => i.partId === partId ? { ...i, [field]: value } : i));
  };

  const removeItem = (partId: string) => setCart((prev) => prev.filter((i) => i.partId !== partId));

  const handleCustomerChange = (c: Customer | null) => {
    setCustomer(c);
    if (c && Number(c.discountSlab) > 0) {
      setCart((prev) => prev.map((i) => ({ ...i, discountPct: Number(c.discountSlab) })));
    }
  };

  const createMut = useMutation({
    mutationFn: () => api.post('/v1/sales', {
      customerId: customer?.id,
      discount: orderDiscount,
      tax: orderTax,
      paymentMethod: payMethod,
      paidAmount: payMethod === 'cash' ? paid : netTotal,
      items: cart.map((i) => ({
        partId: i.partId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPct: i.discountPct,
      })),
    }).then((r) => r.data.data as Sale),
    onSuccess: (sale) => {
      setCompletedSale(sale);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to complete sale'),
  });

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setOrderDiscount(0);
    setOrderTax(0);
    setPaidAmount('');
    setPayMethod('cash');
    setCompletedSale(null);
  };

  const canComplete = cart.length > 0 && (payMethod !== 'cash' || paid >= netTotal);

  const payMethods = [
    { key: 'cash', label: 'Cash', icon: Banknote },
    { key: 'card', label: 'Card', icon: CreditCard },
    { key: 'mobile_wallet', label: 'Mobile', icon: Smartphone },
    { key: 'credit', label: 'Credit', icon: Tag },
  ];

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* ── LEFT: Cart ── */}
        <div className="space-y-4">
          {/* Part search */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add Item</p>
            <PartCombobox parts={parts} isLoading={partsLoading} onSelect={addToCart} />
          </div>

          {/* Cart table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">
                  Cart — {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Clear cart
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Cart is empty</p>
                <p className="text-xs mt-1">Search for a part above to add it</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Part</th>
                      <th className="text-center px-3 py-2.5 font-medium text-gray-500 w-24">Qty</th>
                      <th className="text-right px-3 py-2.5 font-medium text-gray-500 w-28">Price</th>
                      <th className="text-center px-3 py-2.5 font-medium text-gray-500 w-20">Disc%</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-28">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cart.map((item) => (
                      <tr key={item.partId}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{item.nameEn}</p>
                          <p className="text-xs text-gray-400 font-mono">{item.partNumber}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => item.quantity > 1 ? updateItem(item.partId, 'quantity', item.quantity - 1) : removeItem(item.partId)}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.partId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-10 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => updateItem(item.partId, 'quantity', item.quantity + 1)}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.partId, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full text-right text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.discountPct}
                            onChange={(e) => updateItem(item.partId, 'discountPct', parseFloat(e.target.value) || 0)}
                            className="w-full text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                          {fmt(lineTotal(item))}
                        </td>
                        <td className="pr-3">
                          <button onClick={() => removeItem(item.partId)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700">
                        Subtotal
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">
                        {fmt(subtotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Payment panel ── */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</p>
            <CustomerCombobox customers={customers} value={customer} onChange={handleCustomerChange} />
            {customer && Number(customer.discountSlab) > 0 && (
              <p className="text-xs text-purple-600 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {customer.discountSlab}% discount auto-applied
              </p>
            )}
          </div>

          {/* Order totals */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Order Summary</p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">{fmt(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-24 flex-shrink-0">Discount</span>
              <input
                type="number" min="0" step="1" value={orderDiscount}
                onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                className="field-input text-right text-sm"
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-24 flex-shrink-0">Tax</span>
              <input
                type="number" min="0" step="1" value={orderTax}
                onChange={(e) => setOrderTax(parseFloat(e.target.value) || 0)}
                className="field-input text-right text-sm"
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Net Total</span>
              <span className="text-xl font-bold text-blue-600">{fmt(netTotal)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment</p>
            <div className="grid grid-cols-2 gap-2">
              {payMethods.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPayMethod(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    payMethod === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {payMethod === 'cash' && (
              <div className="space-y-2">
                <div>
                  <label className="field-label">Amount Received</label>
                  <input
                    type="number"
                    min={netTotal}
                    step="1"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={String(Math.ceil(netTotal))}
                    className="field-input text-right font-semibold"
                  />
                </div>
                {change > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Change</span>
                    <span className="text-lg font-bold text-green-700">{fmt(change)}</span>
                  </div>
                )}
                {paidAmount && paid < netTotal && (
                  <p className="text-xs text-red-500">
                    Short by {fmt(netTotal - paid)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Complete button */}
          <button
            onClick={() => createMut.mutate()}
            disabled={!canComplete || createMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-bold text-base rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {createMut.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Sale · {fmt(netTotal)}
              </>
            )}
          </button>

          {!canComplete && cart.length > 0 && payMethod === 'cash' && (
            <p className="text-xs text-center text-gray-400">
              Enter cash amount ≥ {fmt(netTotal)} to complete
            </p>
          )}
        </div>
      </div>

      {/* Receipt modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onNewSale={clearCart}
          onClose={clearCart}
        />
      )}
    </>
  );
}

// ── Sales History Tab ─────────────────────────────────────────────────────────

function HistoryTab() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, from, to, status],
    queryFn: () => fetchSales(page, from, to, status),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="field-input text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="field-input text-sm" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="field-input max-w-[160px] text-sm">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        {(from || to || status) && (
          <button onClick={() => { setFrom(''); setTo(''); setStatus(''); setPage(1); }} className="btn-secondary text-sm">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium text-gray-500">No sales found</p>
                    <p className="text-sm text-gray-400 mt-1">Complete a sale in the POS tab</p>
                  </td>
                </tr>
              ) : (
                items.map((sale) => {
                  const PayIcon = PAY_ICONS[sale.paymentMethod] ?? Receipt;
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold">
                        {sale.invoiceNo}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {sale.customer?.name ?? <span className="text-gray-400 italic text-xs">Walk-in</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString('en-PK', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{sale.items.length}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fmt(sale.netTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <PayIcon className="w-3.5 h-3.5" />
                          {sale.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[sale.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDetailId(sale.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {detailId && <SaleDetailModal saleId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'pos' | 'history';

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>('pos');

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales / POS</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create sales, manage transactions, and view history
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([
          { key: 'pos', label: 'New Sale (POS)', icon: ShoppingCart },
          { key: 'history', label: 'Sales History', icon: Receipt },
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

      {tab === 'pos' ? <POSTab /> : <HistoryTab />}
    </div>
  );
}
