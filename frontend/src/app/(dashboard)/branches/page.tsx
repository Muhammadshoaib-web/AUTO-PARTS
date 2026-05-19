'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useToastStore } from '@/store/toast.store';
import { GitBranch, Plus, Pencil, Trash2, MapPin, Phone, Building2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BranchFormData {
  name: string;
  address: string;
  city: string;
  phone: string;
}

const empty: BranchFormData = { name: '', address: '', city: '', phone: '' };

function BranchModal({
  branch,
  onClose,
}: {
  branch: Branch | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { add } = useToastStore();
  const [form, setForm] = useState<BranchFormData>(
    branch
      ? { name: branch.name, address: branch.address ?? '', city: branch.city ?? '', phone: branch.phone ?? '' }
      : empty,
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof BranchFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };
      if (branch) {
        await api.patch(`/v1/branches/${branch.id}`, payload);
        add('Branch updated.', 'success');
      } else {
        await api.post('/v1/branches', payload);
        add('Branch created.', 'success');
      }
      qc.invalidateQueries({ queryKey: ['branches'] });
      onClose();
    } catch (err: any) {
      add(err?.response?.data?.message ?? 'Failed to save branch.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{branch ? 'Edit Branch' : 'New Branch'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
            <input
              value={form.name}
              onChange={set('name')}
              required
              placeholder="e.g. Main Branch, Lahore Branch"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              value={form.city}
              onChange={set('city')}
              placeholder="e.g. Lahore"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={form.address}
              onChange={set('address')}
              placeholder="Street address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={set('phone')}
              placeholder="+92 300 0000000"
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
              {saving ? 'Saving…' : branch ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { add } = useToastStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);

  const { data, isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/v1/branches').then((r) => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      add('Branch deleted.', 'success');
    },
    onError: (err: any) => add(err?.response?.data?.message ?? 'Failed to delete.', 'error'),
  });

  const branches = data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your shop branches and locations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Branch
        </button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading branches…</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GitBranch size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">No branches yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first branch to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Building2 size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{b.name}</p>
                    {b.city && <p className="text-xs text-gray-500">{b.city}</p>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {b.address && (
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{b.address}</span>
                </div>
              )}
              {b.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={14} className="flex-shrink-0" />
                  <span>{b.phone}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1 border-t border-gray-100 mt-auto">
                <button
                  onClick={() => setEditBranch(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete branch "${b.name}"? This cannot be undone.`)) {
                      deleteMut.mutate(b.id);
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

      {showCreate && <BranchModal branch={null} onClose={() => setShowCreate(false)} />}
      {editBranch && <BranchModal branch={editBranch} onClose={() => setEditBranch(null)} />}
    </div>
  );
}
