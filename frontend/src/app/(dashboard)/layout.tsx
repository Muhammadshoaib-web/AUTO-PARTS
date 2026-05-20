'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, GitBranch, ChevronLeft } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/Toaster';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { api } from '@/lib/api/client';

interface Branch { id: string; name: string; }

const ADMIN_ROLES = ['super_admin', 'admin'];

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const { activeBranchId, setActiveBranchId } = useBranchStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { accessToken, refreshToken, refreshTokens, logout } = useAuthStore.getState();
    if (accessToken) {
      setReady(true);
    } else if (refreshToken) {
      refreshTokens()
        .catch(() => logout())
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, router, pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isAdmin = ADMIN_ROLES.includes(user?.role ?? '');

  useEffect(() => {
    if (isAdmin) {
      api.get('/v1/branches').then((r) => setBranches((r.data as any).data ?? [])).catch(() => {});
    }
  }, [isAdmin]);

  if (!ready || !user) return <Spinner />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
      {/* Always in DOM so the slide transition works */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        {/* Panel slides in from the left */}
        <div
          className={`relative z-10 h-full transition-transform duration-300 ease-in-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onClose={() => setOpen(false)} />
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 bg-white border-b border-gray-200 h-[57px] flex-shrink-0">

          {/* Mobile: open drawer */}
          <button
            onClick={() => setOpen(true)}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Desktop: collapse / expand sidebar */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`hidden lg:flex items-center justify-center p-1 rounded-md text-gray-500 hover:text-gray-700 transition-transform duration-300 ${
              collapsed ? 'rotate-180' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={22} />
          </button>

          <span className="font-semibold text-gray-900 lg:hidden">AutoParts IMS</span>

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
