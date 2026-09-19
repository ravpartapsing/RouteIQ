import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { NAV } from '../lib/nav';
import { useServer } from '../lib/server';
import { API_BASE_URL } from '../lib/api';

export function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const { state } = useServer();
  const mapsOn = state.kind === 'ok' && state.config.features.maps;

  return (
    <div className="flex h-full flex-col">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-gray-200 bg-white">
        <div className={`flex items-center gap-2 px-4 ${collapsed ? 'w-16' : 'w-60'}`}>
          <div className="grid h-8 w-8 place-items-center rounded-md bg-navy-950 text-sm font-bold text-accent-500">R</div>
          {!collapsed && <span className="font-semibold text-navy-950">RouteIQ</span>}
        </div>
        <div className="mx-4 hidden h-9 max-w-[480px] flex-1 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm text-gray-400 md:flex">
          <span>⌕</span>
          <span className="flex-1">Search orders, drivers, trucks…</span>
          <span className="rounded bg-gray-200 px-1.5 text-[11px] text-gray-500">⌘K</span>
        </div>
        <div className="ml-auto flex items-center gap-4 px-4">
          <ConnectionPill />
          <div className="grid h-8 w-8 place-items-center rounded-full bg-navy-700 text-xs font-medium text-white">RS</div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        <aside
          className={`fixed bottom-0 left-0 top-14 flex flex-col bg-navy-950 transition-[width] duration-[250ms] ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          <nav className="flex-1 overflow-y-auto py-4">
            {NAV.map((group) => (
              <div key={group.section} className="mb-4">
                {!collapsed && (
                  <div className="mb-1 px-4 text-[10px] font-medium tracking-wide text-navy-label">{group.section}</div>
                )}
                {group.items
                  .filter((item) => item.feature !== 'maps' || mapsOn)
                  .map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      title={item.label}
                      className={({ isActive }) =>
                        `mx-2 flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                          isActive ? 'bg-navy-700 text-white' : 'text-gray-400 hover:bg-navy-800 hover:text-white'
                        }`
                      }
                    >
                      <span className="w-5 text-center">{item.icon}</span>
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && item.phase && (
                        <span className="rounded bg-navy-800 px-1.5 text-[10px] text-navy-label">P{item.phase}</span>
                      )}
                    </NavLink>
                  ))}
              </div>
            ))}
          </nav>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="m-2 h-9 rounded-md text-gray-400 hover:bg-navy-800 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </aside>

        <main className={`flex-1 transition-[margin] duration-[250ms] ${collapsed ? 'ml-16' : 'ml-60'}`}>
          <div className="mx-auto max-w-[1440px] p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function ConnectionPill() {
  const { state } = useServer();
  const host = new URL(API_BASE_URL).host;
  const [dot, text] =
    state.kind === 'ok'
      ? ['bg-success', `API · ${state.health.stage}`]
      : state.kind === 'down'
        ? ['bg-danger', 'API unreachable']
        : ['bg-gray-300', 'Connecting…'];
  return (
    <div title={host} className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </div>
  );
}
