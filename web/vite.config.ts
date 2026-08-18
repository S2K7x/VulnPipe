import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * L'API tourne sur un port séparé (`npm run serve`). Le proxy évite d'avoir à
 * gérer CORS en développement et permet d'utiliser des chemins relatifs dans
 * le client : la même build fonctionne derrière un reverse-proxy en production.
 */
const API_PORT = process.env.VULNPIPE_API_PORT ?? '4319';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/estimate': `http://localhost:${API_PORT}`,
      '/webhook': `http://localhost:${API_PORT}`,
      '/runs': `http://localhost:${API_PORT}`,
      '/providers': `http://localhost:${API_PORT}`,
    },
  },
});
