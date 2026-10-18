import { defineConfig } from 'vite';

// base './' để chạy được trên GitHub Pages, Cloudflare Pages hoặc thư mục con bất kỳ
export default defineConfig({
  base: './',
  test: { environment: 'jsdom' },
} as any);
