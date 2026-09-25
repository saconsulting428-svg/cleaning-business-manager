import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // The single-file preview build needs one JS bundle it can inline.
        ...(mode === 'preview'
          ? { inlineDynamicImports: true }
          : {
              manualChunks: {
                react: ['react', 'react-dom', 'react-router-dom'],
                charts: ['recharts'],
                icons: ['lucide-react'],
              },
            }),
      },
    },
  },
}));
