import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run single` -> dist-single/index.html : the whole game (JS, CSS, fonts) in ONE html file.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2019', outDir: 'dist-single', chunkSizeWarningLimit: 4000, assetsInlineLimit: 100000000 },
});
