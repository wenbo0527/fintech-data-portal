/**
 * ⚠️ 本子应用已归档（ARCHIVED 2026-09-09）
 * 业务能力已合并至 apps/data-community-app/（http://localhost:5185/data-community/）
 * 此配置文件保留作为历史参考，请勿再用于生产部署。
 * 详见 ./ARCHIVED.md
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(async () => {
  let logPlugin: any = null
  try {
    const mod = await import('../../vite-plugins/logServerPlugin.js')
    logPlugin = (mod as any)?.logServerPlugin?.()
  } catch {
    logPlugin = null
  }

  const plugins = [vue()]
  if (logPlugin) plugins.unshift(logPlugin)

  return {
    plugins,
    server: {
      host: '0.0.0.0',
      port: 5185,
      strictPort: true,
      fs: {
        allow: [
          path.resolve(__dirname),
          path.resolve(__dirname, '../data-community-app/src')
        ]
      }
    },
    resolve: {
      alias: {
      '@': path.resolve(__dirname, 'src'),
      // 修正 (R3): 原来 '../../src/mock/shared' 解析到 apps/data_community/src/mock/shared (上层, 错)
      // 实际 dfd-app 自己的 mock 在 apps/dfd-app/src/mock/shared/
      '@shared': path.resolve(__dirname, 'src/mock/shared'),
      // 复用 data-community-app 公共组件
      '@dca-components': path.resolve(__dirname, '../data-community-app/src/components-dca'),
      // 复用 data-community-app composables
      '@composables': path.resolve(__dirname, '../data-community-app/src/composables')
    }
    },
    base: '/dfd/',
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
            arco: ['@arco-design/web-vue'],
            api: ['axios', '@app/shared-api'],
          },
        },
      },
      chunkSizeWarning: 600,
    },
  }
})
