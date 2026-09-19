import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { ServerProvider } from './lib/server';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { LiveMapPage } from './pages/LiveMapPage';
import { NotYet } from './pages/NotYet';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServerProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="live-map" element={<LiveMapPage />} />
            <Route path="*" element={<NotYet />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ServerProvider>
  </StrictMode>,
);
