'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Package, Tag, Layers, ShoppingCart,
  Truck, Users, UserCircle, Receipt, BarChart3, Shield,
  LogOut, Building2, X, Warehouse, BookOpen, ArrowLeftRight, GitBranch, Store,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/client';

const ADMIN_ROLES = ['super_admin', 'admin'];

const buildNav = (role: string) => [
  {
    group: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Inventory',
    items: [
      { href: '/parts', label: 'Parts', icon: Package },
      { href: '/categories', label: 'Categories', icon: Tag },
      { href: '/stock', label: 'Stock Levels', icon: Layers },
      { href: '/locations', label: 'Locations', icon: Warehouse },
      { href: '/stock-transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
    ],
  },
  {
    group: 'Transactions',
    items: [
      { href: '/sales', label: 'Sales / POS', icon: ShoppingCart },
      { href: '/purchases', label: 'Purchases', icon: Truck },
    ],
  },
  {
    group: 'Contacts',
    items: [
      { href: '/suppliers', label: 'Suppliers', icon: Building2 },
      { href: '/customers', label: 'Customers', icon: UserCircle },
    ],
  },
  {
    group: 'Finance',
    items: [
      { href: '/expenses', label: 'Expenses',  icon: Receipt   },
      { href: '/ledger',   label: 'Ledger',    icon: BookOpen  },
    ],
  },
  {
    group: 'Administration',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      ...(ADMIN_ROLES.includes(role) ? [{ href: '/branches', label: 'Branches', icon: GitBranch }] : []),
      ...(role === 'super_admin' ? [{ href: '/shops', label: 'Shops', icon: Store }] : []),
      { href: '/users', label: 'Users', icon: Users },
      ...(role === 'super_admin' ? [{ href: '/audit', label: 'Audit Logs', icon: Shield }] : []),
    ],
  },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const nav = buildNav(user?.role ?? '');

  const handleLogout = async () => {
    try { await api.post('/v1/auth/logout'); } catch {}
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">AutoParts IMS</p>
            <p className="text-xs text-gray-400">Inventory & POS</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {nav.map((section) => (
          <div key={section.group}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-1.5">
              {section.group}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                      )}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-700/60 p-4 space-y-1">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
