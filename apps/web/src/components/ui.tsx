import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { ApiFailure } from '../lib/api';

export function Button({
  variant = 'primary',
  busy,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean }) {
  const styles = {
    primary: 'bg-accent-500 text-white hover:bg-accent-400 active:bg-accent-600',
    secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'border border-red-200 bg-white text-danger hover:bg-danger-lt',
  }[variant];
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...input}
        aria-invalid={!!error}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 ${
          error ? 'border-danger focus:ring-red-100' : 'border-gray-300 focus:border-accent-500 focus:ring-cyan-100'
        }`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Select({
  label,
  options,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select {...rest} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-accent-500">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    danger: 'bg-danger-lt text-danger',
    success: 'bg-success-lt text-success',
    info: 'bg-cyan-50 text-accent-600',
  }[tone];
  return <div className={`rounded-lg px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'gray' | 'blue'; children: ReactNode }) {
  const styles = {
    green: 'bg-success-lt text-success',
    amber: 'bg-amber-50 text-warning',
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-cyan-50 text-accent-600',
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy-950/50 p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Shows a just-issued code once, with copy. The server keeps only a hash — it cannot show it again. */
export function IssuedCode({ code, expiresAt, who }: { code: string; expiresAt: string; who: ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">{who}</p>
      <div className="flex items-center justify-between rounded-lg bg-navy-950 px-4 py-3">
        <span className="font-mono text-2xl tracking-[0.2em] text-white">{code}</span>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Single use · expires {new Date(expiresAt).toLocaleDateString()} · <strong>shown only once</strong> — issue a new
        one if it's lost.
      </p>
    </div>
  );
}

/** Pulls per-field messages out of an API failure for a form. */
export function useFormErrors() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  return {
    fields,
    message,
    clear: () => {
      setFields({});
      setMessage(null);
    },
    set: (e: unknown) => {
      if (e instanceof ApiFailure) {
        setFields(e.fields);
        setMessage(Object.keys(e.fields).length && e.code === 'VALIDATION_FAILED' ? null : e.message);
      } else setMessage('Could not reach the server. Check your connection and try again.');
    },
  };
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
