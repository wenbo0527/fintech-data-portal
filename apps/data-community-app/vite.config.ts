import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const DFD = path.resolve(ROOT, 'apps/dfd-app/src')
const MONOREPO = path.resolve(ROOT, 'src')
const SHARED_UTILS_SRC = path.resolve(ROOT, 'packages/shared-utils/src')

export default defineConfig({
  plugins: [
    vue()
    // viteMockServe 已禁用 - 改为 ESM 方式加载 src/mock
  ],
  server: {
    host: '0.0.0.0',
    port: 5185,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(ROOT),
        path.resolve(DFD),
        path.resolve(ROOT, 'apps/dfd-app'),
        path.resolve(ROOT, 'apps/data-community-app'),
        path.resolve(ROOT, 'apps/dmt-app'),
        path.resolve(ROOT, 'apps/dex-app'),
        path.resolve(ROOT, 'apps/mkt-app'),
        path.resolve(ROOT, 'apps/touch'),
        path.resolve(ROOT, 'src'),
        path.resolve(ROOT, 'packages'),
        path.resolve(SHARED_UTILS_SRC),
      ]
    }
  },
  resolve: {
    // 用数组,长前缀优先
    alias: [
      // 最长前缀(最具体)放最前
      { find: '@/components-dca', replacement: path.resolve(__dirname, 'src/components-dca') },
      { find: '@/types-dca', replacement: path.resolve(__dirname, 'src/types-dca') },
      { find: '@/stores-dca', replacement: path.resolve(__dirname, 'src/stores-dca') },
      { find: '@/utils-dca', replacement: path.resolve(__dirname, 'src/utils-dca') },
      { find: '@/mock-dca', replacement: path.resolve(__dirname, 'src/mock') },
      { find: '@mock-dca', replacement: path.resolve(__dirname, 'src/mock') },
      { find: '@/mock-shared', replacement: path.resolve(__dirname, 'src/mock/shared') },
      { find: '@mock-shared', replacement: path.resolve(__dirname, 'src/mock/shared') },
      { find: '@/composables', replacement: path.resolve(__dirname, 'src/composables') },
      { find: '@/dfd-pages', replacement: path.resolve(DFD, 'pages') },
      { find: '@/shared', replacement: MONOREPO },
      // 跨子应用复用:dca 公共组件(data-community-app 解析 dfd-app 的 vue 时也需要这个 alias)
      { find: '@dca-components', replacement: path.resolve(__dirname, 'src/components-dca') },

      // dfd 子目录(中等长度)
      { find: '@/components', replacement: path.resolve(DFD, 'components') },
      // dfd-app 的 api 模块(data-community-app 中同名 src/api 仅含 search-shim.ts,
      // 此处统一把所有 @/api/<模块> 指向 dfd-app/src/api，
      // 与第 73 行的宽泛 @/api 别名配合使用，dca 自有 src/api 内容不覆盖 dfd 已存在的)
      { find: '@/api/variable-map', replacement: path.resolve(DFD, 'api/variable-map') },
      { find: '@/api/variable-management', replacement: path.resolve(DFD, 'api/variable-management') },
      { find: '@/api/offlineModel', replacement: path.resolve(DFD, 'api/offlineModel') },
      { find: '@/api/budget-monitor', replacement: path.resolve(DFD, 'api/budget-monitor') },
      { find: '@/api/budget', replacement: path.resolve(DFD, 'api/budget') },
      { find: '@/api/tag', replacement: path.resolve(DFD, 'api/tag') },
      { find: '@/api/alert', replacement: path.resolve(DFD, 'api/alert') },
      { find: '@/api/notification', replacement: path.resolve(DFD, 'api/notification') },
      { find: '@/api/permission', replacement: path.resolve(DFD, 'api/permission') },
      { find: '@/api/user', replacement: path.resolve(DFD, 'api/user') },
      { find: '@/api/dataModels', replacement: path.resolve(DFD, 'api/dataModels') },
      { find: '@/api/community', replacement: path.resolve(DFD, 'api/community') },
      { find: '@/api/metadata', replacement: path.resolve(DFD, 'api/metadata') },
      { find: '@/api/search-shim', replacement: path.resolve(DFD, 'api/search-shim') },

      // dca 引用 @/utils/copy，但 dfd-app 下没有 copy.js；
      // 实际来自 packages/shared-utils（未构建 dist，直接指向源码）
      { find: '@/utils/copy', replacement: path.resolve(SHARED_UTILS_SRC, 'copy.ts') },
      { find: '@/utils/message', replacement: path.resolve(SHARED_UTILS_SRC, 'message.ts') },
      { find: '@/utils/export', replacement: path.resolve(SHARED_UTILS_SRC, 'export.ts') },
      { find: '@/utils/coords', replacement: path.resolve(SHARED_UTILS_SRC, 'coords.ts') },
      { find: '@/utils/arco', replacement: path.resolve(SHARED_UTILS_SRC, 'arco.ts') },
      { find: '@/utils/validationUtils', replacement: path.resolve(SHARED_UTILS_SRC, 'validationUtils.ts') },

      // dfd-app mock 模块(data-community-app 中不存在,指向 dfd-app)
      // 注: Vite 字符串别名匹配规则为 精确匹配 或 find+'/' 前缀。
      // '@/mock/metrics' 不匹配 '@/mock/metrics.ts'(下一个字符是'.'不是'/')，
      // 故对 .ts 后缀导入需单独添加精确匹配别名。
      { find: '@/mock/metrics.ts', replacement: path.resolve(DFD, 'mock/metrics.ts') },
      { find: '@/mock/metrics', replacement: path.resolve(DFD, 'mock/metrics') },
      { find: '@/mock/community', replacement: path.resolve(DFD, 'mock/community') },
      { find: '@/mock/notification', replacement: path.resolve(DFD, 'mock/notification') },
      { find: '@/mock/offlineModel', replacement: path.resolve(DFD, 'mock/offlineModel') },
      { find: '@/mock/alertMetrics', replacement: path.resolve(DFD, 'mock/alertMetrics') },
      { find: '@/mock/external-data', replacement: path.resolve(DFD, 'mock/external-data') },
      { find: '@/mock/businessProcessData', replacement: path.resolve(DFD, 'mock/businessProcessData') },
      { find: '@/mock/businessModuleData', replacement: path.resolve(DFD, 'mock/businessModuleData') },
      { find: '@/mock/tableData.ts', replacement: path.resolve(DFD, 'mock/tableData.ts') },
      { find: '@/mock/tableData', replacement: path.resolve(DFD, 'mock/tableData') },
      { find: '@/mock/data-models', replacement: path.resolve(DFD, 'mock/data-models') },
      { find: '@/mock/alert-rules', replacement: path.resolve(DFD, 'mock/alert-rules') },
      { find: '@/mock/external-resources', replacement: path.resolve(DFD, 'mock/external-resources') },
      { find: '@/mock/event', replacement: path.resolve(DFD, 'mock/event') },
      { find: '@/mock/coupon', replacement: path.resolve(DFD, 'mock/coupon') },
      { find: '@/mock/budget', replacement: path.resolve(DFD, 'mock/budget') },
      { find: '@/mock/touch', replacement: path.resolve(DFD, 'mock/touch') },
      { find: '@/mock/data-map', replacement: path.resolve(DFD, 'mock/data-map') },
      { find: '@/mock/field-preview-data', replacement: path.resolve(DFD, 'mock/field-preview-data') },
      { find: '@/mock/regulatory-config', replacement: path.resolve(DFD, 'mock/regulatory-config') },
      // data-community-app 自有 mock(search-shim.ts 等引用)
      { find: '@/mock', replacement: path.resolve(__dirname, 'src/mock') },
      { find: '@/api', replacement: path.resolve(__dirname, 'src/api') },
      { find: '@/types', replacement: path.resolve(DFD, 'types') },
      { find: '@/utils', replacement: path.resolve(DFD, 'utils') },
      { find: '@/store', replacement: path.resolve(DFD, 'store') },
      { find: '@/stores', replacement: path.resolve(DFD, 'stores') },
      { find: '@/constants', replacement: path.resolve(DFD, 'constants') },
      { find: '@/composables', replacement: path.resolve(DFD, 'composables') },
      { find: '@/config', replacement: path.resolve(DFD, 'config') },
      { find: '@/styles', replacement: path.resolve(DFD, 'styles') },
      { find: '@/pages', replacement: path.resolve(DFD, 'pages') },
      { find: '@/router', replacement: path.resolve(DFD, 'router') },
      { find: '@/modules', replacement: path.resolve(DFD, 'modules') },

      // 最后才是 @ 本身(最不具体)
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ]
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      '@arco-design/web-vue',
      'echarts',
      'dayjs',
      'axios',
      '@vueuse/core',
      'marked',
      '@antv/x6',
      '@antv/x6-vue-shape',
      'file-saver',
      'mockjs',
      'nanoid',
      'uuid',
    ],
    // holdUntilCrawlEnd: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          arco: ['@arco-design/web-vue'],
          echarts: ['echarts'],
          antv: ['@antv/x6', '@antv/x6-vue-shape'],
        }
      }
    },
    chunkSizeWarningLimit: 1500
  },
  base: '/data-community/'
})
