import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-950 p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-navy-800 font-bold text-accent-500">R</div>
          <span className="text-lg font-semibold">RouteIQ</span>
        </Link>
        <div>
          <p className="text-3xl font-semibold leading-tight">Dispatch, drivers and paperwork in one place.</p>
          <p className="mt-3 text-gray-400">Built for small and mid-size carriers.</p>
        </div>
        <p className="text-xs text-navy-label">© {new Date().getFullYear()} RouteIQ</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">{subtitle}</p>
          {children}
          <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
