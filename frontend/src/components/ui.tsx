'use client';
import { AlertCircle, Loader2, X, Braces } from 'lucide-react';
import { useEffect, useRef } from 'react';
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Braces size={21} strokeWidth={2.5} />
      </span>
      <span>
        Code<span className="brand-light">Atlas</span>
        <sup>AI</sup>
      </span>
    </div>
  );
}
export function ErrorBanner({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="notice error">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function Loading({ label = 'Loading workspace…' }: { label?: string }) {
  return (
    <div className="loading">
      <Loader2 className="spin" size={20} />
      {label}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>('button,input,textarea,select,a[href]') || [],
      );
    focusables()
      .find((el) => el.tagName === 'INPUT')
      ?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const els = focusables();
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
