'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, X, Pencil, Trash2, Phone, Mail, MapPin,
  Building2, CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';
import { Pagination } from '@/components/ui/Pagination';

// ── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  ntn: string | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

interface PageMeta { total: number; page: number; limit: number; totalPages: number }
interface PagedResponse { items: Supplier[]; meta: PageMeta }

// ── Schema ───────────────────────────────────────────────────────────────────

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  address: z.string().max(500).optional().or(z.literal('')),
  ntn: z.string().max(20).optional().or(z.literal('')),
});
type SupplierForm = z.infer<typeof supplierSchema>;

// ── API helpers ──────────────────────────────────────────────────────────────

const fetchSuppliers = async (q: string, page: number): Promise<PagedResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (q) params.set('q', q);
  const res = await api.get(`/v1/suppliers?${params}`);
  return res.data.data;
};

const createSupplier = async (dto: SupplierForm) => {
  const res = await api.post('/v1/suppliers', dto);
  return res.data.data;
};

const updateSupplier = async ({ id, dto }: { id: string; dto: SupplierForm }) => {
  const res = await api.patch(`/v1/suppliers/${id}`, dto);
  return res.data.data;
};

const deleteSupplier = async (id: string) => {
  const res = await api.delete(`/v1/suppliers/${id}`);
  return res.data.data;
};

// ── Form Modal ───────────────────────────────────────────────────────────────

function SupplierFormModal({
  supplier,
  onClose,
}: {
  supplier: Supplier | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      ntn: supplier?.ntn ?? '',
    },
  });

  const createMut = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create supplier'),
  });

  const updateMut = useMutation({
    mutationFn: updateSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update supplier'),
  });

  const onSubmit = (data: SupplierForm) => {
    const clean = {
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      ntn: data.ntn || undefined,
    };
    if (isEdit) updateMut.mutate({ id: supplier!.id, dto: clean });
    else createMut.mutate(clean);
  };

  const busy = isSubmitting || createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="field-label">Supplier Name <span className="text-red-500">*</span></label>
              <input
                {...register('name')}
                className="field-input"
                placeholder="e.g. Ali Brothers Auto Parts"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Phone</label>
                <input
                  {...register('phone')}
                  className="field-input"
                  placeholder="03xx-xxxxxxx"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="field-input"
                  placeholder="info@supplier.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
            </div>

            {/* NTN */}
            <div>
              <label className="field-label">NTN (National Tax Number)</label>
              <input
                {...register('ntn')}
                className="field-input"
                placeholder="1234567-8"
              />
              {errors.ntn && <p className="mt-1 text-xs text-red-500">{errors.ntn.message}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="field-label">Address</label>
              <textarea
                {...register('address')}
                rows={3}
                className="field-input resize-none"
                placeholder="Street, City, Province"
              />
              {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  supplier,
  onClose,
}: {
  supplier: Supplier;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: () => deleteSupplier(supplier.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(`Supplier "${supplier.name}" deleted`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete supplier'),
  });

  const hasBalance = Number(supplier.balance) !== 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Delete Supplier</h3>
              <p className="mt-1 text-sm text-gray-500">
                Are you sure you want to delete{' '}
                <span className="font-medium text-gray-800">{supplier.name}</span>?
                This action cannot be undone.
              </p>
              {hasBalance && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <CreditCard className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This supplier has an outstanding balance of{' '}
                    <strong>PKR {Number(supplier.balance).toLocaleString()}</strong>.
                    Please settle the balance before deleting.
                  </span>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-400">
                The supplier record will be archived and all purchase history will be preserved.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteMut.isPending ? 'Deleting…' : 'Delete Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Balance Badge ─────────────────────────────────────────────────────────────

function BalanceBadge({ balance }: { balance: number }) {
  const val = Number(balance);
  if (val === 0) return <span className="text-gray-400 text-sm">—</span>;
  const color = val > 0 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50';
  const label = val > 0
    ? `Owe PKR ${val.toLocaleString()}`
    : `Credit PKR ${Math.abs(val).toLocaleString()}`;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <CreditCard className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const openCreate = () => { setEditSupplier(null); setShowForm(true); };
  const openEdit = (s: Supplier) => { setEditSupplier(s); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditSupplier(null); };

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ['suppliers', q, page],
    queryFn: () => fetchSuppliers(q, page),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  const handleSearch = () => {
    setQ(inputQ.trim());
    setPage(1);
  };

  const handleClear = () => {
    setInputQ('');
    setQ('');
    setPage(1);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your supplier directory and payable balances
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, phone, email, NTN…"
            className="field-input pl-9"
          />
        </div>
        <button onClick={handleSearch} className="btn-primary">Search</button>
        {(q || inputQ) && (
          <button onClick={handleClear} className="btn-secondary">
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NTN</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-gray-500">No suppliers found</p>
                    {q ? (
                      <p className="text-sm mt-1">Try a different search term</p>
                    ) : (
                      <p className="text-sm mt-1">Add your first supplier to get started</p>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                    {/* Supplier name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-700">
                            {s.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{s.email}</span>
                          </div>
                        )}
                        {s.address && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{s.address}</span>
                          </div>
                        )}
                        {!s.phone && !s.email && !s.address && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* NTN */}
                    <td className="px-4 py-3 text-gray-600">
                      {s.ntn || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3">
                      <BalanceBadge balance={s.balance} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Modals */}
      {showForm && (
        <SupplierFormModal
          supplier={editSupplier}
          onClose={closeForm}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          supplier={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
