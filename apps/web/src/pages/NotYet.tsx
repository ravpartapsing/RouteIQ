import { useLocation } from 'react-router-dom';
import { NAV } from '../lib/nav';

export function NotYet() {
  const { pathname } = useLocation();
  const item = NAV.flatMap((g) => g.items).find((i) => i.path === pathname);
  return (
    <div className="grid h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-xl font-semibold">{item?.label ?? 'Not found'}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {item?.phase ? `Arrives in Phase ${item.phase} of the build plan.` : 'This page does not exist.'}
        </p>
      </div>
    </div>
  );
}
