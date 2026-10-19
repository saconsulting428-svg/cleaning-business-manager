import { defineConfig } from 'vite';

// Relative base so the build works from file:// and inside a Capacitor WebView.
export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
