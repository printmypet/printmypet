
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // A base './' é crucial para ambientes de preview (sandbox) onde o site não roda na raiz do domínio.
  base: './', 
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
