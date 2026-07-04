'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Truck, Users as UsersIcon, Receipt, BarChart3,
  History, UserCog, LogOut, MoreHorizontal, X,
} from 'lucide-react';
import { AuthUser, getToken, getUser, clearSession, canViewAudit, canViewReports, canManageUsers } from '@/lib/auth-client';
import Logo from './Logo';

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi', MANAGER: 'Menejer', CHIEF_MECHANIC: 'Bosh mexanik', MECHANIC: 'Mexanik',
};

function SidebarLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
        color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 600 : 400,
      }}
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </a>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (!token || !u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setChecked(true);
  }, [router]);

  if (!checked || !user) {
    return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>;
  }

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  const allItems = [
    { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, show: true },
    { href: '/cars', label: 'Avtolar', icon: Truck, show: true },
    { href: '/drivers', label: 'Haydovchilar', icon: UsersIcon, show: true },
    { href: '/transactions', label: 'Tranzaksiya', icon: Receipt, show: true },
    { href: '/reports', label: 'Hisobotlar', icon: BarChart3, show: canViewReports(user.rol) },
    { href: '/audit', label: 'Audit log', icon: History, show: canViewAudit(user.rol) },
    { href: '/users', label: 'Foydalanuvchilar', icon: UserCog, show: canManageUsers(user.rol) },
  ].filter((i) => i.show);

  const primaryMobile = allItems.slice(0, 4);
  const moreMobile = allItems.slice(4);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="desktop-sidebar" style={{ width: 220, background: 'var(--sidebar-bg)', padding: '20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px', marginBottom: 28 }}>
          <Logo size={28} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>M-T Transport</span>
        </div>

        <nav>
          {allItems.map((item) => (
            <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href} />
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          minHeight: 56, borderBottom: '1px solid var(--border)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 12,
          flexWrap: 'wrap',
        }}>
          <div className="mobile-only-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={24} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>M-T Transport</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span className="header-user-label" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {user.ism_sharif} · <span className="badge badge-neutral">{ROLE_LABELS[user.rol] || user.rol}</span>
            </span>
            <button className="btn" onClick={handleLogout}><LogOut size={15} /> Chiqish</button>
          </div>
        </header>

        <main className="app-main-content page-container" style={{ flex: 1 }}>{children}</main>
      </div>

      {/* Mobil pastki tab-bar */}
      <nav className="mobile-tabbar">
        {primaryMobile.map((item) => (
          <a key={item.href} href={item.href} className={'tabbar-item' + (pathname === item.href ? ' active' : '')}>
            <item.icon size={20} strokeWidth={pathname === item.href ? 2.3 : 1.8} />
            {item.label}
          </a>
        ))}
        {moreMobile.length > 0 && (
          <button className="tabbar-item" style={{ background: 'none', border: 'none' }} onClick={() => setMoreOpen(true)}>
            <MoreHorizontal size={20} strokeWidth={1.8} />
            Ko'proq
          </button>
        )}
      </nav>

      {moreOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,31,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            style={{ background: 'var(--surface)', width: '100%', borderRadius: '16px 16px 0 0', padding: 16, paddingBottom: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2>Ko'proq</h2>
              <button className="btn" style={{ padding: 6 }} onClick={() => setMoreOpen(false)}><X size={16} /></button>
            </div>
            {moreMobile.map((item) => (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px',
                color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14, borderBottom: '1px solid var(--border)',
              }}>
                <item.icon size={18} /> {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
