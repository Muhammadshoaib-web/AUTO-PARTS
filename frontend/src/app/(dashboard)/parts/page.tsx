'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';
import {
  Plus, Search, Package, Pencil, Trash2, X, Eye,
  AlertTriangle, ChevronLeft, ChevronRight, Tag,
  DollarSign, Hash, Boxes,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  nameEn: string;
}

interface StockEntry {
  id: string;
  quantity: number;
  reservedQty: number;
  location: { id: string; name: string };
}

interface Part {
  id: string;
  partNumber: string;
  oemNumber: string | null;
  nameEn: string;
  nameUr: string | null;
  categoryId: string | null;
  category: Category | null;
  brand: string | null;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  taxRate: number;
  minStock: number;
  barcode: string | null;
  imagePath: string | null;
  isActive: boolean;
  stocks?: StockEntry[];
  createdAt: string;
}

interface PaginatedParts {
  items: Part[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ── Validation ───────────────────────────────────────────────────────────────

const schema = z
  .object({
    partNumber: z.string().min(1, 'Part number is required').max(100),
    oemNumber: z.string().max(100).optional().or(z.literal('')),
    nameEn: z.string().min(1, 'English name is required').max(200),
    nameUr: z.string().max(200).optional().or(z.literal('')),
    categoryId: z.string().uuid('Select a valid category').optional().or(z.literal('')),
    brand: z.string().max(100).optional().or(z.literal('')),
    unit: z.string().min(1).max(20).default('piece'),
    buyPrice: z.coerce.number({ invalid_type_error: 'Enter a valid price' }).min(0, 'Must be ≥ 0'),
    sellPrice: z.coerce.number({ invalid_type_error: 'Enter a valid price' }).min(0, 'Must be ≥ 0'),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    minStock: z.coerce.number().int('Must be whole number').min(0).default(0),
    barcode: z.string().max(100).optional().or(z.literal('')),
  })
  .refine((d) => d.sellPrice >= d.buyPrice, {
    message: 'Sell price should be ≥ buy price',
    path: ['sellPrice'],
  });

type FormValues = z.infer<typeof schema>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PartsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'detail' | null>(null);
  const [selected, setSelected] = useState<Part | null>(null);

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const { data, isLoading } = useQuery<PaginatedParts>({
    queryKey: ['parts', search, categoryFilter, page],
    queryFn: () =>
      api
        .get('/v1/parts', {
          params: {
            q: search || undefined,
            categoryId: categoryFilter || undefined,
            page,
            limit: 20,
          },
        })
        .then((r) => r.data.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories-list'],
    queryFn: () => api.get('/v1/categories').then((r) => r.data.data ?? r.data),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  const closeModal = () => { setModal(null); setSelected(null); };
  const onSuccess = () => { qc.invalidateQueries({ queryKey: ['parts'] }); closeModal(); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta ? `${meta.total} parts in inventory` : 'Loading…'}
          </p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary flex-shrink-0">
          <Plus size={16} /> Add Part
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, part #, barcode…"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nameEn}</option>
            ))}
          </select>

          {(search || categoryFilter) && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <Th>Part #</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Brand</Th>
                <Th>Buy Price</Th>
                <Th>Sell Price</Th>
                <Th>Tax</Th>
                <Th>Min Stock</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <SkeletonRows cols={10} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Package size={36} className="text-gray-200" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          {search || categoryFilter ? 'No parts match your filters' : 'No parts yet'}
                        </p>
                        {!search && !categoryFilter && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Add your first part to start tracking inventory
                          </p>
                        )}
                      </div>
                      {!search && !categoryFilter && (
                        <button onClick={() => setModal('create')} className="mt-1 text-sm text-blue-600 hover:underline">
                          + Add Part
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((part) => (
                  <tr key={part.id} className="group hover:bg-gray-50 transition-colors">
                    <Td>
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {part.partNumber}
                      </span>
                    </Td>
                    <Td>
                      <div>
                        <p className="font-medium text-gray-900">{part.nameEn}</p>
                        {part.oemNumber && (
                          <p className="text-xs text-gray-400">OEM: {part.oemNumber}</p>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {part.category ? (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                          <Tag size={10} />
                          {part.category.nameEn}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </Td>
                    <Td className="text-gray-600">{part.brand || '—'}</Td>
                    <Td className="text-gray-700">PKR {Number(part.buyPrice).toLocaleString()}</Td>
                    <Td className="font-medium text-green-700">
                      PKR {Number(part.sellPrice).toLocaleString()}
                    </Td>
                    <Td className="text-gray-500">{Number(part.taxRate)}%</Td>
                    <Td>
                      <span className={`font-medium ${part.minStock > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {part.minStock}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${part.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {part.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionBtn onClick={() => { setSelected(part); setModal('detail'); }} title="View Details" className="hover:bg-gray-100 hover:text-gray-700">
                          <Eye size={14} />
                        </ActionBtn>
                        <ActionBtn onClick={() => { setSelected(part); setModal('edit'); }} title="Edit" className="hover:bg-blue-50 hover:text-blue-600">
                          <Pencil size={14} />
                        </ActionBtn>
                        <ActionBtn onClick={() => { setSelected(part); setModal('delete'); }} title="Delete" className="hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </ActionBtn>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <PaginationBtn onClick={() => setPage(page - 1)} disabled={page === 1}>
                <ChevronLeft size={14} />
              </PaginationBtn>
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, meta.totalPages - 4)) + i;
                return (
                  <PaginationBtn key={p} onClick={() => setPage(p)} active={p === page}>
                    {p}
                  </PaginationBtn>
                );
              })}
              <PaginationBtn onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}>
                <ChevronRight size={14} />
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <PartFormModal
          part={modal === 'edit' ? selected : null}
          categories={categories}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === 'detail' && selected && (
        <PartDetailModal part={selected} onClose={closeModal} onEdit={() => { setModal('edit'); }} />
      )}
      {modal === 'delete' && selected && (
        <DeleteModal part={selected} onClose={closeModal} onSuccess={onSuccess} />
      )}
    </div>
  );
}

// ── Part Form Modal ───────────────────────────────────────────────────────────

function PartFormModal({
  part,
  categories,
  onClose,
  onSuccess,
}: {
  part: Part | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!part;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      partNumber: part?.partNumber ?? '',
      oemNumber: part?.oemNumber ?? '',
      nameEn: part?.nameEn ?? '',
      nameUr: part?.nameUr ?? '',
      categoryId: part?.categoryId ?? '',
      brand: part?.brand ?? '',
      unit: part?.unit ?? 'piece',
      buyPrice: part ? Number(part.buyPrice) : ('' as any),
      sellPrice: part ? Number(part.sellPrice) : ('' as any),
      taxRate: part ? Number(part.taxRate) : 0,
      minStock: part ? part.minStock : 0,
      barcode: part?.barcode ?? '',
    },
  });

  useEffect(() => {
    reset({
      partNumber: part?.partNumber ?? '',
      oemNumber: part?.oemNumber ?? '',
      nameEn: part?.nameEn ?? '',
      nameUr: part?.nameUr ?? '',
      categoryId: part?.categoryId ?? '',
      brand: part?.brand ?? '',
      unit: part?.unit ?? 'piece',
      buyPrice: part ? Number(part.buyPrice) : ('' as any),
      sellPrice: part ? Number(part.sellPrice) : ('' as any),
      taxRate: part ? Number(part.taxRate) : 0,
      minStock: part ? part.minStock : 0,
      barcode: part?.barcode ?? '',
    });
  }, [part, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      partNumber: values.partNumber,
      oemNumber: values.oemNumber || undefined,
      nameEn: values.nameEn,
      nameUr: values.nameUr || undefined,
      categoryId: values.categoryId || undefined,
      brand: values.brand || undefined,
      unit: values.unit,
      buyPrice: values.buyPrice,
      sellPrice: values.sellPrice,
      taxRate: values.taxRate,
      minStock: values.minStock,
      barcode: values.barcode || undefined,
    };

    try {
      if (isEdit) {
        await api.patch(`/v1/parts/${part!.id}`, payload);
        toast.success(`"${values.nameEn}" updated`);
      } else {
        await api.post('/v1/parts', payload);
        toast.success(`"${values.nameEn}" created`);
      }
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? err.response?.data?.message ?? 'Something went wrong';
      toast.error(msg);
    }
  };

  return (
    <Modal onClose={onClose} title={isEdit ? 'Edit Part' : 'New Part'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">
          {/* Row 1: Part # | OEM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Part Number" required error={errors.partNumber?.message}>
              <input {...register('partNumber')} placeholder="e.g. BP-4501-TOY" className={fieldCls(errors.partNumber)} />
            </Field>
            <Field label="OEM Number" error={errors.oemNumber?.message}>
              <input {...register('oemNumber')} placeholder="Manufacturer's code" className={fieldCls()} />
            </Field>
          </div>

          {/* Row 2: Name EN | Name UR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name (English)" required error={errors.nameEn?.message}>
              <input {...register('nameEn')} placeholder="e.g. Brake Pad Front" className={fieldCls(errors.nameEn)} />
            </Field>
            <Field label="Name (Urdu)" error={errors.nameUr?.message}>
              <input {...register('nameUr')} placeholder="e.g. بریک پیڈ" dir="rtl" className={fieldCls()} />
            </Field>
          </div>

          {/* Row 3: Category | Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" error={errors.categoryId?.message}>
              <select {...register('categoryId')} className={`${fieldCls()} bg-white`}>
                <option value="">— No category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
              </select>
            </Field>
            <Field label="Brand" error={errors.brand?.message}>
              <input {...register('brand')} placeholder="e.g. Toyota, Bosch" className={fieldCls()} />
            </Field>
          </div>

          {/* Row 4: Unit | Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Unit" required error={errors.unit?.message}>
              <select {...register('unit')} className={`${fieldCls()} bg-white`}>
                {['piece', 'pair', 'set', 'litre', 'kg', 'meter', 'box'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label="Barcode" error={errors.barcode?.message}>
              <input {...register('barcode')} placeholder="Scan or type barcode" className={fieldCls()} />
            </Field>
          </div>

          {/* Row 5: Buy Price | Sell Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Buy Price (PKR)" required error={errors.buyPrice?.message}>
              <input {...register('buyPrice')} type="number" min="0" step="0.01" placeholder="0.00" className={fieldCls(errors.buyPrice)} />
            </Field>
            <Field label="Sell Price (PKR)" required error={errors.sellPrice?.message}>
              <input {...register('sellPrice')} type="number" min="0" step="0.01" placeholder="0.00" className={fieldCls(errors.sellPrice)} />
            </Field>
          </div>

          {/* Row 6: Tax Rate | Min Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tax Rate (%)" error={errors.taxRate?.message}>
              <input {...register('taxRate')} type="number" min="0" max="100" step="0.01" placeholder="0" className={fieldCls()} />
            </Field>
            <Field label="Minimum Stock Alert" error={errors.minStock?.message}>
              <input {...register('minStock')} type="number" min="0" step="1" placeholder="0" className={fieldCls()} />
              <p className="text-xs text-gray-400 mt-1">Alert when stock falls below this</p>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting
              ? <><Spinner /> {isEdit ? 'Saving…' : 'Creating…'}</>
              : isEdit ? 'Save Changes' : 'Create Part'
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Part Detail Modal ─────────────────────────────────────────────────────────

function PartDetailModal({
  part: partSummary,
  onClose,
  onEdit,
}: {
  part: Part;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: part, isLoading } = useQuery<Part>({
    queryKey: ['part-detail', partSummary.id],
    queryFn: () => api.get(`/v1/parts/${partSummary.id}`).then((r) => r.data.data),
  });

  const totalStock = part?.stocks?.reduce((s, st) => s + st.quantity, 0) ?? 0;
  const reservedStock = part?.stocks?.reduce((s, st) => s + st.reservedQty, 0) ?? 0;

  return (
    <Modal onClose={onClose} title="Part Details" maxWidth="max-w-lg">
      {isLoading ? (
        <div className="space-y-3 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : part ? (
        <div className="space-y-5">
          {/* Identifiers */}
          <div className="grid grid-cols-2 gap-3">
            <DetailChip icon={<Hash size={13} />} label="Part #" value={part.partNumber} mono />
            {part.oemNumber && <DetailChip icon={<Hash size={13} />} label="OEM #" value={part.oemNumber} mono />}
            {part.barcode && <DetailChip icon={<Hash size={13} />} label="Barcode" value={part.barcode} mono />}
          </div>

          {/* Names */}
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">{part.nameEn}</p>
            {part.nameUr && <p className="text-sm text-gray-500" dir="rtl">{part.nameUr}</p>}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem label="Category" value={part.category?.nameEn ?? '—'} />
            <DetailItem label="Brand" value={part.brand ?? '—'} />
            <DetailItem label="Unit" value={part.unit} />
            <DetailItem label="Tax Rate" value={`${Number(part.taxRate)}%`} />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Buy Price</p>
              <p className="text-lg font-bold text-gray-800">PKR {Number(part.buyPrice).toLocaleString()}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 mb-0.5">Sell Price</p>
              <p className="text-lg font-bold text-green-700">PKR {Number(part.sellPrice).toLocaleString()}</p>
            </div>
          </div>

          {/* Stock breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock by Location</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-600">Total: <strong>{totalStock}</strong></span>
                <span className="text-orange-600">Reserved: <strong>{reservedStock}</strong></span>
                <span className="text-green-600">Available: <strong>{totalStock - reservedStock}</strong></span>
              </div>
            </div>
            {(part.stocks?.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertTriangle size={15} className="text-amber-500" />
                <p className="text-xs text-amber-700">No stock recorded yet. Receive a purchase to add stock.</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Location</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">Reserved</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-500">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {part.stocks!.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 text-gray-700">{s.location.name}</td>
                        <td className="px-3 py-2 text-right font-medium">{s.quantity}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{s.reservedQty}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">{s.quantity - s.reservedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {part.minStock > 0 && totalStock <= part.minStock && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                <AlertTriangle size={13} className="text-red-500" />
                <p className="text-xs text-red-600">
                  Below minimum stock ({part.minStock} {part.unit}) — reorder needed
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={onClose} className="btn-secondary">Close</button>
            <button onClick={onEdit} className="btn-primary"><Pencil size={14} /> Edit Part</button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({
  part,
  onClose,
  onSuccess,
}: {
  part: Part;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/v1/parts/${part.id}`);
      toast.success(`"${part.nameEn}" deleted`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to delete part');
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Delete Part" maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <strong className="text-gray-900">&quot;{part.nameEn}&quot;</strong>?
          <br />
          <span className="text-xs text-gray-400 mt-1 block">
            The part will be hidden. Existing sales and stock records are preserved.
          </span>
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <><Spinner /> Deleting…</> : <><Trash2 size={15} /> Delete</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Modal({
  children, onClose, title, maxWidth = 'max-w-lg',
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxWidth} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function fieldCls(err?: { message?: string }) {
  return `field-input${err ? ' border-red-400 focus:ring-red-400' : ''}`;
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function ActionBtn({ children, onClick, title, className = '' }: {
  children: React.ReactNode; onClick: () => void; title: string; className?: string;
}) {
  return (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 transition-colors ${className}`}>
      {children}
    </button>
  );
}

function PaginationBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
        active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

function DetailChip({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
      <span className="text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${55 + j * 5}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
