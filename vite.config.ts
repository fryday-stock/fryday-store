import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// الموقع ينشر على https://fryday-stock.github.io/fryday-store/
export default defineConfig({
  base: '/fryday-store/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { rollupOptions: { input: { main: path.resolve(__dirname, 'index.html'), design: path.resolve(__dirname, 'design.html') } } },
})
