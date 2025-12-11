import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Isso garante que o site funcione em subpastas (ex: github.io/repo)
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});