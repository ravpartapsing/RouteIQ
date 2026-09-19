import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 5173 is the origin the deployed API allows via CORS; strictPort so it never drifts to 5174.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Resolve workspace packages to their TypeScript source, as the API does.
  resolve: { conditions: ['development'] },
  server: { port: 5173, strictPort: true },
});
