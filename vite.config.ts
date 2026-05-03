/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true,
    host: '127.0.0.1',
  },
  test: {
    globals: true,
  },
});
