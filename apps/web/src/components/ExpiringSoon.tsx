import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DueItem } from '@routeiq/contracts';
import { request } from '../lib/api';

const KIND: Record<DueItem['kind'], string> = {
  CDL: 'CDL',
  MEDICAL: 'Medical card',
  REGISTRATION: 'Registration',
  INSURANCE: 'Insurance',
  INSPECTION: 'Annual inspection',
  INVOICE_DUE: 'Invoice',
};
const WHERE: Record<DueItem['entityType'], string> = { DRIVER: '/drivers', TRUCK: '/fleet', TRAILER: '/fleet?tab=trailers' };

function when(days: number) {
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'today';
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/** Compliance at a glance: anything expired or expiring in the next 60 days. */
export function ExpiringSoon() {
  const [items, setItems] = useState<DueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    request<{ items: DueItem[] }>('GET', '/v1/compliance/due?withinDays=60')
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  const overdue = items?.filter((i) => i.daysLeft < 0).length ?? 0;
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-700">Expiring soon</h2>
        {overdue > 0 && <span className="rounded-full bg-danger-lt px-2 py-0.5 text-xs font-medium text-danger">{overdue} overdue</span>}
      </div>
      {error && <p className="px-5 py-4 text-sm text-danger">{error}</p>}
      {items === null && !error && <p className="px-5 py-4 text-sm text-gray-400">Loading…</p>}
      {items?.length === 0 && (
        <p className="px-5 py-6 text-center text-sm text-gray-500">Nothing expires in the next 60 days.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {items?.slice(0, 8).map((i) => (
          <li key={`${i.entityId}-${i.kind}`}>
            <Link to={WHERE[i.entityType]} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-gray-50">
              <span>
                <span className="font-medium">{i.label}</span>
                <span className="text-gray-500"> · {KIND[i.kind]}</span>
              </span>
              <span className={`shrink-0 ${i.daysLeft < 0 ? 'font-medium text-danger' : i.daysLeft <= 30 ? 'text-warning' : 'text-gray-500'}`}>
                {when(i.daysLeft)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {items && items.length > 8 && <p className="px-5 py-2 text-xs text-gray-500">+ {items.length - 8} more</p>}
    </section>
  );
}
