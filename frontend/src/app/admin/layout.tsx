'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Armchair, ArrowUpRight, CalendarDays, LayoutDashboard, LoaderCircle,
  LockKeyhole, LogOut, Package, Palette, ShoppingBag,
} from 'lucide-react';
import styles from './admin-shell.module.css';

const NAV = [
  { href: '/admin/builder', label: 'Sofa Builder', icon: Armchair },
  { href: '/admin/alashi', label: 'ALASHI AI', icon: Palette },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Armchair },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/swatch-requests', label: 'Swatches', icon: Palette },
  { href: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const pathname = usePathname().replace(/\/+$/, '') || '/';

  useEffect(() => {
    let active = true;
    fetch('/api/admin/auth/', { cache: 'no-store' }).then(async response => {
      const valid = response.ok && (await response.json()).valid;
      if (active) setAuthenticated(Boolean(valid));
      if (!valid) { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_token_expires'); }
    }).catch(() => { if (active) setError('Could not verify your session. Please sign in again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid password');
        setLoggingIn(false);
        return;
      }

      setAuthenticated(true);
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      const response = await fetch('/api/admin/auth', { method: 'DELETE', signal: AbortSignal.timeout(10000) });
      if (!response.ok || !(await response.json()).success) throw new Error('Sign-out failed');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token_expires');
      setAuthenticated(false);
      setPassword('');
      setError('');
    } catch {
      setLogoutError('Could not sign out. Check your connection and try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className={`admin-dark ${styles.shell} ${styles.authPage}`}>
        <div className={styles.loading} role="status">
          <LoaderCircle className={styles.spinner} size={28} aria-hidden="true" />
          <p>Opening your workspace...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={`admin-dark ${styles.shell} ${styles.authPage}`}>
        <Link href="/" className={styles.authBrand} aria-label="Corner Sofa home">
          <Armchair size={23} strokeWidth={1.6} aria-hidden="true" />
          <span>corner<span className={styles.brandDot}>.</span></span>
        </Link>
        <section className={styles.authCard} aria-labelledby="admin-login-title">
          <div className={styles.lockIcon}><LockKeyhole size={25} strokeWidth={1.6} aria-hidden="true" /></div>
          <p className={styles.eyebrow}>YOUR STORE, AT A GLANCE</p>
          <h1 id="admin-login-title">Welcome back<span>.</span></h1>
          <p className={styles.authDescription}>Sign in to your Corner Sofa workspace.</p>

          <form onSubmit={handleLogin} className={styles.authForm}>
            <label htmlFor="admin-username">Admin username</label>
            <div className={styles.inputWrap}>
              <Armchair size={17} aria-hidden="true" />
              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <label htmlFor="admin-password">Admin password</label>
            <div className={styles.inputWrap}>
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby={error ? 'admin-login-error' : undefined}
                aria-invalid={Boolean(error)}
              />
            </div>
            {error && <p id="admin-login-error" className={styles.error} role="alert">{error}</p>}
            <button type="submit" disabled={loggingIn} className={styles.signIn}>
              {loggingIn ? <><LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> Signing in...</> : <>Sign in to workspace <ArrowUpRight size={19} aria-hidden="true" /></>}
            </button>
          </form>
          <Link href="/" className={styles.backToStore}>Back to the store <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </section>
        <p className={styles.authFooter}>Corner Sofa · Admin workspace</p>
      </div>
    );
  }

  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className={`admin-dark ${styles.shell}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/admin" className={styles.brand} aria-label="Corner Sofa admin dashboard">
            <span className={styles.brandIcon}><Armchair size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className={styles.brandName}>corner<span className={styles.brandDot}>.</span></span>
            <span className={styles.brandDivider}>/</span>
            <span className={styles.workspaceLabel}>workspace</span>
          </Link>

          <nav className={styles.nav} aria-label="Admin navigation">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={`${styles.navLink} ${isActive(href) ? styles.active : ''}`}>
                <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <Link href="/" className={styles.viewStore}>
              <ShoppingBag size={15} strokeWidth={1.7} aria-hidden="true" /><span>View store</span><ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <button onClick={handleLogout} disabled={loggingOut} className={styles.signOut} aria-label="Sign out" aria-busy={loggingOut} title="Sign out">{loggingOut ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" /> : <LogOut size={17} strokeWidth={1.7} aria-hidden="true" />}</button>
            <span className={styles.avatar} aria-label="Admin workspace">CS</span>
          </div>
        </div>
      </header>
      <div className={`${styles.content} ${pathname !== '/admin' ? styles.legacyContent : ''}`}>
        {logoutError && <p className={styles.error} role="alert">{logoutError}</p>}
        {children}
      </div>
    </div>
  );
}
