import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const ARCHIVE_SHARED = path.resolve(ROOT, 'archive/legacy-src/mock/shared')

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
      port: Number(process.env.DMT_PORT || process.env.PORT) || 5181,
      strictPort: true,
      fs: {
        // 直接允许 vite 读取 archive（冻结归档，但仍可作为构建源），
        // 消除 dmt-app 下 classify-* 副本与归档不一致的风险。
        allow: [path.resolve(__dirname), ARCHIVE_SHARED],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // classify-* mock 直接来自归档目录（source of truth），不再依赖 dmt-app 下的副本
        '@shared': ARCHIVE_SHARED,
      },
    },
    base: '/dmt/',
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
