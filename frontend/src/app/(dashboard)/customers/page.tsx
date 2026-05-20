'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, X, Pencil, Trash2, Phone, Mail, MapPin,
  Users, CreditCard, Tag, Shield,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';
import { Pagination } from '@/components/ui/Pagination';

// ── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  ntn: string | null;
  cnic: string | null;
  discountSlab: number;
  creditLimit: number;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

interface PageMeta { total: number; page: number; limit: number; totalPages: number }
interface PagedResponse { items: Customer[]; meta: PageMeta }

// ── Schema ───────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  address: z.string().max(500).optional().or(z.literal('')),
  ntn: z.string().max(20).optional().or(z.literal('')),
  cnic: z.string().max(20).optional().or(z.literal('')),
  discountSlab: z.coerce.number().min(0, 'Must be ≥ 0').max(100, 'Cannot exceed 100%'),
  creditLimit: z.coerce.number().min(0, 'Must be ≥ 0'),
});
type CustomerForm = z.infer<typeof customerSchema>;

// ── API ───────────────────────────────────────────────────────────────────────

const fetchCustomers = async (q: string, page: number): Promise<PagedResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (q) params.set('q', q);
  const res = await api.get(`/v1/customers?${params}`);
  return res.data.data;
};

const createCustomer = async (dto: Partial<CustomerForm>) => {
  const res = await api.post('/v1/customers', dto);
  return res.data.data;
};

const updateCustomer = async ({ id, dto }: { id: string; dto: Partial<CustomerForm> }) => {
  const res = await api.patch(`/v1/customers/${id}`, dto);
  return res.data.data;
};

const deleteCustomer = async (id: string) => {
  const res = await api.delete(`/v1/customers/${id}`);
  return res.data.data;
};

// ── Form Modal ────────────────────────────────────────────────────────────────

function CustomerFormModal({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      address: customer?.address ?? '',
      ntn: customer?.ntn ?? '',
      cnic: customer?.cnic ?? '',
      discountSlab: customer?.discountSlab ?? 0,
      creditLimit: customer?.creditLimit ?? 0,
    },
  });

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create customer'),
  });

  const updateMut = useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update customer'),
  });

  const onSubmit = (data: CustomerForm) => {
    const clean = {
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      ntn: data.ntn || undefined,
      cnic: data.cnic || undefined,
      discountSlab: data.discountSlab,
      creditLimit: data.creditLimit,
    };
    if (isEdit) updateMut.mutate({ id: customer!.id, dto: clean });
    else createMut.mutate(clean);
  };

  const busy = isSubmitting || createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="field-label">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                className="field-input"
                placeholder="e.g. Khalid Motors"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
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
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="field-input"
                  placeholder="customer@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* CNIC + NTN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">CNIC</label>
                <input
                  {...register('cnic')}
                  className="field-input"
                  placeholder="xxxxx-xxxxxxx-x"
                />
                {errors.cnic && (
                  <p className="mt-1 text-xs text-red-500">{errors.cnic.message}</p>
                )}
              </div>
              <div>
                <label className="field-label">NTN</label>
                <input
                  {...register('ntn')}
                  className="field-input"
                  placeholder="1234567-8"
                />
                {errors.ntn && (
                  <p className="mt-1 text-xs text-red-500">{errors.ntn.message}</p>
                )}
              </div>
            </div>

            {/* Discount + Credit Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Discount Slab %</label>
                <div className="relative">
                  <input
                    {...register('discountSlab')}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="field-input pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                {errors.discountSlab && (
                  <p className="mt-1 text-xs text-red-500">{errors.discountSlab.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">Auto-applied at POS</p>
              </div>
              <div>
                <label className="field-label">Credit Limit (PKR)</label>
                <input
                  {...register('creditLimit')}
                  type="number"
                  step="1"
                  min="0"
                  className="field-input"
                  placeholder="0"
                />
                {errors.creditLimit && (
                  <p className="mt-1 text-xs text-red-500">{errors.creditLimit.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">0 = no credit sales allowed</p>
              </div>
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
              {errors.address && (
                <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Modal ───────────────────────────────────────────────────────────────

function DeleteModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: () => deleteCustomer(customer.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer "${customer.name}" deleted`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete customer'),
  });

  const hasBalance = Number(customer.balance) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Delete Customer</h3>
              <p className="mt-1 text-sm text-gray-500">
                Are you sure you want to delete{' '}
                <span className="font-medium text-gray-800">{customer.name}</span>?
              </p>
              {hasBalance && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <CreditCard className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This customer has an outstanding balance of{' '}
                    <strong>PKR {Number(customer.balance).toLocaleString()}</strong>.
                    Please collect payment before deleting.
                  </span>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-400">
                The customer record will be archived and all sales history will be preserved.
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
            {deleteMut.isPending ? 'Deleting…' : 'Delete Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function BalanceBadge({ balance }: { balance: number }) {
  const val = Number(balance);
  if (val === 0) return <span className="text-gray-400 text-sm">—</span>;
  const isOwed = val > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isOwed ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
      }`}
    >
      <CreditCard className="w-3 h-3" />
      {isOwed
        ? `Owes PKR ${val.toLocaleString()}`
        : `Advance PKR ${Math.abs(val).toLocaleString()}`}
    </span>
  );
}

function DiscountBadge({ discount }: { discount: number }) {
  const val = Number(discount);
  if (val === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-purple-700 bg-purple-50">
      <Tag className="w-3 h-3" />
      {val}% off
    </span>
  );
}

function CreditBadge({ limit }: { limit: number }) {
  const val = Number(limit);
  if (val === 0) return (
    <span className="text-xs text-gray-400">No credit</span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-700">
      <Shield className="w-3 h-3" />
      PKR {val.toLocaleString()}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const openCreate = () => { setEditCustomer(null); setShowForm(true); };
  const openEdit = (c: Customer) => { setEditCustomer(c); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditCustomer(null); };

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ['customers', q, page],
    queryFn: () => fetchCustomers(q, page),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  const handleSearch = () => { setQ(inputQ.trim()); setPage(1); };
  const handleClear = () => { setInputQ(''); setQ(''); setPage(1); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage customer accounts, credit limits, and receivable balances
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, phone, CNIC, NTN…"
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CNIC / NTN</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Discount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Credit Limit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
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
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-gray-500">No customers found</p>
                    {q ? (
                      <p className="text-sm mt-1">Try a different search term</p>
                    ) : (
                      <p className="text-sm mt-1">Add your first customer to get started</p>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-emerald-700">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {c.address && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{c.address}</span>
                          </div>
                        )}
                        {!c.phone && !c.email && !c.address && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* CNIC / NTN */}
                    <td className="px-4 py-3 text-gray-600">
                      <div className="space-y-0.5 text-xs">
                        {c.cnic && <div><span className="text-gray-400">CNIC: </span>{c.cnic}</div>}
                        {c.ntn && <div><span className="text-gray-400">NTN: </span>{c.ntn}</div>}
                        {!c.cnic && !c.ntn && <span className="text-gray-300">—</span>}
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3">
                      <DiscountBadge discount={c.discountSlab} />
                      {Number(c.discountSlab) === 0 && (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Credit Limit */}
                    <td className="px-4 py-3">
                      <CreditBadge limit={c.creditLimit} />
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3">
                      <BalanceBadge balance={c.balance} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
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
        <CustomerFormModal
          customer={editCustomer}
          onClose={closeForm}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          customer={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
