'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Warehouse, ShoppingBag, CreditCard, Truck, Tag, Settings,
  ChevronDown, ChevronRight, Store, Brain, Megaphone, Receipt,
  Building2, Boxes, FileText, Plug, Globe, LogOut, Shield, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Orders', icon: ShoppingCart,
    children: [
      { label: 'All Orders', href: '/orders', icon: ShoppingCart },
      { label: 'Create Order', href: '/orders/create', icon: ShoppingCart },
      { label: 'Returns', href: '/orders/returns', icon: ShoppingCart },
      { label: 'Shipments', href: '/orders/shipments', icon: Truck },
    ],
  },
  {
    label: 'Products', icon: Package,
    children: [
      { label: 'All Products', href: '/products', icon: Package },
      { label: 'Add Product', href: '/products/create', icon: Package },
      { label: 'Categories', href: '/products/categories', icon: Tag },
      { label: 'Brands', href: '/products/brands', icon: Store },
      { label: 'Attributes', href: '/products/attributes', icon: Tag },
      { label: 'Reviews', href: '/products/reviews', icon: FileText },
    ],
  },
  {
    label: 'Inventory', icon: Boxes,
    children: [
      { label: 'Overview', href: '/inventory', icon: Boxes },
      { label: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse },
      { label: 'Stock Transfers', href: '/inventory/transfers', icon: Truck },
      { label: 'Low Stock Alerts', href: '/inventory/alerts', icon: Boxes, badge: 'Alert' },
      { label: 'Adjustments', href: '/inventory/adjustments', icon: Boxes },
    ],
  },
  {
    label: 'Purchasing', icon: ShoppingBag,
    children: [
      { label: 'Purchase Orders', href: '/purchasing/orders', icon: ShoppingBag },
      { label: 'Suppliers', href: '/purchasing/suppliers', icon: Building2 },
      { label: 'GRN', href: '/purchasing/grn', icon: Receipt },
    ],
  },
  { label: 'POS', href: '/pos', icon: Store },
  { label: 'Barcode', href: '/barcode', icon: Boxes },
  {
    label: 'Accounting', icon: Receipt,
    children: [
      { label: 'Dashboard', href: '/accounting', icon: LayoutDashboard },
      { label: 'Chart of Accounts', href: '/accounting/accounts', icon: Receipt },
      { label: 'Journal Entries', href: '/accounting/journals', icon: FileText },
      { label: 'Invoices', href: '/accounting/invoices', icon: FileText },
      { label: 'Expenses', href: '/accounting/expenses', icon: CreditCard },
      { label: 'P&L Report', href: '/accounting/profit-loss', icon: BarChart3 },
      { label: 'Balance Sheet', href: '/accounting/balance-sheet', icon: BarChart3 },
    ],
  },
  {
    label: 'Analytics', icon: BarChart3,
    children: [
      { label: 'Sales Analytics', href: '/analytics/sales', icon: BarChart3 },
      { label: 'Product Analytics', href: '/analytics/products', icon: Package },
      { label: 'Customer Analytics', href: '/analytics/customers', icon: Users },
      { label: 'Finance Analytics', href: '/analytics/finance', icon: Receipt },
      { label: 'Reports', href: '/analytics/reports', icon: FileText },
    ],
  },
  {
    label: 'AI Intelligence', icon: Brain,
    children: [
      { label: 'AI Dashboard', href: '/ai', icon: Brain },
      { label: 'Sales Forecast', href: '/ai/forecast', icon: BarChart3 },
      { label: 'Recommendations', href: '/ai/recommendations', icon: Brain },
      { label: 'NLP Query', href: '/ai/query', icon: Cpu },
    ],
  },
  {
    label: 'Marketing', icon: Megaphone,
    children: [
      { label: 'Campaigns', href: '/marketing/campaigns', icon: Megaphone },
      { label: 'Coupons', href: '/marketing/coupons', icon: Tag },
      { label: 'Flash Sales', href: '/marketing/flash-sales', icon: Tag },
      { label: 'Loyalty Program', href: '/marketing/loyalty', icon: Users },
      { label: 'Abandoned Cart', href: '/marketing/abandoned-cart', icon: ShoppingCart },
    ],
  },
  {
    label: 'Customers', icon: Users,
    children: [
      { label: 'All Customers', href: '/customers', icon: Users },
      { label: 'Segments', href: '/customers/segments', icon: Users },
    ],
  },
  {
    label: 'Vendors', icon: Store,
    children: [
      { label: 'All Vendors', href: '/vendors', icon: Store },
      { label: 'Payouts', href: '/vendors/payouts', icon: CreditCard },
    ],
  },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'General', href: '/settings', icon: Settings },
      { label: 'Users & Roles', href: '/settings/users', icon: Shield },
      { label: 'Payments', href: '/settings/payments', icon: CreditCard },
      { label: 'Shipping', href: '/settings/shipping', icon: Truck },
      { label: 'Plugins', href: '/settings/plugins', icon: Plug },
      { label: 'Integrations', href: '/settings/integrations', icon: Globe },
    ],
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(() => {
    return item.children?.some(c => c.href && pathname.startsWith(c.href)) ?? false;
  });

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;

  if (item.children) {
    const isAnyChildActive = item.children.some(c => c.href && pathname.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isAnyChildActive ? 'text-sidebar-primary font-medium' : 'text-sidebar-foreground/70',
          )}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden ml-4 mt-0.5 space-y-0.5"
            >
              {item.children.map((child) => (
                <NavItemComponent key={child.label} item={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <div className="w-64 flex-shrink-0 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sidebar-foreground text-sm">Shaj Ecom</p>
          <p className="text-sidebar-foreground/50 text-xs">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{user?.role}</p>
          </div>
          <button
            onClick={() => logout()}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground/50 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
