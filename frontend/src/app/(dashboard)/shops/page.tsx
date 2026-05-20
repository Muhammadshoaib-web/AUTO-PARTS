'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useToastStore } from '@/store/toast.store';
import { Store, Plus, Pencil, Trash2, Mail, Phone, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { redirect } from 'next/navigation';

interface Shop {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ShopFormData {
  name: string;
  ownerEmail: string;
  phone: string;
  address: string;
}

const empty: ShopFormData = { name: '', ownerEmail: '', phone: '', address: '' };

function ShopModal({ shop, onClose }: { shop: Shop | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { add } = useToastStore();
  const [form, setForm] = useState<ShopFormData>(
    shop
      ? { name: shop.name, ownerEmail: shop.ownerEmail ?? '', phone: shop.phone ?? '', address: shop.address ?? '' }
      : empty,
  );
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof ShopFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ownerEmail: form.ownerEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      };
      if (shop) {
        await api.patch(`/v1/shops/${shop.id}`, payload);
        add('Shop updated.', 'success');
      } else {
        await api.post('/v1/shops', payload);
        add('Shop created.', 'success');
      }
      qc.invalidateQueries({ queryKey: ['shops'] });
      onClose();
    } catch (err: any) {
      add(err?.response?.data?.message ?? 'Failed to save shop.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{shop ? 'Edit Shop' : 'New Shop'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
            <input
              value={form.name}
              onChange={setField('name')}
              required
              placeholder="e.g. Al-Rahim Auto Parts"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={setField('ownerEmail')}
              placeholder="owner@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={setField('phone')}
              placeholder="+92 300 0000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={form.address}
              onChange={setField('address')}
              placeholder="Shop address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : shop ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ShopsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { add } = useToastStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editShop, setEditShop] = useState<Shop | null>(null);

  if (user?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  const { data, isLoading } = useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: () => api.get('/v1/shops').then((r) => r.data.data),
  });

  const toggleMut = useMutation({
    mutationFn: (shop: Shop) => api.patch(`/v1/shops/${shop.id}`, { isActive: !shop.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shops'] });
      add('Shop status updated.', 'success');
    },
    onError: (err: any) => add(err?.response?.data?.message ?? 'Failed to update shop.', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/shops/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shops'] });
      add('Shop deactivated.', 'success');
    },
    onError: (err: any) => add(err?.response?.data?.message ?? 'Failed to delete.', 'error'),
  });

  const shops = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all shops on the platform</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Shop
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading shops…</div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Store size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">No shops yet</p>
          <p className="text-sm text-gray-500 mt-1">Create the first shop to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create Shop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Store size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{s.slug}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {s.ownerEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail size={13} className="flex-shrink-0" />
                  <span className="truncate">{s.ownerEmail}</span>
                </div>
              )}
              {s.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={13} className="flex-shrink-0" />
                  <span>{s.phone}</span>
                </div>
              )}
              {s.address && (
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{s.address}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1 border-t border-gray-100 mt-auto">
                <button
                  onClick={() => setEditShop(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => toggleMut.mutate(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  {s.isActive ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                  {s.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Deactivate shop "${s.name}"?`)) {
                      deleteMut.mutate(s.id);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <ShopModal shop={null} onClose={() => setShowCreate(false)} />}
      {editShop && <ShopModal shop={editShop} onClose={() => setEditShop(null)} />}
    </div>
  );
}
