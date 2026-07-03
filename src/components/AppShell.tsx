'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthUser, getToken, getUser, clearSession, canViewAudit, canViewReports, canManageUsers } from '@/lib/auth-client';

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: 'Asoschi',
  MANAGER: 'Menejer',
  CHIEF_MECHANIC: 'Bosh mexanik',
  MECHANIC: 'Mexanik',
};

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: 'block', padding: '9px 14px', borderRadius: 6, marginBottom: 2,
        color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        borderLeft: active ? '3px solid var(--sidebar-accent)' : '3px solid transparent',
        fontWeight: active ? 600 : 400, textDecoration: 'none', fontSize: 13.5,
      }}
    >
      {label}
    </a>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

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

  const navItems = [
    { href: '/dashboard', label: 'Bosh sahifa' },
    { href: '/cars', label: 'Avtolar' },
    { href: '/drivers', label: 'Haydovchilar' },
    { href: '/transactions', label: 'Tranzaksiyalar' },
    ...(canViewReports(user.rol) ? [{ href: '/reports', label: 'Hisobotlar' }] : []),
    ...(canViewAudit(user.rol) ? [{ href: '/audit', label: 'Audit log' }] : []),
    ...(canManageUsers(user.rol) ? [{ href: '/users', label: 'Foydalanuvchilar' }] : []),
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: 'var(--sidebar-bg)', padding: '20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 28 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7, background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12,
          }}>MT</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>M-T Transport</span>
        </div>

        <nav>
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: 56, borderBottom: '1px solid var(--border)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {user.ism_sharif} · <span className="badge badge-neutral">{ROLE_LABELS[user.rol] || user.rol}</span>
          </span>
          <button className="btn" onClick={handleLogout}>Chiqish</button>
        </header>
        <main style={{ flex: 1, padding: 28 }}>{children}</main>
      </div>
    </div>
  );
}
