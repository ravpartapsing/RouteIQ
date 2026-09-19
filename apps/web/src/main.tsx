import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './index.css';
import { ServerProvider } from './lib/server';
import { AuthProvider, useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { LiveMapPage } from './pages/LiveMapPage';
import { NotYet } from './pages/NotYet';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Activate } from './pages/Activate';
import { Drivers } from './pages/Drivers';
import { Team } from './pages/Team';
import { Settings } from './pages/Settings';
import { Fleet } from './pages/Fleet';
import { Customers } from './pages/Customers';
import { Locations } from './pages/Locations';

function Splash() {
  return <div className="grid h-full place-items-center text-sm text-gray-400">Loading…</div>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();
  if (state.kind === 'loading') return <Splash />;
  if (state.kind === 'anon') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function AnonOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.kind === 'loading') return <Splash />;
  if (state.kind === 'authed') return <Navigate to="/" replace />;
  return children;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServerProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="login" element={<AnonOnly><Login /></AnonOnly>} />
            <Route path="register" element={<AnonOnly><Register /></AnonOnly>} />
            <Route path="activate" element={<AnonOnly><Activate /></AnonOnly>} />
            <Route element={<RequireAuth><Shell /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="live-map" element={<LiveMapPage />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
              <Route path="fleet" element={<Fleet />} />
              <Route path="customers" element={<Customers />} />
              <Route path="locations" element={<Locations />} />
              <Route path="*" element={<NotYet />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ServerProvider>
  </StrictMode>,
);
