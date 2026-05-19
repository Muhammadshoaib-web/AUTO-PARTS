'use client';

import { useState, useEffect } from 'react';
import { Menu, GitBranch } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/Toaster';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { api } from '@/lib/api/client';

interface Branch { id: string; name: string; }

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const { activeBranchId, setActiveBranchId } = useBranchStore();
  const [branches, setBranches] = useState<Branch[]>([]);

  const isAdmin = ADMIN_ROLES.includes(user?.role ?? '');

  useEffect(() => {
    if (isAdmin) {
      api.get('/v1/branches').then((r) => setBranches((r.data as any).data ?? [])).catch(() => {});
    }
  }, [isAdmin]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setOpen(true)}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-900 lg:hidden">AutoParts IMS</span>

          {/* Branch selector — only for admins with multiple branches */}
          {isAdmin && branches.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <GitBranch size={15} className="text-gray-400" />
              <select
                value={activeBranchId ?? ''}
                onChange={(e) => setActiveBranchId(e.target.value || null)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
