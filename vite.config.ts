import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 개발 중 백엔드 프록시 — API_BASE 설정 없이도 동작
      '/api': 'http://localhost:3001',
    },
  },
});
