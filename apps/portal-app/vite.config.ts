import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 极简门户：只有首页一个入口，不接任何子应用路由
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: false,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  base: '/',
})