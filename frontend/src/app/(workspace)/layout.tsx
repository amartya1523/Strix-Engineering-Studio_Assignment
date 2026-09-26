'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FolderKanban,
  History,
  SlidersHorizontal,
  LogOut,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { Brand, Loading, ErrorBanner } from '@/components/ui';
import { api, errorMessage, ApiError } from '@/lib/api';
import { User } from '@/lib/types';
import { MotionSurface } from '@/components/motion-surface';
export default function Workspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
        else setError(errorMessage(err));
      });
  }, [router]);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  if (!user)
    return (
      <main className="initial-load">
        <Brand />
        {error ? (
          <>
            <ErrorBanner message={error} />
            <button className="btn" onClick={() => window.location.reload()}>
              Retry connection
            </button>
          </>
        ) : (
          <Loading />
        )}
      </main>
    );
  const nav = [
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/history', label: 'Review history', icon: History },
    { href: '/providers', label: 'AI providers', icon: SlidersHorizontal },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <Link href="/projects" aria-label="CodeAtlas home">
          <Brand />
        </Link>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={path.startsWith(href) ? 'active' : ''}
            >
              <Icon size={19} />
              {label}
              {path.startsWith(href) && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={19} />
            <strong>Bring your own intelligence.</strong>
            <p>Connect a cloud model or keep things local. You’re in control.</p>
            <Link href="/providers">
              Configure a provider <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="user-box">
            <div className="avatar">{user.name[0].toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <button className="icon-btn" aria-label="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-btn mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <span className="muted">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {path.startsWith('/history')
                ? 'Review history'
                : path.startsWith('/providers')
                  ? 'AI providers'
                  : 'Projects'}
            </strong>
          </div>
          <span className="topbar-badge">
            <span className="live-dot" /> AI-powered code intelligence
          </span>
        </header>
        <ErrorBanner message={error} />
        <MotionSurface>{children}</MotionSurface>
        <footer className="workspace-footer">
          <span>Built for better decisions.</span>
          <span>
            CodeAtlas <span className="muted">/</span> v1.0
          </span>
        </footer>
      </div>
    </div>
  );
}
