import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  BarChart2,
  Users,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useMerchant } from '../hooks/useApi';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard', end: true },
  { to: '/dashboard/visibility', icon: BarChart2, label: 'Visibility', end: false },
  { to: '/dashboard/competitors', icon: Users, label: 'Competitors', end: false },
  { to: '/dashboard/fixes', icon: Wrench, label: 'Fixes', end: false },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', end: false },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/visibility': 'AI Visibility',
  '/dashboard/competitors': 'Competitors',
  '/dashboard/fixes': 'Fixes',
  '/dashboard/settings': 'Settings',
};

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: merchant } = useMerchant();

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/dashboard/fixes/')
      ? 'Fix Detail'
      : 'Dashboard');

  const initials = merchant?.brand_name
    ? merchant.brand_name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'OL';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0B' }}>
      {/* Sidebar — desktop */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-200"
        style={{
          width: collapsed ? 64 : 220,
          background: '#0D0D0F',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {collapsed ? (
            <span
              className="font-bold font-mono text-lg"
              style={{ color: '#00D4FF' }}
            >
              G
            </span>
          ) : (
            <span className="flex items-baseline gap-0">
              <span
                className="font-bold font-mono text-[17px]"
                style={{ color: '#00D4FF' }}
              >
                GEO
              </span>
              <span
                className="text-[15px] font-normal"
                style={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}
              >
                .visibility
              </span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors relative',
                  isActive
                    ? 'text-[#00D4FF]'
                    : 'text-[#64748B] hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1 bottom-1 rounded-r-sm"
                      style={{ width: 3, background: '#00D4FF' }}
                    />
                  )}
                  <Icon
                    size={18}
                    style={{ color: isActive ? '#00D4FF' : undefined, flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <span style={{ fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Merchant info + collapse toggle */}
        <div
          className="flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{
                  width: 28,
                  height: 28,
                  background: '#00D4FF22',
                  color: '#00D4FF',
                }}
              >
                {initials}
              </div>
              <p
                className="text-[12px] truncate"
                style={{ color: '#64748B' }}
              >
                {merchant?.shop_domain ?? 'oakwoodleather.myshopify.com'}
              </p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center py-2 text-[#64748B] hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 flex flex-col"
            style={{ width: 220, background: '#0D0D0F' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 flex-shrink-0"
              style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="flex items-baseline gap-0">
                <span className="font-bold font-mono text-[17px]" style={{ color: '#00D4FF' }}>
                  GEO
                </span>
                <span className="text-[15px] font-normal" style={{ color: '#64748B' }}>
                  .visibility
                </span>
              </span>
              <button onClick={() => setMobileOpen(false)}>
                <X size={18} style={{ color: '#64748B' }} />
              </button>
            </div>
            <nav className="flex-1 py-4">
              {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium relative',
                      isActive ? 'text-[#00D4FF]' : 'text-[#64748B]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute left-0 top-1 bottom-1 rounded-r-sm"
                          style={{ width: 3, background: '#00D4FF' }}
                        />
                      )}
                      <Icon size={18} style={{ color: isActive ? '#00D4FF' : undefined }} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{
            height: 52,
            background: '#0A0A0B',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} style={{ color: '#64748B' }} />
            </button>
            <span
              className="font-medium text-white text-[15px]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] px-2 py-0.5 rounded border font-mono"
              style={{
                color: '#64748B',
                borderColor: 'rgba(255,255,255,0.1)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {merchant?.plan === 'growth'
                ? 'Growth'
                : merchant?.plan === 'pro'
                ? 'Pro'
                : 'Starter'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-40 flex"
        style={{
          height: 64,
          background: '#0D0D0F',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 text-[10px]',
                isActive ? 'text-[#00D4FF]' : 'text-[#64748B]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} style={{ color: isActive ? '#00D4FF' : undefined }} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
