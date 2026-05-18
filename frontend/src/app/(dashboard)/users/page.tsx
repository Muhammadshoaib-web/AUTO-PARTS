'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { useToastStore } from '@/store/toast.store';
import {
  Plus, Search, X, Pencil, KeyRound, UserX, UserCheck,
  Shield, Users, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin',       label: 'Admin'       },
  { value: 'manager',     label: 'Manager'     },
  { value: 'cashier',     label: 'Cashier'     },
  { value: 'viewer',      label: 'Viewer'      },
];

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  admin:       { bg: 'bg-purple-100', text: 'text-purple-700' },
  manager:     { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  cashier:     { bg: 'bg-green-100',  text: 'text-green-700'  },
  viewer:      { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

function roleStyle(role: string) {
  return ROLE_STYLE[role] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
}

function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-rose-500', 'bg-cyan-500',
];

function avatarColor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:     z.string().min(2, 'Name is required'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.string().min(1, 'Role is required'),
});

const editSchema = z.object({
  name:  z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  role:  z.string().min(1, 'Role is required'),
});

const pwSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:     z.string(),
}).refine((d) => d.newPassword === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;
type PwForm     = z.infer<typeof pwSchema>;

// ── Password input with show/hide ──────────────────────────────────────────

function PasswordInput({ registration, placeholder, error }: {
  registration: any;
  placeholder?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          {...registration}
          placeholder={placeholder ?? 'Min. 8 characters'}
          className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Create User Modal ──────────────────────────────────────────────────────

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const toast = useToastStore((s) => s.add);
  const qc    = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'cashier' },
  });
  const mutation = useMutation({
    mutationFn: (data: CreateForm) => api.post('/v1/users', data).then((r) => r.data),
    onSuccess: () => { toast('User created!', 'success'); qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to save', 'error'),
  });
  return (
    <ModalShell title="Add New User" onClose={onClose}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Full Name *</label>
          <input {...register('name')} placeholder="e.g. Ahmad Raza"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email *</label>
          <input {...register('email')} type="email" placeholder="user@example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Password *</label>
          <PasswordInput registration={register('password')} error={errors.password?.message} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Role *</label>
          <select {...register('role')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Edit User Modal ────────────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToastStore((s) => s.add);
  const qc    = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, email: user.email, role: user.role },
  });
  const mutation = useMutation({
    mutationFn: (data: EditForm) => api.patch(`/v1/users/${user.id}`, data).then((r) => r.data),
    onSuccess: () => { toast('User updated!', 'success'); qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to save', 'error'),
  });
  return (
    <ModalShell title="Edit User" onClose={onClose}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Full Name *</label>
          <input {...register('name')} placeholder="e.g. Ahmad Raza"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email *</label>
          <input {...register('email')} type="email"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Role *</label>
          <select {...register('role')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToastStore((s) => s.add);
  const qc    = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: PwForm) =>
      api.patch(`/v1/users/${user.id}/reset-password`, { newPassword: data.newPassword }),
    onSuccess: () => {
      toast('Password reset successfully!', 'success');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed to reset password', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
            <p className="text-sm text-gray-500 mt-0.5">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">New Password</label>
            <PasswordInput registration={register('newPassword')} error={errors.newPassword?.message} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Confirm Password</label>
            <PasswordInput registration={register('confirm')} placeholder="Re-enter password" error={errors.confirm?.message} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Toggle Status Confirm ──────────────────────────────────────────────────

function ToggleStatusModal({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToastStore((s) => s.add);
  const qc    = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.patch(`/v1/users/${user.id}/toggle-status`),
    onSuccess: () => {
      toast(`User ${user.isActive ? 'deactivated' : 'activated'}!`, 'success');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Failed', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            user.isActive ? 'bg-red-100' : 'bg-green-100'
          }`}>
            <AlertTriangle size={18} className={user.isActive ? 'text-red-600' : 'text-green-600'} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              {user.isActive ? 'Deactivate User?' : 'Activate User?'}
            </h3>
            <p className="text-sm text-gray-500">{user.name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {user.isActive
            ? 'This user will no longer be able to log in.'
            : 'This user will be able to log in again.'}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${
              user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}>
            {mutation.isPending ? 'Saving...' : user.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [editUser, setEditUser]       = useState<User | null>(null);
  const [resetUser, setResetUser]     = useState<User | null>(null);
  const [toggleUser, setToggleUser]   = useState<User | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () =>
      api.get('/v1/users', { params: { q: search || undefined, limit: 100 } })
        .then((r) => r.data.data),
  });

  const users: User[] = data?.items ?? [];

  const active   = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const byRole   = ROLES.map((r) => ({
    ...r,
    count: users.filter((u) => u.role === r.value).length,
  })).filter((r) => r.count > 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage staff access and permissions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={15} className="text-blue-500" />
            <span className="text-xs font-medium text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={15} className="text-green-500" />
            <span className="text-xs font-medium text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{active}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserX size={15} className="text-red-400" />
            <span className="text-xs font-medium text-gray-500">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inactive}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={15} className="text-purple-500" />
            <span className="text-xs font-medium text-gray-500">Roles</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {byRole.map((r) => (
              <span key={r.value}
                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${roleStyle(r.value).bg} ${roleStyle(r.value).text}`}>
                {r.label}: {r.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* User grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          <Users size={36} className="mx-auto mb-2 opacity-30" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const isSelf = currentUser?.id === user.id;
            const rs = roleStyle(user.role);
            return (
              <div
                key={user.id}
                className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-md ${
                  isSelf ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'
                } ${!user.isActive ? 'opacity-60' : ''}`}
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor(user.id)}`}>
                    {initials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                      {isSelf && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rs.bg} ${rs.text}`}>
                    {roleLabel(user.role)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Joined {new Date(user.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditUser(user)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setResetUser(user)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <KeyRound size={12} /> Password
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => setToggleUser(user)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ml-auto ${
                        user.isActive
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {user.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editUser   && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
      {resetUser  && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {toggleUser && <ToggleStatusModal  user={toggleUser} onClose={() => setToggleUser(null)} />}
    </div>
  );
}
