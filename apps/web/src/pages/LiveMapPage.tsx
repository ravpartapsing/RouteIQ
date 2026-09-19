import { Navigate } from 'react-router-dom';
import { useServer } from '../lib/server';
import { LiveMap } from '../components/LiveMap';

export function LiveMapPage() {
  const { state } = useServer();
  if (state.kind !== 'ok') return <p className="text-sm text-gray-500">Waiting for the server…</p>;
  // Switch off: the page does not exist, even by typed URL.
  if (!state.config.map) return <Navigate to="/" replace />;

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)]">
      <LiveMap styleUrl={state.config.map.styleUrl} className="h-full w-full" />
    </div>
  );
}
