import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(configDirectory, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, '');
  const apiPort = Number(env.API_PORT || 3001);
  const webPort = Number(env.VITE_DEV_PORT || 5173);

  return {
    envDir: repositoryRoot,
    plugins: [react()],
    server: {
      port: webPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
