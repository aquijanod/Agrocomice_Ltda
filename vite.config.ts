import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Indica que la raíz del proyecto es el directorio actual
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './index.html', // Punto de entrada explícito
    },
  },
});