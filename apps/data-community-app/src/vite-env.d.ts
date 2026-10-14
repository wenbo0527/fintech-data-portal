/// <reference types="vite/client" />

/**
 * 自定义环境变量声明(与 vite/client 的 ImportMetaEnv 自动合并)
 *
 * 注:import.meta.env.BASE_URL 由 vite build.base('/data-community/')自动注入,
 *     是路由运行 base 的唯一来源(见 src/router/index.ts)。
 */
interface ImportMetaEnv {
  /** 跨 App 跳转到 mkt 子应用的完整 URL,默认 http://localhost:5177/mkt/(见 src/config-dca/apps.ts) */
  readonly VITE_MKT_APP_URL?: string
}
