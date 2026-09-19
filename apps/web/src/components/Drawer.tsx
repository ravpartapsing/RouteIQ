import { useEffect, type ReactNode } from 'react';

/** Right-hand detail panel, as in the design doc's document viewer (§18). */
export function Drawer({ title, subtitle, onClose, actions, children }: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-navy-950/40" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100">
              ✕
            </button>
          </div>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function Facts({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase tracking-wide text-gray-500">{k}</dt>
          <dd className="mt-0.5 break-words text-gray-900">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
