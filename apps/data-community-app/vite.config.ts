import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
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
      // 2026-11-06：dca 已不再读取其他 app 的源码（跨 app 闭包为 0），
      // 只保留自身目录、workspace 根（覆盖 hoisted node_modules）与 shared-utils 源码
      allow: [
        path.resolve(__dirname),
        path.resolve(ROOT),
        path.resolve(SHARED_UTILS_SRC),
      ]
    }
  },
  resolve: {
    // 用数组,长前缀优先
    alias: [
      // 最长前缀(最具体)放最前
      { find: '@/components-dca', replacement: path.resolve(__dirname, 'src/components-dca') },
      // 精确到文件：搬入的 MonacoEditor 副本生效，同时避免改动 unified-query/SqlEditor.vue（并行工作流文件）
      { find: '@/components/MonacoEditor.vue', replacement: path.resolve(__dirname, 'src/components-dca/common/MonacoEditor.vue') },
      { find: '@/api-dca', replacement: path.resolve(__dirname, 'src/api') },
      { find: '@/types-dca', replacement: path.resolve(__dirname, 'src/types-dca') },
      { find: '@/stores-dca', replacement: path.resolve(__dirname, 'src/stores-dca') },
      { find: '@/utils-dca', replacement: path.resolve(__dirname, 'src/utils-dca') },
      { find: '@/mock-dca', replacement: path.resolve(__dirname, 'src/mock') },
      { find: '@mock-dca', replacement: path.resolve(__dirname, 'src/mock') },
      { find: '@/mock-shared', replacement: path.resolve(__dirname, 'src/mock/shared') },
      { find: '@mock-shared', replacement: path.resolve(__dirname, 'src/mock/shared') },
      { find: '@/composables', replacement: path.resolve(__dirname, 'src/composables') },
      // 迁移完成（2026-11-06）：dca→dfd 闭包归零，@/dfd-pages、@/dfd-api、@/dfd-mock、
      // @/dfd-components 四个迁移期脚手架别名已全部无用并删除；下方指向 DFD 的通用别名
      // （@/pages、@/components、@/api/*、@/mock/* 等）经 build 验证后可另行清理
      // 跨子应用复用:dca 公共组件(data-community-app 解析 dfd-app 的 vue 时也需要这个 alias)
      { find: '@dca-components', replacement: path.resolve(__dirname, 'src/components-dca') },

      // dfd 子目录(中等长度)
      // dfd-app 的 api 模块(data-community-app 中同名 src/api 仅含 search-shim.ts,
      // 此处统一把所有 @/api/<模块> 指向 dfd-app/src/api，
      // 与第 73 行的宽泛 @/api 别名配合使用，dca 自有 src/api 内容不覆盖 dfd 已存在的)
      // [重构方案 P0] search-shim 不再指向 dfd 空 stub，改命中 dca 真实实现（读 table-catalog-store）
      { find: '@/api/search-shim', replacement: path.resolve(__dirname, 'src/api/search-shim.ts') },

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
      // data-community-app 自有 mock(search-shim.ts 等引用)
      { find: '@/mock', replacement: path.resolve(__dirname, 'src/mock') },
      { find: '@/api', replacement: path.resolve(__dirname, 'src/api') },
      // 更正（2026-11-05）：曾按「dca 自身 src 零引用」删过 @/constants|router|modules|styles 四条，
      // 构建随即失败——这些 specifier 是被 dca 编译的 **dfd 源文件**在用（如 dfd:components/common/StatusTag.vue
      // 用 @/constants、dfd:pages/data-map/TableDetailPage.vue 用 @/router、dfd:store/modules/contract.ts 用
      // @/modules、dfd:pages/lineage/components/LineageGraph.vue 用 CSS @import '@/styles/…'）。
      // 结论：alias 表必须与文件同步迁移，不能先行删除；只有 :117 那条与 @/composables 重复的声明确实永不生效。

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
