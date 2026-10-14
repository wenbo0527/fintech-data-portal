import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { llmBridge } from './src/plugins/llmBridge'

// monorepo 根目录：语义契约包（源码直出）在此目录下解析
const ROOT = path.resolve(__dirname, '../..')

export default defineConfig({
  plugins: [
    vue(),
    // dev 期 LLM 桥接：转发「模型服务设置」中的 OpenAI 兼容端点，规避浏览器 CORS
    llmBridge()
  ],
  server: {
    host: '0.0.0.0',
    port: 8100,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../..'),
        path.resolve(__dirname, '../../packages')
      ]
    }
  },
  resolve: {
    // 数组式：长前缀（契约包子路径）优先，最后是宽泛的 @
    alias: [
      {
        find: '@data-community/semantic-contract/types',
        replacement: path.resolve(ROOT, 'packages/semantic-contract/src/types.ts')
      },
      {
        find: '@data-community/semantic-contract/query',
        replacement: path.resolve(ROOT, 'packages/semantic-contract/src/query.ts')
      },
      {
        find: '@data-community/semantic-contract/data/metrics',
        replacement: path.resolve(ROOT, 'packages/semantic-contract/src/data/metrics.ts')
      },
      {
        find: '@data-community/semantic-contract/data/knowledge',
        replacement: path.resolve(ROOT, 'packages/semantic-contract/src/data/knowledge.ts')
      },
      // 语义契约包：源码直出，不指向 dist
      {
        find: '@data-community/semantic-contract',
        replacement: path.resolve(ROOT, 'packages/semantic-contract/src/index.ts')
      },
      { find: '@', replacement: path.resolve(__dirname, 'src') }
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          arco: ['@arco-design/web-vue'],
          utils: ['dayjs']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  base: '/semantic-app/'
})
