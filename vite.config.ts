import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react', 'react-dom'],
          motion:   ['framer-motion'],
          charts:   ['recharts'],
          pdf:      ['jspdf', 'jspdf-autotable'],
          ui:       ['lucide-react'],
        },
      },
    },
  },
});
