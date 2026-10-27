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

  const indexRedirect = {
    name: 'index-redirect',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/index') {
          res.statusCode = 301
          res.setHeader('Location', '/')
          res.end()
          return
        }
        next()
      })
    }
  }

  const plugins = [vue(), indexRedirect]
    if (logPlugin) plugins.unshift(logPlugin)

    return {
      plugins,
      css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
          silenceDeprecations: ['legacy-js-api']
        },
        sass: {
          api: 'modern',
          silenceDeprecations: ['legacy-js-api']
        }
      }
    },
    server: { host: '0.0.0.0', port: 5175, strictPort: true },
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    base: '/horizontal-canvas/',
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
