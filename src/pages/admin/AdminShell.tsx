import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, ClipboardList, LogOut, Star } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    to: '/admin/spot-checks',
    icon: ClipboardList,
    label: 'Spot Checks',
    description: 'Brand accuracy validation',
  },
  {
    to: '/admin/verifier',
    icon: ShieldCheck,
    label: 'Citation Verifier',
    description: 'Re-query, drift & hallucinations',
  },
  {
    to: '/admin/reviews',
    icon: Star,
    label: 'Review Detector',
    description: 'Detect apps, inject schema',
  },
];

export function AdminShell({ children }: Props) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('admin_api_key');
    navigate('/admin', { replace: true });
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#08090A', color: '#E2E8F0', fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 w-56"
        style={{
          background: '#0D0D0F',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Logo / brand */}
        <div
          className="px-5 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
            >
              <ShieldCheck size={14} color="#000" />
            </div>
            <span className="font-bold text-[14px] text-white">GEO Admin</span>
          </div>
          <span
            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            INTERNAL TOOLS
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, description }) => (
            <NavLink
              key={to}
              to={to}
              className="rounded-lg px-3 py-2.5 flex items-start gap-3 transition-colors group"
              style={({ isActive }) => ({
                background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: isActive ? '#F59E0B' : '#64748B' }}
                  />
                  <div>
                    <p
                      className="text-[13px] font-medium leading-tight"
                      style={{ color: isActive ? '#F59E0B' : '#94A3B8' }}
                    >
                      {label}
                    </p>
                    <p className="text-[11px] leading-snug mt-0.5" style={{ color: '#475569' }}>
                      {description}
                    </p>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-red-500/10 group"
          >
            <LogOut size={15} style={{ color: '#64748B' }} className="group-hover:text-red-400 transition-colors" />
            <span className="text-[13px] font-medium" style={{ color: '#64748B' }}>
              Sign out
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
