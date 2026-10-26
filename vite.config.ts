import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://prabhav558.github.io/portfolio_2/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/portfolio_2/' : '/',
  plugins: [react()],
  server: { port: 5173 },
}));
