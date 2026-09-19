import { Link } from 'react-router-dom';
import { useServer } from '../lib/server';
import { useMe } from '../lib/auth';
import { API_BASE_URL } from '../lib/api';
import { LiveMap } from '../components/LiveMap';
import { ExpiringSoon } from '../components/ExpiringSoon';

export function Dashboard() {
  const { state, reload: retry } = useServer();
  const me = useMe();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Good to see you, {me.principal.firstName}</h1>
        <p className="text-sm text-gray-500">{me.tenant.name} · loads and revenue appear here once orders arrive in Phase 3.</p>
      </div>

      <ExpiringSoon />

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Server</h2>
        {state.kind === 'loading' && <p className="text-sm text-gray-500">Connecting to {API_BASE_URL}…</p>}
        {state.kind === 'down' && (
          <div className="rounded-lg bg-danger-lt p-4 text-sm">
            <p className="font-medium text-danger">Cannot reach the API</p>
            <p className="mt-1 break-all text-gray-700">{API_BASE_URL}</p>
            <p className="mt-1 text-gray-500">{state.reason}</p>
            <button onClick={retry} className="mt-3 rounded-md bg-accent-500 px-3 py-1.5 text-white hover:bg-accent-400">
              Retry
            </button>
          </div>
        )}
        {state.kind === 'ok' && (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Status" value={<span className="text-success">● Connected</span>} />
            <Stat label="Stage" value={state.health.stage} />
            <Stat label="Endpoint" value={<span className="break-all">{new URL(API_BASE_URL).host}</span>} />
            <Stat
              label="Features"
              value={Object.entries(state.config.features).map(([k, on]) => (
                <span key={k} className={`mr-2 inline-block ${on ? 'text-success' : 'text-gray-400'}`}>
                  {on ? '●' : '○'} {k}
                </span>
              ))}
            />
          </dl>
        )}
      </section>

      {state.kind === 'ok' && state.config.map && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Fleet map</h2>
            <Link to="/live-map" className="text-sm text-accent-600 hover:underline">
              Open live map →
            </Link>
          </div>
          <div className="relative">
            <LiveMap styleUrl={state.config.map.styleUrl} className="h-[360px]" />
            <div className="pointer-events-none absolute bottom-4 left-4 max-w-[70%] rounded-md bg-white/90 px-3 py-1.5 text-xs text-gray-600 shadow">
              No trucks reporting yet — positions arrive with GPS in Phase 6
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}
