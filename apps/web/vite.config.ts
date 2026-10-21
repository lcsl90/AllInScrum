import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const SERVER_URL = process.env['ALLINSCRUM_SERVER_URL'] ?? 'http://localhost:41400';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Im Entwicklungsmodus läuft der Realtime-Server separat – Vite reicht WebSockets durch.
    proxy: {
      '/socket.io': { target: SERVER_URL, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
