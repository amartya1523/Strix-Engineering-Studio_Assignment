'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ShieldCheck, Terminal, Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { Brand, ErrorBanner } from './ui';
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(data)),
      });
      router.replace('/projects');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="eyebrow">
            <span className="live-dot" /> YOUR CODE. A CLEARER PICTURE.
          </span>
          <h1>
            Ship with
            <br />a little more
            <br />
            <span>confidence.</span>
          </h1>
          <p>
            A thoughtful second pair of eyes for your code.
            <br />
            Find the risks. Understand the architecture.
            <br />
            Build something better.
          </p>
          <div className="auth-terminal">
            <div className="terminal-top">
              <span />
              <span />
              <span />
              <small>codeatlas / review</small>
            </div>
            <code>
              <span className="muted">$</span> review ./your-next-big-idea
              <br />
              <br />
              <span className="lime">✓</span> Code context loaded
              <br />
              <span className="lime">✓</span> Security & quality analyzed
              <br />
              <span className="lime">✓</span> Actionable insights, ready.
            </code>
          </div>
          <div className="auth-benefits">
            <span>
              <Check size={15} /> Your choice of model
            </span>
            <span>
              <Check size={15} /> Cloud or local
            </span>
          </div>
        </div>
        <div className="auth-foot">
          <ShieldCheck size={15} /> API keys encrypted. Code stays in your workspace.
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <div className="auth-icon">
            <Terminal size={24} />
          </div>
          <span className="eyebrow">WELCOME TO CODEATLAS</span>
          <h2>{register ? 'Make room for better code.' : 'Good to see you again.'}</h2>
          <p className="muted">
            {register
              ? 'Create your account and start exploring.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <ErrorBanner message={error} />
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  required
                  maxLength={100}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder={register ? 'At least 8 characters' : 'Enter your password'}
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <button className="btn primary full" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  {register ? 'Create account' : 'Sign in to workspace'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New around here?'}{' '}
            <Link href={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'} <ArrowRight size={13} />
            </Link>
          </p>
          <div className="auth-note">
            <ShieldCheck size={15} /> Your workspace is private to your account.
          </div>
        </div>
      </section>
    </main>
  );
}
