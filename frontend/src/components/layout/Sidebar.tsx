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
      { href: '/expenses', label: 'Expenses', icon: Receipt },
      { href: '/ledger',   label: 'Ledger',   icon: BookOpen },
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

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
}

export function Sidebar({ onClose, collapsed = false }: SidebarProps) {
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
    <div
      className={clsx(
        'flex flex-col h-full bg-gray-900 text-white overflow-hidden',
        'transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Brand */}
      <div className={clsx(
        'flex items-center border-b border-gray-700/60 h-[57px] flex-shrink-0',
        collapsed ? 'justify-center px-0' : 'justify-between px-5',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-white" />
          </div>
          <div className={clsx(
            'overflow-hidden whitespace-nowrap transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
          )}>
            <p className="font-bold text-sm leading-tight">AutoParts IMS</p>
            <p className="text-xs text-gray-400">Inventory &amp; POS</p>
          </div>
        </div>
        {onClose && !collapsed && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden flex-shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-5 px-2">
        {nav.map((section) => (
          <div key={section.group}>
            {/* Group header fades out when collapsed */}
            <p className={clsx(
              'text-xs font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1.5 whitespace-nowrap',
              'transition-opacity duration-200',
              collapsed ? 'opacity-0 h-0 mb-0 overflow-hidden' : 'opacity-100',
            )}>
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
                      title={collapsed ? label : undefined}
                      className={clsx(
                        'flex items-center rounded-lg text-sm font-medium transition-colors',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                      )}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className={clsx(
                        'whitespace-nowrap overflow-hidden transition-all duration-300',
                        collapsed ? 'w-0 opacity-0' : 'opacity-100',
                      )}>
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-700/60 p-3 space-y-1 flex-shrink-0">
        <div className={clsx(
          'flex items-center gap-3 py-1',
          collapsed ? 'justify-center px-0' : 'px-2',
        )}>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className={clsx(
            'flex-1 min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'opacity-100',
          )}>
            <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={clsx(
            'w-full flex items-center rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors',
            collapsed ? 'justify-center px-0 py-2.5 gap-0' : 'gap-3 px-3 py-2',
          )}
        >
          <LogOut size={15} className="flex-shrink-0" />
          <span className={clsx(
            'whitespace-nowrap overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'opacity-100',
          )}>
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}
